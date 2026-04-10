-- Expand audience_reactions segment to support 10-agent swarm + score_card + neural + legacy
ALTER TABLE audience_reactions DROP CONSTRAINT IF EXISTS audience_reactions_segment_check;
ALTER TABLE audience_reactions ADD CONSTRAINT audience_reactions_segment_check
  CHECK (segment IN (
    -- Legacy (kept for backward compat)
    'converter', 'evangelist', 'skeptic', 'genre_native',
    -- Bible Match agents
    'narrative_function', 'thematic_alignment', 'psychological_continuity',
    'backstory_integrity', 'transformation_signal',
    -- Audience agents
    'prestige_viewer', 'general_audience', 'memorability',
    'emotional_response', 'archetype_alignment',
    -- Aggregates
    'score_card', 'neural'
  ));
