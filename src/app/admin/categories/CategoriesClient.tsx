'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, X, Check, ListChecks } from 'lucide-react'
import type { Category } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

const COLOR_OPTIONS = [
  { label: 'Pink',    value: 'bg-pink-100' },
  { label: 'Violet',  value: 'bg-violet-100' },
  { label: 'Blue',    value: 'bg-blue-100' },
  { label: 'Green',   value: 'bg-green-100' },
  { label: 'Orange',  value: 'bg-orange-100' },
  { label: 'Fuchsia', value: 'bg-fuchsia-100' },
  { label: 'Yellow',  value: 'bg-yellow-100' },
  { label: 'Indigo',  value: 'bg-indigo-100' },
]

interface FormState {
  name:  string
  icon:  string
  color: string
}

const defaultForm: FormState = { name: '', icon: '📚', color: 'bg-pink-100' }

interface Props {
  initialCategories: Category[]
  quizCountMap:      Record<string, number>
}

export default function CategoriesClient({ initialCategories, quizCountMap }: Props) {
  const supabase  = createClient()
  const [categories, setCategories] = useState(initialCategories)
  const [counts, setCounts]         = useState(quizCountMap)
  const [showForm, setShowForm]     = useState(false)
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [form, setForm]             = useState<FormState>(defaultForm)
  const [saving, setSaving]         = useState(false)
  const [deleteId, setDeleteId]     = useState<string | null>(null)
  const [error, setError]           = useState<string | null>(null)

  const handleOpen = (cat?: Category) => {
    setError(null)
    if (cat) {
      setEditingId(cat.id)
      setForm({ name: cat.name, icon: cat.icon, color: cat.color })
    } else {
      setEditingId(null)
      setForm(defaultForm)
    }
    setShowForm(true)
  }

  const handleClose = () => {
    setShowForm(false)
    setEditingId(null)
    setForm(defaultForm)
    setError(null)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    setError(null)

    if (editingId) {
      const { data, error: err } = await supabase
        .from('categories')
        .update({ name: form.name.trim(), icon: form.icon.trim(), color: form.color })
        .eq('id', editingId)
        .select()
        .single()

      if (err) { setError(err.message); setSaving(false); return }
      if (data) setCategories((prev) => prev.map((c) => (c.id === editingId ? data : c)))
    } else {
      const { data, error: err } = await supabase
        .from('categories')
        .insert({ name: form.name.trim(), icon: form.icon.trim(), color: form.color })
        .select()
        .single()

      if (err) { setError(err.message); setSaving(false); return }
      if (data) {
        setCategories((prev) => [data, ...prev])
        setCounts((prev) => ({ ...prev, [data.id]: 0 }))
      }
    }

    setSaving(false)
    handleClose()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category? Quizzes in it will lose their category.')) return
    setDeleteId(id)
    const { error: err } = await supabase.from('categories').delete().eq('id', id)
    if (!err) {
      setCategories((prev) => prev.filter((c) => c.id !== id))
      setCounts((prev) => { const next = { ...prev }; delete next[id]; return next })
    }
    setDeleteId(null)
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Categories</h1>
          <p className="text-slate-500 text-sm mt-1">
            {categories.length} categor{categories.length === 1 ? 'y' : 'ies'} configured
          </p>
        </div>
        <button
          onClick={() => handleOpen()}
          className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-primaryHover transition-colors shadow-soft"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">
                {editingId ? 'Edit Category' : 'New Category'}
              </h2>
              <button
                onClick={handleClose}
                className="p-2 rounded-xl hover:bg-gray-100 text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-primary focus:outline-none text-sm"
                  placeholder="e.g. Mathematics"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Icon (emoji)</label>
                <input
                  type="text"
                  value={form.icon}
                  onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-primary focus:outline-none text-sm"
                  placeholder="📚"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Background Color</label>
                <div className="grid grid-cols-4 gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setForm((f) => ({ ...f, color: c.value }))}
                      className={`${c.value} h-10 rounded-xl flex items-center justify-center border-2 transition-all ${
                        form.color === c.value ? 'border-primary scale-105 shadow-sm' : 'border-transparent hover:scale-105'
                      }`}
                      title={c.label}
                    >
                      {form.color === c.value && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Preview</label>
                <div
                  className={`${form.color} rounded-2xl p-4 flex items-center gap-3 relative overflow-hidden`}
                >
                  <span className="text-3xl relative z-10">{form.icon || '📚'}</span>
                  <span className="font-bold text-primary relative z-10 text-sm">
                    {form.name || 'Category Name'}
                  </span>
                  <div className="absolute -bottom-2 -right-2 text-6xl opacity-20 select-none">
                    {form.icon || '📚'}
                  </div>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleClose}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-slate-600 font-semibold hover:bg-gray-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="flex-1 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primaryHover transition-colors disabled:opacity-60 shadow-soft text-sm"
              >
                {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Category'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      {categories.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📚</span>
          </div>
          <p className="text-slate-500 font-semibold mb-1">No categories yet</p>
          <p className="text-slate-400 text-sm">Create your first category to start organising quizzes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {categories.map((cat) => {
            const qCount = counts[cat.id] ?? 0
            return (
              <div
                key={cat.id}
                className={`${cat.color} rounded-3xl p-5 relative overflow-hidden group cursor-default`}
              >
                {/* Action buttons */}
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button
                    onClick={() => handleOpen(cat)}
                    className="p-1.5 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm hover:bg-white transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5 text-slate-600" />
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    disabled={deleteId === cat.id}
                    className="p-1.5 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm hover:bg-red-50 disabled:opacity-50 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>

                {/* Emoji */}
                <div className="text-4xl mb-4 leading-none">{cat.icon}</div>

                {/* Name */}
                <p className="font-bold text-primary text-sm leading-tight mb-2">{cat.name}</p>

                {/* Quiz count badge */}
                <div className="flex items-center gap-1 text-xs font-semibold text-primary/70">
                  <ListChecks className="w-3.5 h-3.5" />
                  <span>{qCount} quiz{qCount !== 1 ? 'zes' : ''}</span>
                </div>

                {/* Decorative bg emoji */}
                <div className="absolute -bottom-2 -right-2 text-7xl opacity-20 select-none pointer-events-none">
                  {cat.icon}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
