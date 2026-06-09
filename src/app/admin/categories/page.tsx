export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CategoriesClient from './CategoriesClient'

export default async function CategoriesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const [{ data: categories }, { data: quizCounts }] = await Promise.all([
    supabase.from('categories').select('*').order('created_at', { ascending: false }),
    supabase.from('quizzes').select('category_id'),
  ])

  const countMap: Record<string, number> = {}
  for (const q of quizCounts ?? []) {
    if (q.category_id) countMap[q.category_id] = (countMap[q.category_id] ?? 0) + 1
  }

  return (
    <CategoriesClient
      initialCategories={categories ?? []}
      quizCountMap={countMap}
    />
  )
}
