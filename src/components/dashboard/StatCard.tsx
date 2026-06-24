interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  color?: 'red' | 'green' | 'purple' | 'orange' | 'blue' | 'teal'
}

const colors = {
  red:    'bg-red-50 border-red-200 text-red-700',
  green:  'bg-green-50 border-green-200 text-green-700',
  purple: 'bg-purple-50 border-purple-200 text-purple-700',
  orange: 'bg-orange-50 border-orange-200 text-orange-700',
  blue:   'bg-blue-50 border-blue-200 text-blue-700',
  teal:   'bg-teal-50 border-teal-200 text-teal-700',
}

export default function StatCard({ label, value, sub, color = 'blue' }: StatCardProps) {
  return (
    <div className={`rounded-xl border p-5 ${colors[color]}`}>
      <p className="text-sm font-medium opacity-75">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
    </div>
  )
}
