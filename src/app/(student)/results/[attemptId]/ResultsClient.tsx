'use client'

import { useState } from 'react'
import { useRouter }  from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Gem, CheckCircle2, XCircle, ChevronDown, BookOpen, Clock } from 'lucide-react'
import Image from 'next/image'
import type { QuizAttempt, Profile } from '@/lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReviewOption {
  id:           string
  text:         string
  option_label: string
  is_correct:   boolean
}

interface AnswerReviewItem {
  question_id:        string
  selected_option_id: string | null
  is_correct:         boolean
  question: {
    id:      string
    text:    string
    options: ReviewOption[]
  } | null
}

interface Props {
  attempt:      QuizAttempt
  profile:      Profile | null
  answerReview: AnswerReviewItem[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

// ─── Answer Review Card ───────────────────────────────────────────────────────

function QuestionReviewCard({
  item,
  index,
}: {
  item:  AnswerReviewItem
  index: number
}) {
  const question   = item.question
  const wasSkipped = item.selected_option_id === null
  const isCorrect  = item.is_correct

  if (!question) return null

  const sortedOptions = [...(question.options ?? [])].sort((a, b) =>
    a.option_label.localeCompare(b.option_label),
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm"
    >
      {/* Question header strip */}
      <div
        className={`flex items-center justify-between px-4 py-3 ${
          wasSkipped
            ? 'bg-gray-50 border-b border-gray-100'
            : isCorrect
            ? 'bg-emerald-50 border-b border-emerald-100'
            : 'bg-red-50 border-b border-red-100'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
            Q{index + 1}
          </span>
          {wasSkipped ? (
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-semibold text-slate-500">Time ran out</span>
            </div>
          ) : isCorrect ? (
            <div className="flex items-center gap-1 text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">Correct</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-red-500">
              <XCircle className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">Incorrect</span>
            </div>
          )}
        </div>
      </div>

      {/* Question text */}
      <div className="px-4 pt-4 pb-3">
        <p className="text-sm font-semibold text-slate-800 leading-relaxed">
          {question.text}
        </p>
      </div>

      {/* Options */}
      <div className="px-4 pb-4 space-y-2">
        {sortedOptions.map((opt) => {
          const isSelected  = opt.id === item.selected_option_id
          const isThisRight = opt.is_correct

          // Determine visual state
          let stateClass = ''
          let labelClass = ''
          let indicatorIcon: React.ReactNode = null

          if (isSelected && isThisRight) {
            // Student selected this and it's correct
            stateClass = 'bg-emerald-50 border-emerald-300'
            labelClass = 'bg-emerald-500 text-white'
            indicatorIcon = <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          } else if (isSelected && !isThisRight) {
            // Student selected this but it's wrong
            stateClass = 'bg-red-50 border-red-300'
            labelClass = 'bg-red-400 text-white'
            indicatorIcon = <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          } else if (!isSelected && isThisRight) {
            // This is the correct answer the student missed (skipped or wrong pick)
            stateClass = 'bg-emerald-50/60 border-emerald-200 border-dashed'
            labelClass = 'bg-emerald-100 text-emerald-700'
            indicatorIcon = <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          } else {
            // Neutral — not selected, not correct
            stateClass = 'bg-gray-50 border-transparent'
            labelClass = 'bg-white text-slate-400 shadow-sm'
            indicatorIcon = null
          }

          return (
            <div
              key={opt.id}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-colors ${stateClass}`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${labelClass}`}
              >
                {opt.option_label.toUpperCase()}
              </div>
              <span
                className={`text-sm flex-1 leading-snug ${
                  isSelected || isThisRight ? 'font-semibold text-slate-800' : 'text-slate-500'
                }`}
              >
                {opt.text}
              </span>
              {indicatorIcon}
            </div>
          )
        })}

        {/* Skipped — no option selected */}
        {wasSkipped && (
          <p className="text-xs text-slate-400 italic pt-1 pl-1">
            No answer selected — the correct option is highlighted above.
          </p>
        )}
      </div>
    </motion.div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ResultsClient({ attempt, profile, answerReview }: Props) {
  const router = useRouter()
  const [showReview, setShowReview] = useState(false)

  const score        = attempt.score          ?? 0
  const total        = attempt.total_questions ?? 0
  const pointsEarned = attempt.points_earned   ?? 0
  const percentage   = total > 0 ? Math.round((score / total) * 100) : 0

  const displayName = profile?.full_name?.split(' ')[0] ?? 'there'
  const avatarSeed  = profile?.avatar_seed ?? profile?.email ?? 'default'

  const getMessage = () => {
    if (percentage >= 90) return 'Outstanding performance!'
    if (percentage >= 70) return "Great job! You've done well"
    if (percentage >= 50) return 'Good effort! Keep practicing'
    return 'Keep trying, you can do better!'
  }

  const getTitle = () => {
    if (percentage >= 90) return 'Excellent!'
    if (percentage >= 70) return 'Congratulations!'
    if (percentage >= 50) return 'Well Done!'
    return 'Good Try!'
  }

  const correctCount  = answerReview.filter((a) => a.is_correct).length
  const wrongCount    = answerReview.filter((a) => !a.is_correct && a.selected_option_id !== null).length
  const skippedCount  = answerReview.filter((a) => a.selected_option_id === null).length
  const hasReview     = answerReview.length > 0

  return (
    <div className="min-h-full bg-white flex flex-col relative overflow-x-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <StarIcon className="absolute top-24 left-12 w-6 h-6 text-pink-300" />
        <StarIcon className="absolute top-16 right-20 w-4 h-4 text-pink-200" />
        <StarIcon className="absolute top-40 right-10 w-8 h-8 text-pink-300" />
        <StarIcon className="absolute top-64 left-8 w-5 h-5 text-pink-200" />
        <StarIcon className="absolute top-72 right-16 w-6 h-6 text-pink-300" />

        <div className="absolute top-32 left-8 text-pink-400 rotate-45 text-2xl">🎉</div>
        <div className="absolute top-28 right-12 text-pink-400 -rotate-12 text-2xl">🎊</div>
        <div className="absolute top-60 left-16 text-pink-400 -rotate-45 text-2xl">🎊</div>
        <div className="absolute top-64 right-8 text-pink-400 rotate-12 text-2xl">🎉</div>
      </div>

      {/* ── Score section ──────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center px-6 pt-10 pb-8 z-10">
        {/* Score Ring Avatar */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', bounce: 0.5, duration: 0.8 }}
          className="relative w-48 h-48 mb-10 flex items-center justify-center"
        >
          <div className="absolute inset-0 border-[3px] border-dashed border-pink-300 rounded-full animate-[spin_20s_linear_infinite]" />
          <div className="absolute inset-2 bg-pink-100 rounded-full" />
          <div className="absolute inset-4 bg-pink-200/50 rounded-full" />
          <div className="absolute inset-6 bg-white rounded-full overflow-hidden border-4 border-white shadow-md">
            <Image
              src={`https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(avatarSeed)}&backgroundColor=fce7f3`}
              alt="Avatar"
              width={144}
              height={144}
              className="w-full h-full object-cover"
              unoptimized
            />
          </div>
        </motion.div>

        {/* Score Text */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-center mb-8 w-full"
        >
          <p className="text-sm font-bold text-slate-500 mb-1">Your Score</p>
          <h2 className="text-4xl font-extrabold text-primary mb-6">
            {score}
            <span className="text-2xl text-slate-400">/{total}</span>
          </h2>
          <h1 className="text-3xl font-bold text-primary mb-3">{getTitle()}</h1>
          <p className="text-slate-500 font-medium">
            {getMessage()}, {displayName}!
          </p>
        </motion.div>

        {/* Points Earned */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex items-center space-x-2 bg-gray-50 px-5 py-2.5 rounded-full border border-gray-100 shadow-sm mb-4"
        >
          <Gem className="w-5 h-5 text-pink-400 fill-pink-100" />
          <span className="font-bold text-primary">+{pointsEarned} Points Earned</span>
        </motion.div>

        {/* Percentage badge */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mb-8"
        >
          <div
            className={`inline-flex items-center px-4 py-2 rounded-full font-bold text-sm ${
              percentage >= 70
                ? 'bg-green-100 text-green-600'
                : percentage >= 50
                ? 'bg-orange-100 text-orange-600'
                : 'bg-red-100 text-red-600'
            }`}
          >
            {percentage}% Correct
          </div>
        </motion.div>

        {/* Footer Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="w-full space-y-3"
        >
          <button
            onClick={() => router.push('/quizzes')}
            className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-lg shadow-soft hover:bg-primaryHover active:scale-[0.98] transition-all"
          >
            Try Another Quiz
          </button>
          <button
            onClick={() => router.push('/home')}
            className="w-full bg-gray-100 text-slate-700 py-4 rounded-2xl font-bold text-lg hover:bg-gray-200 active:scale-[0.98] transition-all"
          >
            Back to Home
          </button>
        </motion.div>
      </div>

      {/* ── Answer Review Toggle ───────────────────────────────────────────── */}
      {hasReview && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          className="px-6 pb-4 z-10"
        >
          <button
            onClick={() => setShowReview((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 bg-violet-50 border border-violet-100 rounded-2xl text-primary font-bold transition-colors hover:bg-violet-100 active:scale-[0.98]"
          >
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-5 h-5" />
              <span>Review Answers</span>
              {/* Quick stats pills */}
              <div className="flex items-center gap-1.5 ml-1">
                <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                  {correctCount} ✓
                </span>
                {wrongCount > 0 && (
                  <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                    {wrongCount} ✗
                  </span>
                )}
                {skippedCount > 0 && (
                  <span className="text-xs font-bold bg-gray-100 text-slate-500 px-2 py-0.5 rounded-full">
                    {skippedCount} skipped
                  </span>
                )}
              </div>
            </div>
            <motion.div
              animate={{ rotate: showReview ? 180 : 0 }}
              transition={{ duration: 0.25 }}
            >
              <ChevronDown className="w-5 h-5" />
            </motion.div>
          </button>

          {/* ── Expanded review ─────────────────────────────────────────── */}
          <AnimatePresence>
            {showReview && (
              <motion.div
                key="review-panel"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="pt-4 space-y-3">
                  {answerReview.map((item, idx) => (
                    <QuestionReviewCard key={item.question_id} item={item} index={idx} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Bottom padding */}
      <div className="h-8" />
    </div>
  )
}
