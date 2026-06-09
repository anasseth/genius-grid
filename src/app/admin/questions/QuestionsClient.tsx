'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { HelpCircle, User, ChevronRight, Search } from 'lucide-react'

interface Question {
  id:             string
  text:           string
  contributed_by: string | null
  order_index:    number
  created_at:     string
  quiz:           { id: string; title: string } | null
}

interface Props {
  questions: Question[]
}

export default function QuestionsClient({ questions }: Props) {
  const [filterContributor, setFilterContributor] = useState('')
  const [search, setSearch]                       = useState('')

  const contributors = useMemo(() => {
    const set = new Set<string>()
    questions.forEach((q) => { if (q.contributed_by) set.add(q.contributed_by) })
    return Array.from(set).sort()
  }, [questions])

  const filtered = useMemo(() => {
    return questions.filter((q) => {
      const matchContributor = !filterContributor || q.contributed_by === filterContributor
      const matchSearch =
        !search ||
        q.text.toLowerCase().includes(search.toLowerCase()) ||
        (q.quiz?.title ?? '').toLowerCase().includes(search.toLowerCase())
      return matchContributor && matchSearch
    })
  }, [questions, filterContributor, search])

  // Group filtered questions by quiz for display
  const grouped = useMemo(() => {
    const map = new Map<string, { quizTitle: string; quizId: string; items: Question[] }>()
    const noQuiz: Question[] = []
    for (const q of filtered) {
      if (q.quiz) {
        const existing = map.get(q.quiz.id)
        if (existing) {
          existing.items.push(q)
        } else {
          map.set(q.quiz.id, { quizTitle: q.quiz.title, quizId: q.quiz.id, items: [q] })
        }
      } else {
        noQuiz.push(q)
      }
    }
    const result = Array.from(map.values())
    if (noQuiz.length > 0) result.push({ quizTitle: 'No quiz assigned', quizId: '', items: noQuiz })
    return result
  }, [filtered])

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Questions</h1>
        <p className="text-slate-500 text-sm mt-1">
          {filtered.length} of {questions.length} question{questions.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Search + contributor filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions or quiz name…"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-primary focus:outline-none bg-white"
          />
        </div>
        <select
          value={filterContributor}
          onChange={(e) => setFilterContributor(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-primary focus:outline-none bg-white min-w-[200px]"
        >
          <option value="">All Contributors</option>
          {contributors.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Contributor chips */}
      {contributors.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFilterContributor('')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
              !filterContributor
                ? 'bg-primary text-white'
                : 'bg-white text-slate-500 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          {contributors.map((c) => {
            const count = questions.filter((q) => q.contributed_by === c).length
            const active = filterContributor === c
            return (
              <button
                key={c}
                onClick={() => setFilterContributor(active ? '' : c)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5 ${
                  active ? 'bg-primary text-white' : 'bg-white text-slate-500 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                <User className="w-3 h-3" />
                {c}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${active ? 'bg-white/25' : 'bg-gray-100 text-slate-500'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Grouped list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-20">
          <HelpCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No questions found.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.quizId || 'none'} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Quiz group header */}
              <div className="px-6 py-3.5 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {group.quizId ? (
                    <Link
                      href={`/admin/quizzes/${group.quizId}`}
                      className="font-bold text-sm text-primary hover:text-primaryHover flex items-center gap-1"
                    >
                      {group.quizTitle}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <span className="font-bold text-sm text-slate-400">{group.quizTitle}</span>
                  )}
                </div>
                <span className="text-xs font-bold text-slate-400 bg-white px-2.5 py-1 rounded-full border border-gray-100">
                  {group.items.length} Q
                </span>
              </div>

              {/* Questions in this group */}
              <div className="divide-y divide-gray-50">
                {group.items.map((q) => (
                  <div key={q.id} className="px-6 py-4 hover:bg-gray-50/50 transition-colors">
                    <p className="text-sm text-slate-800 font-medium leading-relaxed line-clamp-2">
                      {q.text}
                    </p>
                    {q.contributed_by && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <User className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-400 font-medium">{q.contributed_by}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
