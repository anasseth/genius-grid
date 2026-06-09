export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import QuizClient from './QuizClient'

export default async function QuizPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { attempt?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const attemptId = searchParams.attempt
  if (!attemptId) redirect('/quizzes')

  const [{ data: quiz }, { data: attempt }] = await Promise.all([
    supabase
      .from('quizzes')
      .select('*, category:categories(*)')
      .eq('id', params.id)
      .eq('is_published', true)
      .single(),
    supabase
      .from('quiz_attempts')
      .select('*')
      .eq('id', attemptId)
      .eq('user_id', user.id)
      .single(),
  ])

  if (!quiz || !attempt) redirect('/quizzes')
  if (attempt.is_completed) redirect(`/results/${attemptId}`)

  let orderedQuestions: any[] = []

  // Anti-cheat: select only the fields the client needs; is_correct is intentionally excluded.
  // The evaluate API route fetches correct answers server-side after submission.
  const SAFE_OPTIONS_SELECT = 'id, text, option_label'

  if (attempt.question_ids && attempt.question_ids.length > 0) {
    // Load exactly the shuffled subset stored in the attempt
    const { data: questions } = await supabase
      .from('questions')
      .select(`*, options(${SAFE_OPTIONS_SELECT})`)
      .in('id', attempt.question_ids)

    // Restore the original shuffled order
    const questionMap = new Map((questions ?? []).map((q) => [q.id, q]))
    orderedQuestions = attempt.question_ids
      .map((id: string) => questionMap.get(id))
      .filter(Boolean)
  } else {
    // Fallback for old attempts without stored question_ids
    const { data: questions } = await supabase
      .from('questions')
      .select(`*, options(${SAFE_OPTIONS_SELECT})`)
      .eq('quiz_id', params.id)
      .order('order_index')

    orderedQuestions = questions ?? []
  }

  return (
    <QuizClient
      quiz={quiz}
      questions={orderedQuestions}
      attemptId={attemptId}
      userId={user.id}
    />
  )
}
