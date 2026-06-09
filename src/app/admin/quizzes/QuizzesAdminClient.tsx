'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Plus, Pencil, Trash2, Clock, FileText, Eye, EyeOff,
  Search, ListChecks,
} from 'lucide-react'
import type { Category, Quiz } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

interface Props {
  initialQuizzes: Quiz[]
  categories:     Category[]
}

const difficultyStyles: Record<string, string> = {
  Easy:   'text-green-700  bg-green-50  border border-green-100',
  Medium: 'text-orange-700 bg-orange-50 border border-orange-100',
  Hard:   'text-red-700    bg-red-50    border border-red-100',
}

export default function QuizzesAdminClient({ initialQuizzes, categories }: Props) {
  const supabase = createClient()

  const [quizzes, setQuizzes]             = useState(initialQuizzes)
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [search, setSearch]               = useState('')
  const [deleteId, setDeleteId]           = useState<string | null>(null)
  const [toggling, setToggling]           = useState<string | null>(null)

  const filtered = quizzes.filter((q) => {
    const matchCat = !filterCategory || q.category_id === filterCategory
    const matchSearch =
      !search ||
      q.title.toLowerCase().includes(search.toLowerCase()) ||
      (q.description ?? '').toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const handleTogglePublish = async (quiz: Quiz) => {
    setToggling(quiz.id)
    const { data, error } = await supabase
      .from('quizzes')
      .update({ is_published: !quiz.is_published })
      .eq('id', quiz.id)
      .select()
      .single()

    if (!error && data) {
      setQuizzes((prev) => prev.map((q) => (q.id === quiz.id ? { ...q, is_published: data.is_published } : q)))
    }
    setToggling(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this quiz? All its questions and student attempts will also be deleted.')) return
    setDeleteId(id)
    const { error } = await supabase.from('quizzes').delete().eq('id', id)
    if (!error) setQuizzes((prev) => prev.filter((q) => q.id !== id))
    setDeleteId(null)
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quizzes</h1>
          <p className="text-slate-500 text-sm mt-1">
            {quizzes.length} total · {quizzes.filter((q) => q.is_published).length} published
          </p>
        </div>
        <Link
          href="/admin/quizzes/new"
          className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-primaryHover transition-colors shadow-soft"
        >
          <Plus className="w-4 h-4" />
          New Quiz
        </Link>
      </div>

      {/* Search + category filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search quizzes…"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-primary focus:outline-none bg-white"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
          <button
            onClick={() => setFilterCategory(null)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors flex-shrink-0 ${
              !filterCategory ? 'bg-primary text-white shadow-sm' : 'bg-white text-slate-500 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id === filterCategory ? null : cat.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors flex-shrink-0 ${
                filterCategory === cat.id ? 'bg-primary text-white shadow-sm' : 'bg-white text-slate-500 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <ListChecks className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No quizzes found.</p>
            {quizzes.length === 0 && (
              <Link
                href="/admin/quizzes/new"
                className="mt-3 inline-block text-primary font-bold text-sm hover:text-primaryHover"
              >
                Create your first quiz →
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Quiz</th>
                  <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Category</th>
                  <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Difficulty</th>
                  <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Qs</th>
                  <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Time/Q</th>
                  <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-right px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((quiz) => {
                  const diff = (quiz.difficulty ?? 'Medium') as keyof typeof difficultyStyles
                  const category = quiz.category as { name?: string; color?: string } | null
                  return (
                    <tr key={quiz.id} className="hover:bg-gray-50/60 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-800 text-sm">{quiz.title}</p>
                        {quiz.description && (
                          <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">
                            {quiz.description}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {category?.name ? (
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${category.color ?? 'bg-pink-100'} text-primary`}>
                            {category.name}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${difficultyStyles[diff] ?? difficultyStyles.Medium}`}>
                          {quiz.difficulty}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          {(quiz.questions as unknown[])?.length ?? 0}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {quiz.time_per_question}s
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          quiz.is_published
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {quiz.is_published ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleTogglePublish(quiz)}
                            disabled={toggling === quiz.id}
                            title={quiz.is_published ? 'Unpublish' : 'Publish'}
                            className="p-2 rounded-lg hover:bg-gray-100 text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-40"
                          >
                            {quiz.is_published
                              ? <EyeOff className="w-4 h-4" />
                              : <Eye className="w-4 h-4" />}
                          </button>
                          <Link
                            href={`/admin/quizzes/${quiz.id}`}
                            className="p-2 rounded-lg hover:bg-violet-50 text-slate-400 hover:text-primary transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(quiz.id)}
                            disabled={deleteId === quiz.id}
                            className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-40"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-slate-400 mt-3 text-right">
          Showing {filtered.length} of {quizzes.length} quizzes
        </p>
      )}
    </div>
  )
}
