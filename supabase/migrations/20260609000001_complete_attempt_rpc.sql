-- Atomically finalises a quiz attempt and awards points to the student profile.
-- Runs as SECURITY DEFINER so it can UPDATE profiles even though students
-- only have RLS permission to update their own row — the function verifies
-- ownership via p_user_id before touching any data.
CREATE OR REPLACE FUNCTION complete_quiz_attempt(
  p_attempt_id uuid,
  p_user_id    uuid,
  p_score      int,
  p_total      int,
  p_points     int
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE quiz_attempts
  SET
    score        = p_score,
    total_questions = p_total,
    points_earned   = p_points,
    is_completed    = true,
    completed_at    = now()
  WHERE id = p_attempt_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'attempt_not_found';
  END IF;

  UPDATE profiles
  SET
    points     = points + p_points,
    updated_at = now()
  WHERE id = p_user_id;
END;
$$;
