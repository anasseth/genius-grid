export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import ResultsClient    from './ResultsClient'

export default async function ResultsPage({
  params,
}: {
  params: { attemptId: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: attempt }, { data: profile }, { data: rawAnswers }] = await Promise.all([
    supabase
      .from('quiz_attempts')
      .select('*, quiz:quizzes(title, category:categories(name))')
      .eq('id', params.attemptId)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single(),
    supabase
      .from('user_answers')
      .select(`
        question_id,
        selected_option_id,
        is_correct,
        question:questions(
          id,
          text,
          options(id, text, option_label, is_correct)
        )
      `)
      .eq('attempt_id', params.attemptId),
  ])

  if (!attempt) redirect('/home')

  // Supabase types the FK join as T | T[] depending on schema introspection.
  // Normalise to always be a single object so the client type is predictable.
  type NormalisedOption = { id: string; text: string; option_label: string; is_correct: boolean }
  type NormalisedQuestion = { id: string; text: string; options: NormalisedOption[] }

  const questionOrder: string[] = attempt.question_ids ?? []
  const answerReview = questionOrder
    .map((qId) => rawAnswers?.find((a) => a.question_id === qId))
    .filter((a): a is NonNullable<typeof a> => a != null)
    .map((a) => {
      const raw = a.question
      const q: NormalisedQuestion | null = raw == null
        ? null
        : Array.isArray(raw)
          ? (raw[0] as NormalisedQuestion) ?? null
          : (raw as unknown as NormalisedQuestion)
      return {
        question_id:        a.question_id        as string,
        selected_option_id: a.selected_option_id as string | null,
        is_correct:         a.is_correct         as boolean,
        question:           q,
      }
    })

  return (
    <ResultsClient
      attempt={attempt}
      profile={profile}
      answerReview={answerReview}
    />
  )
}
