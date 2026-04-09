-- Add 'neural' as a valid audience segment for TRIBE v2 brain predictions
ALTER TABLE audience_reactions DROP CONSTRAINT IF EXISTS audience_reactions_segment_check;
ALTER TABLE audience_reactions ADD CONSTRAINT audience_reactions_segment_check
  CHECK (segment IN ('converter', 'evangelist', 'skeptic', 'genre_native', 'neural'));
