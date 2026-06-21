'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import MetricCard from '@/components/MetricCard'
import StatusBadge from '@/components/StatusBadge'
import {
  Ticket, CheckCircle, AlertTriangle, Zap,
  TrendingUp, Users, Clock, Star
} from 'lucide-react'

interface RecentTicket {
  id: string
  ticket_id: string
  message: string
  severity: string
  status: string
  channel: string
  created_at: string
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState({
    total: 0, open: 0, resolved: 0, escalated: 0,
    automation: 0, avgConfidence: 0,
  })
  const [recent, setRecent] = useState<RecentTicket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [{ data: tickets }, { data: resolutions }] = await Promise.all([
        supabase.from('tickets').select('id,ticket_id,message,severity,status,channel,created_at,confidence').order('created_at', { ascending: false }),
        supabase.from('resolutions').select('accepted'),
      ])

      if (tickets) {
        const total = tickets.length
        const open = tickets.filter(t => t.status === 'open').length
        const resolved = tickets.filter(t => t.status === 'resolved').length
        const escalated = tickets.filter(t => t.status === 'escalated').length
        const withConf = tickets.filter(t => t.confidence != null)
        const avgConf = withConf.length
          ? Math.round(withConf.reduce((s, t) => s + (t.confidence ?? 0), 0) / withConf.length * 100)
          : 0
        const automation = total > 0 ? Math.round((resolved / total) * 100) : 0
        setMetrics({ total, open, resolved, escalated, automation, avgConfidence: avgConf })
        setRecent(tickets.slice(0, 8))
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Operations Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Real-time view of your AI customer operations</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard title="Total Tickets" value={metrics.total} icon={Ticket} color="indigo" subtitle="All time" />
        <MetricCard title="Open" value={metrics.open} icon={Clock} color="amber" subtitle="Needs attention" />
        <MetricCard title="Resolved" value={metrics.resolved} icon={CheckCircle} color="green" trendValue={`${metrics.automation}% automation`} trend="up" />
        <MetricCard title="Escalated" value={metrics.escalated} icon={AlertTriangle} color="red" subtitle="Awaiting human" />
        <MetricCard title="Automation Rate" value={`${metrics.automation}%`} icon={Zap} color="purple" trendValue="Target: 40%" />
        <MetricCard title="Avg AI Confidence" value={`${metrics.avgConfidence}%`} icon={TrendingUp} color="blue" trendValue="Target: 80%+" />
        <MetricCard title="FCR Rate" value="—" icon={Star} color="green" subtitle="First Contact Resolution" />
        <MetricCard title="Active Agents" value="7" icon={Users} color="indigo" subtitle="All systems healthy" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Recent Tickets</h2>
          <a href="/tickets" className="text-xs text-indigo-600 font-medium hover:underline">View all →</a>
        </div>
        {recent.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            No tickets yet. They will appear here once customers submit requests.
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {recent.map((t) => (
              <div key={t.id} className="px-6 py-3.5 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{t.message}</p>
                  <p className="text-xs text-slate-400 mt-0.5">#{t.ticket_id} · {t.channel} · {new Date(t.created_at).toLocaleDateString()}</p>
                </div>
                <StatusBadge value={t.severity} />
                <StatusBadge value={t.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
