import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function createAnonClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(toSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])) } catch { /* no-op in RSC */ }
        },
      },
    }
  )
}

function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

export async function POST(req: NextRequest) {
  // 1. Parse body
  let attemptId: string
  try {
    const body = await req.json()
    if (!body?.attemptId || typeof body.attemptId !== 'string') {
      return NextResponse.json({ error: 'attemptId is required' }, { status: 400 })
    }
    attemptId = body.attemptId
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // 2. Verify authenticated user
  const anonClient = createAnonClient()
  const { data: { user }, error: authError } = await anonClient.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 3. Use admin client for all subsequent queries (bypasses RLS for scoring)
  const admin = createAdminClient()

  // 4. Fetch the attempt, verify ownership, and guard against double-submission
  const { data: attempt, error: attemptError } = await admin
    .from('quiz_attempts')
    .select('id, user_id, total_questions, is_completed')
    .eq('id', attemptId)
    .single()

  if (attemptError || !attempt) {
    return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
  }
  if (attempt.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (attempt.is_completed) {
    return NextResponse.json({ error: 'Attempt already completed' }, { status: 409 })
  }

  // 5. Fetch all answers submitted for this attempt
  const { data: userAnswers, error: answersError } = await admin
    .from('user_answers')
    .select('id, selected_option_id')
    .eq('attempt_id', attemptId)

  if (answersError) {
    return NextResponse.json({ error: 'Failed to fetch answers' }, { status: 500 })
  }

  const answers = userAnswers ?? []

  // 6. For each answer that has a selected option, look up whether it is correct
  const optionIds = answers
    .map((a) => a.selected_option_id)
    .filter((id): id is string => id !== null)

  let correctOptionSet = new Set<string>()
  if (optionIds.length > 0) {
    const { data: options, error: optionsError } = await admin
      .from('options')
      .select('id, is_correct')
      .in('id', optionIds)

    if (optionsError) {
      return NextResponse.json({ error: 'Failed to verify answers' }, { status: 500 })
    }
    correctOptionSet = new Set(
      (options ?? []).filter((o) => o.is_correct).map((o) => o.id)
    )
  }

  // 7. Bulk-update is_correct on each user_answer row
  const updatePromises = answers.map((a) => {
    const isCorrect = a.selected_option_id !== null && correctOptionSet.has(a.selected_option_id)
    return admin
      .from('user_answers')
      .update({ is_correct: isCorrect })
      .eq('id', a.id)
  })
  await Promise.all(updatePromises)

  // 8. Calculate final score
  const totalCorrect = answers.filter(
    (a) => a.selected_option_id !== null && correctOptionSet.has(a.selected_option_id)
  ).length
  const totalQuestions = attempt.total_questions ?? answers.length
  const pointsEarned = totalCorrect * 10

  // 9. Atomically complete the attempt and award points via RPC
  const { error: rpcError } = await admin.rpc('complete_quiz_attempt', {
    p_attempt_id: attemptId,
    p_user_id:    user.id,
    p_score:      totalCorrect,
    p_total:      totalQuestions,
    p_points:     pointsEarned,
  })

  if (rpcError) {
    return NextResponse.json({ error: 'Failed to save results' }, { status: 500 })
  }

  return NextResponse.json({ score: totalCorrect, total: totalQuestions, pointsEarned })
}
