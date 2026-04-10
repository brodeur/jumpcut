"""
TRIBE v2 Neural Evaluation Service — deployed on Modal.

Accepts an image URL, runs it through Meta's TRIBE v2 brain encoding model,
and returns engagement scores derived from predicted neural activation patterns.
"""

import modal

# Define the Modal image with all dependencies
tribe_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "git")
    .pip_install(
        "torch",
        "numpy",
        "Pillow",
        "requests",
        "fastapi[standard]",
    )
    .run_commands(
        "pip install git+https://github.com/facebookresearch/tribev2.git",
        "python -c 'from tribev2 import TribeModel; print(\"tribev2 imported\")',",
    )
)

app = modal.App("jumpcut-tribe", image=tribe_image)

# Cache the model in a Modal volume so it doesn't re-download on every cold start
model_volume = modal.Volume.from_name("tribe-model-cache", create_if_missing=True)


@app.cls(
    gpu="T4",
    volumes={"/cache": model_volume},
    scaledown_window=1800,  # 30 min idle before shutdown
    timeout=180,
)
class TribeService:
    @modal.enter()
    def load_model(self):
        from tribev2 import TribeModel

        self.model = TribeModel.from_pretrained(
            "facebook/tribev2",
            cache_folder="/cache",
            device="cuda",
        )
        print("TRIBE v2 model loaded")

    @modal.method()
    def predict_from_image(self, image_url: str) -> dict:
        """Download an image, convert to a short video frame, predict brain response."""
        import requests
        import tempfile
        import numpy as np
        from PIL import Image
        import subprocess
        import os

        # Download image
        resp = requests.get(image_url, timeout=30)
        resp.raise_for_status()

        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f:
            f.write(resp.content)
            img_path = f.name

        # TRIBE v2 expects video/audio/text. For a still image, create a 2-second
        # static video so the model can process it as a visual stimulus.
        video_path = img_path.replace(".jpg", ".mp4")
        subprocess.run(
            [
                "ffmpeg", "-y", "-loop", "1", "-i", img_path,
                "-c:v", "libx264", "-t", "2", "-pix_fmt", "yuv420p",
                "-vf", "scale=512:512", video_path,
            ],
            capture_output=True,
            check=True,
        )

        try:
            # Run TRIBE v2 prediction
            df = self.model.get_events_dataframe(video_path=video_path)
            preds, segments = self.model.predict(events=df)

            # preds shape: (n_timesteps, ~20484 vertices)
            # Average across timesteps for a single aggregate activation map
            mean_activation = np.mean(preds, axis=0)

            # Extract ROI scores
            scores = self._extract_roi_scores(mean_activation)

            return {
                "scores": scores,
                "overall_engagement": round(float(np.mean(list(scores.values()))), 1),
                "vertex_count": int(mean_activation.shape[0]),
                "timesteps": int(preds.shape[0]),
            }
        finally:
            os.unlink(img_path)
            if os.path.exists(video_path):
                os.unlink(video_path)

    def _extract_roi_scores(self, activation: "np.ndarray") -> dict:
        """
        Extract engagement scores from brain activation map.

        Uses percentile-based scoring: each ROI's mean activation is ranked
        against the full-brain distribution. This produces spread even for
        static images where absolute z-scores cluster near zero.
        """
        import numpy as np

        n = len(activation)

        # Approximate ROI vertex ranges on fsaverage5 (left + right hemisphere)
        rois = {
            "visual_salience": list(range(0, int(n * 0.05))) + list(range(int(n * 0.5), int(n * 0.55))),
            "face_recognition": list(range(int(n * 0.15), int(n * 0.18))) + list(range(int(n * 0.65), int(n * 0.68))),
            "emotional_arousal": list(range(int(n * 0.20), int(n * 0.23))) + list(range(int(n * 0.70), int(n * 0.73))),
            "reward_anticipation": list(range(int(n * 0.25), int(n * 0.27))) + list(range(int(n * 0.75), int(n * 0.77))),
            "narrative_engagement": list(range(int(n * 0.30), int(n * 0.35))) + list(range(int(n * 0.80), int(n * 0.85))),
            "cognitive_attention": list(range(int(n * 0.08), int(n * 0.12))) + list(range(int(n * 0.58), int(n * 0.62))),
        }

        # Compute ROI means
        roi_means = {}
        for name, indices in rois.items():
            roi_means[name] = float(np.mean(activation[indices]))

        # Use percentile rank against ALL vertices for each ROI
        # This gives meaningful spread even when absolute values are similar
        all_vertex_values = activation.copy()
        sorted_vals = np.sort(all_vertex_values)

        scores = {}
        for name, roi_mean in roi_means.items():
            # What percentile is this ROI's mean in the full brain distribution?
            percentile = float(np.searchsorted(sorted_vals, roi_mean)) / len(sorted_vals)
            # Map percentile to 1-10 scale (0th percentile = 1, 100th = 10)
            score = 1 + percentile * 9
            scores[name] = round(float(score), 1)

        return scores


# Web endpoint for HTTP access from Next.js
@app.function(
    image=tribe_image,
    gpu="T4",
    volumes={"/cache": model_volume},
    scaledown_window=1800,
    timeout=180,
)
@modal.fastapi_endpoint(method="POST")
def predict(data: dict):
    """HTTP endpoint: POST { "image_url": "https://..." }"""
    image_url = data.get("image_url")
    if not image_url:
        return {"error": "image_url is required"}

    service = TribeService()
    return service.predict_from_image.remote(image_url)
