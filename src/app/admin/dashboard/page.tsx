export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StatsCard from '@/components/admin/StatsCard'
import TopicWeaknessPanel from '@/components/admin/TopicWeaknessPanel'
import { BookOpen, ListChecks, Users, Activity, Gem, BarChart2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default async function AdminDashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const [
    { count: quizCount },
    { count: categoryCount },
    { count: studentCount },
    { count: completedAttemptCount },
    { count: totalAttemptCount },
    { data: recentQuizzes },
    { data: recentAttempts },
    { data: allStudentPoints },
    { data: topStudents },
    { data: categoryStats },
  ] = await Promise.all([
    supabase.from('quizzes').select('*', { count: 'exact', head: true }),
    supabase.from('categories').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
    supabase.from('quiz_attempts').select('*', { count: 'exact', head: true }).eq('is_completed', true),
    supabase.from('quiz_attempts').select('*', { count: 'exact', head: true }),
    supabase
      .from('quizzes')
      .select('*, category:categories(name)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('quiz_attempts')
      .select('*, profile:profiles(full_name), quiz:quizzes(title)')
      .eq('is_completed', true)
      .order('completed_at', { ascending: false })
      .limit(5),
    supabase
      .from('profiles')
      .select('points')
      .eq('role', 'student'),
    supabase
      .from('profiles')
      .select('id, full_name, points, avatar_seed')
      .eq('role', 'student')
      .order('points', { ascending: false })
      .limit(5),
    supabase.rpc('get_category_success_rates'),
  ])

  const totalPointsAwarded = (allStudentPoints ?? []).reduce(
    (sum, p) => sum + (p.points ?? 0),
    0
  )
  const completionRatio =
    totalAttemptCount && totalAttemptCount > 0
      ? Math.round(((completedAttemptCount ?? 0) / totalAttemptCount) * 100)
      : 0

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Overview of your quiz platform</p>
      </div>

      {/* Stats Grid — 6 cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
        <StatsCard
          title="Total Quizzes"
          value={quizCount ?? 0}
          icon={ListChecks}
          color="text-primary"
          bgColor="bg-violet-50"
        />
        <StatsCard
          title="Categories"
          value={categoryCount ?? 0}
          icon={BookOpen}
          color="text-pink-500"
          bgColor="bg-pink-50"
        />
        <StatsCard
          title="Students"
          value={studentCount ?? 0}
          icon={Users}
          color="text-blue-500"
          bgColor="bg-blue-50"
        />
        <StatsCard
          title="Completed Attempts"
          value={completedAttemptCount ?? 0}
          icon={Activity}
          color="text-green-500"
          bgColor="bg-green-50"
        />
        <StatsCard
          title="Total Points Awarded"
          value={totalPointsAwarded}
          icon={Gem}
          color="text-pink-400"
          bgColor="bg-pink-50"
        />
        <StatsCard
          title="Completion Rate"
          value={`${completionRatio}%`}
          icon={BarChart2}
          color="text-amber-500"
          bgColor="bg-amber-50"
        />
      </div>

      {/* Recent Quizzes + Recent Attempts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        {/* Recent Quizzes */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800">Recent Quizzes</h2>
            <Link href="/admin/quizzes" className="text-sm font-bold text-primary hover:text-primaryHover">
              View all
            </Link>
          </div>
          <div className="p-6 space-y-4">
            {(recentQuizzes ?? []).length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">No quizzes yet</p>
            ) : (
              (recentQuizzes ?? []).map((quiz) => (
                <Link
                  key={quiz.id}
                  href={`/admin/quizzes/${quiz.id}`}
                  className="flex items-center justify-between hover:bg-gray-50 p-3 rounded-xl transition-colors"
                >
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{quiz.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {(quiz as { category?: { name?: string } }).category?.name ?? 'No category'}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-lg ${
                      quiz.is_published ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-500'
                    }`}
                  >
                    {quiz.is_published ? 'Published' : 'Draft'}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Attempts */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800">Recent Attempts</h2>
            <Link href="/admin/students" className="text-sm font-bold text-primary hover:text-primaryHover">
              View all
            </Link>
          </div>
          <div className="p-6 space-y-4">
            {(recentAttempts ?? []).length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">No attempts yet</p>
            ) : (
              (recentAttempts ?? []).map((attempt) => (
                <div key={attempt.id} className="flex items-center justify-between p-3">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">
                      {(attempt as { profile?: { full_name?: string } }).profile?.full_name ?? 'Unknown'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {(attempt as { quiz?: { title?: string } }).quiz?.title}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary text-sm">
                      {attempt.score}/{attempt.total_questions}
                    </p>
                    <p className="text-xs text-slate-400">+{attempt.points_earned} pts</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Top Students + Topic Weakness */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Top Students */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800">Top Students</h2>
            <Link href="/admin/students" className="text-sm font-bold text-primary hover:text-primaryHover">
              View all
            </Link>
          </div>
          <div className="p-6 space-y-3">
            {(topStudents ?? []).length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">No students yet</p>
            ) : (
              (topStudents ?? []).map((student, idx) => (
                <div key={student.id} className="flex items-center gap-3 p-2">
                  <span className="text-xs font-bold text-slate-400 w-5 text-center">
                    #{idx + 1}
                  </span>
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-pink-100 flex-shrink-0">
                    <Image
                      src={`https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(student.avatar_seed ?? student.id)}&backgroundColor=fce7f3`}
                      alt={student.full_name ?? ''}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>
                  <p className="font-semibold text-slate-800 text-sm flex-1 truncate">
                    {student.full_name ?? 'Unknown'}
                  </p>
                  <div className="flex items-center gap-1 text-sm font-bold text-primary">
                    <Gem className="w-3.5 h-3.5 text-pink-400" />
                    {student.points ?? 0}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Topic Performance */}
        <TopicWeaknessPanel
          categories={(categoryStats ?? []).map((c: Record<string, unknown>) => ({
            category_id:    c.category_id as string,
            category_name:  c.category_name as string,
            category_color: c.category_color as string,
            category_icon:  c.category_icon as string,
            total_answers:  Number(c.total_answers),
            correct_answers: Number(c.correct_answers),
            success_rate:   Number(c.success_rate),
          }))}
        />
      </div>
    </div>
  )
}
