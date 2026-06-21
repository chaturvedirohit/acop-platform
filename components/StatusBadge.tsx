type Color = 'green' | 'red' | 'amber' | 'blue' | 'purple' | 'slate' | 'indigo'

const colorMap: Record<string, Color> = {
  open: 'blue',
  in_progress: 'indigo',
  resolved: 'green',
  escalated: 'red',
  closed: 'slate',
  active: 'green',
  idle: 'amber',
  error: 'red',
  pending: 'amber',
  approved: 'green',
  rejected: 'red',
  success: 'green',
  failure: 'red',
  low: 'slate',
  medium: 'amber',
  high: 'red',
  critical: 'purple',
  standard: 'slate',
  premium: 'blue',
  vip: 'purple',
}

const bgMap: Record<Color, string> = {
  green: 'bg-green-50 text-green-700 border-green-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
}

export default function StatusBadge({ value }: { value: string }) {
  const color = colorMap[value] ?? 'slate'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${bgMap[color]}`}>
      {value.replace(/_/g, ' ')}
    </span>
  )
}
