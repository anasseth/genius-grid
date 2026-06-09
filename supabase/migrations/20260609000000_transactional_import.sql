-- Atomic quiz import: inserts quiz + all questions + all options in a single transaction.
-- Any failure rolls back the entire batch, preventing orphaned records.
CREATE OR REPLACE FUNCTION import_quiz_transactional(p_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quiz_id    uuid;
  v_question_id uuid;
  q            jsonb;
  o            jsonb;
  idx          int := 0;
BEGIN
  INSERT INTO quizzes (
    title, description, category_id, difficulty,
    time_per_question, questions_per_attempt, max_retakes, is_published
  ) VALUES (
    p_data->>'title',
    NULLIF(p_data->>'description', ''),
    (p_data->>'category_id')::uuid,
    p_data->>'difficulty',
    (p_data->>'time_per_question')::int,
    (p_data->>'questions_per_attempt')::int,
    (p_data->>'max_retakes')::int,
    (p_data->>'is_published')::boolean
  )
  RETURNING id INTO v_quiz_id;

  FOR q IN SELECT value FROM jsonb_array_elements(p_data->'questions') LOOP
    INSERT INTO questions (quiz_id, text, contributed_by, order_index)
    VALUES (
      v_quiz_id,
      q->>'text',
      NULLIF(q->>'contributed_by', ''),
      idx
    )
    RETURNING id INTO v_question_id;

    FOR o IN SELECT value FROM jsonb_array_elements(q->'options') LOOP
      INSERT INTO options (question_id, text, is_correct, option_label)
      VALUES (
        v_question_id,
        o->>'text',
        (o->>'is_correct')::boolean,
        o->>'label'
      );
    END LOOP;

    idx := idx + 1;
  END LOOP;

  RETURN v_quiz_id;
END;
$$;
