'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import StatusBadge from '@/components/StatusBadge'
import { ShieldCheck, CheckCircle, XCircle, RefreshCw, AlertTriangle } from 'lucide-react'

interface Escalation {
  id: string
  ticket_id: string
  reason: string
  status: string
  reviewer_notes: string | null
  resolution: string | null
  created_at: string
  tickets: {
    message: string
    severity: string
    channel: string
    customer_id: string
    intent: string | null
    root_cause: string | null
    confidence: number | null
  } | null
}

export default function ReviewPage() {
  const [escalations, setEscalations] = useState<Escalation[]>([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState<Escalation | null>(null)
  const [notes, setNotes] = useState('')
  const [resolution, setResolution] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('escalations')
      .select('*, tickets(message, severity, channel, customer_id, intent, root_cause, confidence)')
      .order('created_at', { ascending: false })
    if (data) setEscalations(data as Escalation[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleDecision(decision: 'approved' | 'rejected') {
    if (!active) return
    setSubmitting(true)
    const supabase = createClient()
    await supabase.from('escalations').update({
      status: decision,
      reviewer_notes: notes,
      resolution: resolution || null,
      resolved_at: new Date().toISOString(),
    }).eq('id', active.id)

    if (decision === 'approved') {
      await supabase.from('tickets').update({ status: 'resolved' }).eq('ticket_id', active.ticket_id)
    }

    setActive(null)
    setNotes('')
    setResolution('')
    setSubmitting(false)
    load()
  }

  const pending = escalations.filter(e => e.status === 'pending')
  const resolved = escalations.filter(e => e.status !== 'pending')

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Human Review Queue</h1>
          <p className="text-slate-500 text-sm mt-1">
            {pending.length} pending · {resolved.length} resolved
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {pending.length > 0 && (
        <div className="mb-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
          <AlertTriangle size={15} className="text-amber-600" />
          <span className="text-sm text-amber-700 font-medium">{pending.length} ticket{pending.length > 1 ? 's' : ''} awaiting your approval before AI responds</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        {loading ? (
          <div className="col-span-2 py-16 text-center text-slate-400">Loading escalations...</div>
        ) : pending.length === 0 ? (
          <div className="col-span-2 py-16 text-center">
            <ShieldCheck size={40} className="mx-auto text-green-300 mb-3" />
            <p className="text-slate-500 font-medium">All clear — no pending escalations</p>
            <p className="text-slate-400 text-sm mt-1">New escalations will appear here when AI confidence is low or tickets require human judgment</p>
          </div>
        ) : pending.map(esc => (
          <div key={esc.id} className={`bg-white rounded-xl border shadow-sm p-5 cursor-pointer transition-all hover:shadow-md ${active?.id === esc.id ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200'}`} onClick={() => { setActive(esc); setNotes(''); setResolution('') }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-slate-800 text-sm">{esc.ticket_id}</p>
                <p className="text-xs text-slate-400 mt-0.5">{new Date(esc.created_at).toLocaleString()}</p>
              </div>
              <StatusBadge value={esc.status} />
            </div>
            <p className="text-sm text-slate-700 mb-2 line-clamp-2">{esc.tickets?.message ?? 'No message'}</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {esc.tickets?.severity && <StatusBadge value={esc.tickets.severity} />}
              {esc.tickets?.channel && <StatusBadge value={esc.tickets.channel} />}
            </div>
            <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <p className="text-xs font-medium text-red-700">Escalation reason: {esc.reason}</p>
            </div>
            {esc.tickets?.root_cause && (
              <p className="text-xs text-slate-500 mt-2">Root cause: {esc.tickets.root_cause}</p>
            )}
          </div>
        ))}
      </div>

      {active && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Review: {active.ticket_id}</h2>
            <p className="text-sm text-slate-500 mb-4">Customer message: <span className="text-slate-700 font-medium">{active.tickets?.message}</span></p>

            <div className="bg-slate-50 rounded-lg p-3 mb-4 text-sm space-y-1.5">
              <p className="text-slate-500">Intent: <span className="text-slate-700">{active.tickets?.intent ?? 'Not detected'}</span></p>
              <p className="text-slate-500">Root Cause: <span className="text-slate-700">{active.tickets?.root_cause ?? 'Not identified'}</span></p>
              <p className="text-slate-500">AI Confidence: <span className="text-slate-700">{active.tickets?.confidence != null ? `${Math.round(active.tickets.confidence * 100)}%` : '—'}</span></p>
              <p className="text-slate-500">Escalation reason: <span className="text-red-600 font-medium">{active.reason}</span></p>
            </div>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Resolution to send customer</label>
                <textarea value={resolution} onChange={e => setResolution(e.target.value)} rows={3} placeholder="Write the response to send the customer..." className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Internal notes (optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Notes for your team..." className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setActive(null)} className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={() => handleDecision('rejected')} disabled={submitting} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50">
                <XCircle size={14} /> Reject
              </button>
              <button onClick={() => handleDecision('approved')} disabled={submitting} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                <CheckCircle size={14} /> Approve & Resolve
              </button>
            </div>
          </div>
        </div>
      )}

      {resolved.length > 0 && (
        <div>
          <h2 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">Recently Resolved</h2>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Ticket', 'Reason', 'Decision', 'Resolution', 'Time'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {resolved.slice(0, 20).map(esc => (
                  <tr key={esc.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{esc.ticket_id}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 max-w-xs truncate">{esc.reason}</td>
                    <td className="px-4 py-3"><StatusBadge value={esc.status} /></td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">{esc.resolution ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{new Date(esc.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
