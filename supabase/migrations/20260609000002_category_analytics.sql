-- Returns per-category answer success rates for the admin analytics dashboard.
-- Requires at least 10 answers in a category before including it, to avoid
-- misleading percentages from tiny sample sizes.
CREATE OR REPLACE FUNCTION get_category_success_rates()
RETURNS TABLE(
  category_id     uuid,
  category_name   text,
  category_color  text,
  category_icon   text,
  total_answers   bigint,
  correct_answers bigint,
  success_rate    numeric
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    c.id,
    c.name,
    c.color,
    c.icon,
    COUNT(ua.id)                                         AS total_answers,
    COUNT(ua.id) FILTER (WHERE ua.is_correct = true)    AS correct_answers,
    ROUND(
      COUNT(ua.id) FILTER (WHERE ua.is_correct = true)::numeric
      / NULLIF(COUNT(ua.id), 0) * 100
    , 1)                                                 AS success_rate
  FROM categories c
  JOIN quizzes    qz ON qz.category_id = c.id
  JOIN questions  q  ON q.quiz_id      = qz.id
  JOIN user_answers ua ON ua.question_id = q.id
  GROUP BY c.id, c.name, c.color, c.icon
  HAVING COUNT(ua.id) >= 10
  ORDER BY success_rate ASC NULLS LAST;
$$;
