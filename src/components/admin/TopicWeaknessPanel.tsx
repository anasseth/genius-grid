interface CategoryStat {
  category_id: string
  category_name: string
  category_color: string
  category_icon: string
  total_answers: number
  correct_answers: number
  success_rate: number
}

interface Props {
  categories: CategoryStat[]
}

const PASS_THRESHOLD = 70

export default function TopicWeaknessPanel({ categories }: Props) {
  const rows = categories.slice(0, 8)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="p-6 border-b border-gray-100">
        <h2 className="font-bold text-slate-800">Topic Performance</h2>
        <p className="text-xs text-slate-400 mt-0.5">Min 10 answers required to appear</p>
      </div>

      <div className="p-6">
        {rows.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-4">Not enough data yet</p>
        ) : (
          <div className="space-y-3">
            {rows.map((cat) => {
              const passing = cat.success_rate >= PASS_THRESHOLD
              return (
                <div key={cat.category_id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-lg leading-none">{cat.category_icon}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{cat.category_name}</p>
                      <p className="text-xs text-slate-400">{cat.total_answers} answers</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden hidden sm:block">
                      <div
                        className={`h-full rounded-full ${passing ? 'bg-emerald-400' : 'bg-red-400'}`}
                        style={{ width: `${Math.min(cat.success_rate, 100)}%` }}
                      />
                    </div>
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${
                        passing
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {cat.success_rate}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
