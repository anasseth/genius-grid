'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, User, AlertCircle } from 'lucide-react'
import type { Quiz } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { QuizPlaybackProvider, useQuizPlayback } from '@/context/QuizPlaybackContext'

// Safe client-side option type: intentionally excludes is_correct to prevent
// answer exposure. Correct answers are evaluated server-side via /api/evaluate.
interface SafeOption {
  id: string
  text: string
  option_label: string
}

interface SafeQuestion {
  id: string
  text: string
  order_index: number
  contributed_by: string | null
  options?: SafeOption[]
}

interface Props {
  quiz: Quiz
  questions: SafeQuestion[]
  attemptId: string
  userId: string
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function QuizInner({ quiz, questions, attemptId }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const {
    playbackState,
    currentQIndex,
    answers,
    error: evalError,
    selectAnswer,
    advanceQuestion,
    finalize,
  } = useQuizPlayback()

  const totalQuestions = questions.length
  const currentQuestion = questions[currentQIndex]
  const selectedOptionId = answers[currentQuestion?.id ?? ''] ?? null

  const [timeLeft, setTimeLeft] = useState(quiz.time_per_question)

  // Reset timer each time the question changes
  useEffect(() => {
    setTimeLeft(quiz.time_per_question)
  }, [currentQIndex, quiz.time_per_question])

  const handleNext = useCallback(async () => {
    if (playbackState === 'SYNCING') return

    // Persist this answer to user_answers. is_correct is intentionally omitted;
    // the evaluate route sets it correctly server-side after submission.
    if (currentQuestion) {
      await supabase.from('user_answers').insert({
        attempt_id: attemptId,
        question_id: currentQuestion.id,
        selected_option_id: selectedOptionId ?? null,
      })
    }

    if (currentQIndex === totalQuestions - 1) {
      const result = await finalize(attemptId, totalQuestions)
      if (result) {
        router.push(`/results/${attemptId}`)
      }
    } else {
      advanceQuestion()
    }
  }, [
    playbackState, currentQuestion, currentQIndex, totalQuestions,
    attemptId, selectedOptionId, supabase, finalize, advanceQuestion, router,
  ])

  // Countdown — auto-advances when it hits 0
  useEffect(() => {
    if (timeLeft <= 0) {
      handleNext()
      return
    }
    const id = setInterval(() => setTimeLeft((t) => (t > 0 ? t - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [timeLeft, handleNext])

  const progressPercent = ((currentQIndex + 1) / totalQuestions) * 100
  const timerPercent = (timeLeft / quiz.time_per_question) * 100
  const redThreshold = Math.ceil(quiz.time_per_question * 0.125)
  const orangeThreshold = Math.ceil(quiz.time_per_question * 0.25)
  const timerColor =
    timeLeft <= redThreshold
      ? 'text-red-500'
      : timeLeft <= orangeThreshold
      ? 'text-orange-400'
      : 'text-primary'

  const isSubmitting = playbackState === 'SYNCING'

  return (
    <div className="min-h-full bg-white dark:bg-slate-900 flex flex-col relative">
      {/* Decorative */}
      <div className="absolute top-40 left-4 text-pink-100/50 dark:text-slate-800 -rotate-12 pointer-events-none">
        <span className="text-6xl font-bold">?</span>
      </div>
      <div className="absolute top-20 right-10 text-pink-100/50 dark:text-slate-800 rotate-12 pointer-events-none">
        <span className="text-4xl font-bold">?</span>
      </div>

      {/* Header */}
      <div className="px-6 pt-8 pb-4 flex items-center">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-full hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-slate-800 dark:text-slate-100" />
        </button>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 ml-2 truncate">
          {quiz.category?.name ?? quiz.title}
        </h1>
      </div>

      <div className="px-6 flex-1 flex flex-col">
        {/* Progress & Timer */}
        <div className="flex items-center justify-between mb-8 mt-2">
          <div className="flex-1 mr-8">
            <div className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2">Question</div>
            <div className="flex items-baseline space-x-1 mb-3">
              <span className="text-3xl font-extrabold text-pink-500">{currentQIndex + 1}</span>
              <span className="text-xl font-bold text-slate-800 dark:text-slate-200">/{totalQuestions}</span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: `${(currentQIndex / totalQuestions) * 100}%` }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Circular Timer */}
          <div className="relative w-16 h-16 flex items-center justify-center flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-gray-100 dark:text-slate-700"
                strokeWidth="3"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={`${timerColor} transition-all duration-1000 ease-linear`}
                strokeWidth="3"
                strokeDasharray={`${timerPercent}, 100`}
                stroke="currentColor"
                fill="none"
                strokeLinecap="round"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className={`absolute text-xs font-bold tabular-nums ${timerColor}`}>
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`q-${currentQIndex}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-pink-100 dark:bg-violet-950/60 rounded-3xl p-6 mb-4 relative overflow-hidden"
          >
            <div className="absolute top-4 right-4 text-pink-200 dark:text-violet-800 rotate-12 text-3xl font-bold">?</div>
            <div className="absolute bottom-4 left-4 text-pink-200 dark:text-violet-800 -rotate-12 text-2xl font-bold">?</div>
            <div className="absolute -bottom-6 -right-6 w-24 h-24 border-4 border-pink-200 dark:border-violet-800 rounded-full opacity-50" />
            <div className="absolute -top-6 -left-6 w-20 h-20 border-4 border-pink-200 dark:border-violet-800 rounded-lg rotate-45 opacity-50" />
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 leading-relaxed relative z-10">
              {currentQuestion?.text ?? ''}
            </h2>
          </motion.div>
        </AnimatePresence>

        {/* Contributed by */}
        {currentQuestion?.contributed_by ? (
          <div className="flex items-center space-x-1.5 mb-5 px-1">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <p className="text-xs text-slate-400 font-medium">
              Contributed by{' '}
              <span className="font-semibold text-slate-500 dark:text-slate-400">
                {currentQuestion.contributed_by}
              </span>
            </p>
          </div>
        ) : (
          <div className="mb-4" />
        )}

        {/* Evaluation error banner */}
        {evalError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{evalError}</span>
          </div>
        )}

        {/* Options */}
        <div className="space-y-3 mb-8">
          {(currentQuestion?.options ?? [])
            .sort((a, b) => a.option_label.localeCompare(b.option_label))
            .map((opt) => {
              const isSelected = selectedOptionId === opt.id
              return (
                <button
                  key={opt.id}
                  onClick={() => selectAnswer(currentQuestion.id, opt.id)}
                  disabled={isSubmitting}
                  className={`w-full flex items-center p-4 rounded-2xl border-2 transition-all duration-200 text-left ${
                    isSelected
                      ? 'border-primary bg-violet-50 dark:bg-violet-950/40 shadow-sm'
                      : 'border-transparent bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-4 flex-shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-primary text-white'
                        : 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 shadow-sm'
                    }`}
                  >
                    {opt.option_label}
                  </div>
                  <span
                    className={`font-semibold ${
                      isSelected ? 'text-primary' : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {opt.text}
                  </span>
                </button>
              )
            })}
        </div>

        {/* Next / Finish Button */}
        <div className="mt-auto pb-8">
          <button
            onClick={handleNext}
            disabled={!selectedOptionId || isSubmitting}
            className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${
              selectedOptionId && !isSubmitting
                ? 'bg-primary text-white shadow-soft hover:bg-primaryHover active:scale-[0.98]'
                : 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed'
            }`}
          >
            {isSubmitting
              ? 'Saving...'
              : currentQIndex === totalQuestions - 1
              ? 'Finish'
              : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function QuizClient(props: Props) {
  return (
    <QuizPlaybackProvider attemptId={props.attemptId} totalQuestions={props.questions.length}>
      <QuizInner {...props} />
    </QuizPlaybackProvider>
  )
}
