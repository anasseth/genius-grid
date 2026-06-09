'use client'

import { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react'

export type PlaybackState = 'IDLE' | 'ACTIVE' | 'SYNCING' | 'COMPLETED'

interface CachedState {
  answers: Record<string, string | null>
  currentQIndex: number
  timestamp: number
}

interface EvaluateResult {
  score: number
  total: number
  pointsEarned: number
}

interface QuizPlaybackContextValue {
  playbackState: PlaybackState
  currentQIndex: number
  answers: Record<string, string | null>
  evaluateResult: EvaluateResult | null
  error: string | null
  selectAnswer: (questionId: string, optionId: string) => void
  advanceQuestion: () => void
  finalize: (attemptId: string, totalQuestions: number) => Promise<EvaluateResult | null>
}

const QuizPlaybackContext = createContext<QuizPlaybackContextValue | null>(null)

const CACHE_TTL_MS = 24 * 60 * 60 * 1000

function getCacheKey(attemptId: string) {
  return `gg-quiz-${attemptId}`
}

function loadCachedState(attemptId: string): CachedState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(getCacheKey(attemptId))
    if (!raw) return null
    const parsed: CachedState = JSON.parse(raw)
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(getCacheKey(attemptId))
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function persistState(attemptId: string, state: Omit<CachedState, 'timestamp'>) {
  if (typeof window === 'undefined') return
  try {
    const payload: CachedState = { ...state, timestamp: Date.now() }
    localStorage.setItem(getCacheKey(attemptId), JSON.stringify(payload))
  } catch {
    // localStorage full — silently skip
  }
}

function clearCachedState(attemptId: string) {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(getCacheKey(attemptId))
  } catch {
    // ignore
  }
}

interface QuizPlaybackProviderProps {
  children: React.ReactNode
  attemptId: string
  totalQuestions: number
}

export function QuizPlaybackProvider({ children, attemptId, totalQuestions }: QuizPlaybackProviderProps) {
  const cached = useRef<CachedState | null>(null)

  const [playbackState, setPlaybackState] = useState<PlaybackState>('IDLE')
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | null>>({})
  const [evaluateResult, setEvaluateResult] = useState<EvaluateResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Restore from localStorage on mount
  useEffect(() => {
    cached.current = loadCachedState(attemptId)
    if (cached.current) {
      setCurrentQIndex(cached.current.currentQIndex)
      setAnswers(cached.current.answers)
    }
    setPlaybackState('ACTIVE')
  }, [attemptId])

  const selectAnswer = useCallback((questionId: string, optionId: string) => {
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: optionId }
      persistState(attemptId, { answers: next, currentQIndex })
      return next
    })
  }, [attemptId, currentQIndex])

  const advanceQuestion = useCallback(() => {
    setCurrentQIndex((prev) => {
      const next = Math.min(prev + 1, totalQuestions - 1)
      persistState(attemptId, { answers, currentQIndex: next })
      return next
    })
  }, [attemptId, answers, totalQuestions])

  const finalize = useCallback(async (aid: string, total: number): Promise<EvaluateResult | null> => {
    setPlaybackState('SYNCING')
    setError(null)
    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId: aid }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      const result: EvaluateResult = await res.json()
      clearCachedState(aid)
      setEvaluateResult(result)
      setPlaybackState('COMPLETED')
      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Evaluation failed. Please try again.'
      setError(msg)
      setPlaybackState('ACTIVE')
      return null
    }
  }, [])

  return (
    <QuizPlaybackContext.Provider
      value={{ playbackState, currentQIndex, answers, evaluateResult, error, selectAnswer, advanceQuestion, finalize }}
    >
      {children}
    </QuizPlaybackContext.Provider>
  )
}

export function useQuizPlayback(): QuizPlaybackContextValue {
  const ctx = useContext(QuizPlaybackContext)
  if (!ctx) throw new Error('useQuizPlayback must be used inside QuizPlaybackProvider')
  return ctx
}
