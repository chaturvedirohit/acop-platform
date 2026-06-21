'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import StatusBadge from '@/components/StatusBadge'
import { Bot, RefreshCw, Activity, CheckCircle, XCircle, Clock } from 'lucide-react'

const AGENTS = [
  { name: 'Triage Agent', description: 'Intent detection, entity extraction, priority assignment', color: 'bg-blue-100 text-blue-700' },
  { name: 'Root Cause Agent', description: 'Identifies root cause from payment, profile, CRM, and logs', color: 'bg-purple-100 text-purple-700' },
  { name: 'Knowledge Agent', description: 'RAG retrieval from SOPs, FAQs, product docs', color: 'bg-indigo-100 text-indigo-700' },
  { name: 'Resolution Agent', description: 'Generates grounded customer response', color: 'bg-green-100 text-green-700' },
  { name: 'QA Agent', description: 'Hallucination, compliance, brand tone, safety checks', color: 'bg-amber-100 text-amber-700' },
  { name: 'Escalation Agent', description: 'Determines if human review is required', color: 'bg-red-100 text-red-700' },
  { name: 'Insights Agent', description: 'Generates operational intelligence and weekly reports', color: 'bg-teal-100 text-teal-700' },
]

interface AgentLog {
  id: string
  agent_name: string
  action: string
  status: string
  confidence: number | null
  latency_ms: number | null
  tokens_used: number | null
  ticket_id: string | null
  created_at: string
}

interface AgentStats {
  total: number
  success: number
  failure: number
  avgConf: number
  avgLatency: number
  lastAction: string | null
}

export default function AgentsPage() {
  const [logs, setLogs] = useState<AgentLog[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Record<string, AgentStats>>({})
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('agent_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (data) {
      setLogs(data)
      const s: Record<string, AgentStats> = {}
      for (const agent of AGENTS) {
        const agentLogs = data.filter(l => l.agent_name === agent.name)
        const success = agentLogs.filter(l => l.status === 'success').length
        const withConf = agentLogs.filter(l => l.confidence != null)
        const withLat = agentLogs.filter(l => l.latency_ms != null)
        s[agent.name] = {
          total: agentLogs.length,
          success,
          failure: agentLogs.filter(l => l.status === 'failure').length,
          avgConf: withConf.length ? Math.round(withConf.reduce((a, l) => a + (l.confidence ?? 0), 0) / withConf.length * 100) : 0,
          avgLatency: withLat.length ? Math.round(withLat.reduce((a, l) => a + (l.latency_ms ?? 0), 0) / withLat.length) : 0,
          lastAction: agentLogs[0]?.created_at ?? null,
        }
      }
      setStats(s)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filteredLogs = selectedAgent ? logs.filter(l => l.agent_name === selectedAgent) : logs

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agent Monitor</h1>
          <p className="text-slate-500 text-sm mt-1">Live status of all 7 AI agents</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        {AGENTS.map(agent => {
          const s = stats[agent.name]
          const successRate = s && s.total > 0 ? Math.round((s.success / s.total) * 100) : null
          return (
            <button
              key={agent.name}
              onClick={() => setSelectedAgent(prev => prev === agent.name ? null : agent.name)}
              className={`bg-white rounded-xl border text-left p-5 shadow-sm transition-all hover:shadow-md ${selectedAgent === agent.name ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200'}`}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className={`rounded-lg p-2 ${agent.color}`}>
                  <Bot size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">{agent.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5 leading-snug">{agent.description}</p>
                </div>
                <div className={`w-2 h-2 rounded-full mt-1.5 ${s && s.total > 0 ? 'bg-green-400' : 'bg-slate-300'}`} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-50 rounded-lg py-2">
                  <p className="text-xs text-slate-400">Runs</p>
                  <p className="font-bold text-slate-700 text-sm">{s?.total ?? 0}</p>
                </div>
                <div className="bg-slate-50 rounded-lg py-2">
                  <p className="text-xs text-slate-400">Success</p>
                  <p className="font-bold text-slate-700 text-sm">{successRate != null ? `${successRate}%` : '—'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg py-2">
                  <p className="text-xs text-slate-400">Conf.</p>
                  <p className="font-bold text-slate-700 text-sm">{s?.avgConf ? `${s.avgConf}%` : '—'}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <Activity size={16} className="text-slate-400" />
          <h2 className="font-semibold text-slate-800">
            {selectedAgent ? `${selectedAgent} — Activity Log` : 'All Agent Activity'}
          </h2>
          {selectedAgent && (
            <button onClick={() => setSelectedAgent(null)} className="ml-auto text-xs text-slate-400 hover:text-slate-600">Clear filter ×</button>
          )}
        </div>
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Loading agent logs...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">No agent activity yet. Logs will appear as the system processes tickets.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Agent', 'Action', 'Status', 'Confidence', 'Latency', 'Tokens', 'Ticket', 'Time'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredLogs.slice(0, 50).map(log => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-xs font-medium text-slate-700 whitespace-nowrap">{log.agent_name}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">{log.action}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${log.status === 'success' ? 'text-green-600' : log.status === 'failure' ? 'text-red-500' : 'text-amber-500'}`}>
                      {log.status === 'success' ? <CheckCircle size={12} /> : log.status === 'failure' ? <XCircle size={12} /> : <Clock size={12} />}
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{log.confidence != null ? `${Math.round(log.confidence * 100)}%` : '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{log.latency_ms ? `${log.latency_ms}ms` : '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{log.tokens_used ?? '—'}</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-400">{log.ticket_id ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{new Date(log.created_at).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
