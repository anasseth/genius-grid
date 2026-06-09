import { LucideIcon } from 'lucide-react'

interface Props {
  title:   string
  value:   number | string
  icon:    LucideIcon
  color:   string
  bgColor: string
  change?: string
  sub?:    string
}

export default function StatsCard({ title, value, icon: Icon, color, bgColor, change, sub }: Props) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 ${bgColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        {change && (
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
            {change}
          </span>
        )}
      </div>
      <p className="text-3xl font-extrabold text-slate-800 mb-0.5 tabular-nums">{value}</p>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}
