export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import Image            from 'next/image'
import { Users, Gem, TrendingUp }  from 'lucide-react'

export default async function StudentsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const [{ data: students }, { data: attempts }] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .order('points', { ascending: false }),
    supabase
      .from('quiz_attempts')
      .select('user_id, is_completed')
  ])

  const attemptsByStudent: Record<string, { total: number; completed: number }> = {}
  for (const a of attempts ?? []) {
    if (!attemptsByStudent[a.user_id]) attemptsByStudent[a.user_id] = { total: 0, completed: 0 }
    attemptsByStudent[a.user_id].total++
    if (a.is_completed) attemptsByStudent[a.user_id].completed++
  }

  const totalStudents   = students?.length ?? 0
  const totalPoints     = (students ?? []).reduce((s, p) => s + (p.points ?? 0), 0)
  const totalCompleted  = Object.values(attemptsByStudent).reduce((s, v) => s + v.completed, 0)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Students</h1>
          <p className="text-slate-500 text-sm mt-1">{totalStudents} registered students</p>
        </div>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2.5 shadow-sm">
          <Users className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-bold text-slate-700">{totalStudents} students</span>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2.5 shadow-sm">
          <Gem className="w-4 h-4 text-pink-400" />
          <span className="text-sm font-bold text-slate-700">{totalPoints.toLocaleString()} total pts</span>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2.5 shadow-sm">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-bold text-slate-700">{totalCompleted} completions</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {totalStudents === 0 ? (
          <div className="text-center py-20">
            <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-slate-500 font-semibold">No students registered yet</p>
            <p className="text-slate-400 text-sm mt-1">Students will appear here once they sign up.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Student</th>
                  <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Email</th>
                  <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Points</th>
                  <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Attempts</th>
                  <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider w-44">Completion</th>
                  <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(students ?? []).map((student, idx) => {
                  const stats    = attemptsByStudent[student.id] ?? { total: 0, completed: 0 }
                  const pct      = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
                  const avatarSeed = student.avatar_seed ?? student.email ?? student.id

                  return (
                    <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-pink-100 overflow-hidden">
                              <Image
                                src={`https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(avatarSeed)}&backgroundColor=fce7f3`}
                                alt={student.full_name ?? 'Student'}
                                width={40}
                                height={40}
                                className="w-full h-full object-cover"
                                unoptimized
                              />
                            </div>
                            {idx < 3 && (
                              <span className="absolute -top-1 -right-1 w-4.5 h-4.5 text-[10px] font-bold bg-primary text-white rounded-full flex items-center justify-center leading-none">
                                {idx + 1}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">
                              {student.full_name ?? 'Anonymous'}
                            </p>
                            {student.giaic_id && (
                              <p className="text-[11px] text-slate-400 font-mono mt-0.5">{student.giaic_id}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{student.email ?? '—'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <Gem className="w-4 h-4 text-pink-400 fill-pink-100" />
                          <span className="font-bold text-primary text-sm">{student.points ?? 0}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-slate-600">{stats.total}</span>
                        {stats.completed > 0 && (
                          <span className="text-xs text-slate-400 ml-1">({stats.completed} done)</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {stats.total > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[60px]">
                              <div
                                className={`h-full rounded-full ${pct >= 70 ? 'bg-emerald-400' : pct >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-slate-500 tabular-nums">{pct}%</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {new Date(student.created_at).toLocaleDateString('en-US', {
                          year: 'numeric', month: 'short', day: 'numeric',
                        })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
