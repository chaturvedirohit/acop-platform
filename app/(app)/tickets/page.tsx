'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Search, Plus, RefreshCw, Bot, Loader2, MessageSquare } from 'lucide-react'

interface Ticket {
  id: string
  ticket_id: string
  customer_id: string
  channel: string
  message: string
  intent: string | null
  severity: string
  status: string
  root_cause: string | null
  confidence: number | null
  created_at: string
}

const CHANNELS = ['all', 'email', 'chat', 'whatsapp', 'voice', 'crm', 'app']
const STATUSES = ['all', 'open', 'in_progress', 'resolved', 'escalated', 'closed']

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-purple-100 text-purple-700',
  resolved: 'bg-green-100 text-green-700',
  escalated: 'bg-orange-100 text-orange-700',
  closed: 'bg-slate-100 text-slate-500',
}

const CHANNEL_ICONS: Record<string, string> = {
  email: '✉️', chat: '💬', whatsapp: '📱', voice: '📞', crm: '🖥️', app: '📲',
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [filtered, setFiltered] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [channelFilter, setChannelFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [newTicket, setNewTicket] = useState({ message: '', channel: 'chat', severity: 'medium', customer_id: '' })
  const [submitting, setSubmitting] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [processResult, setProcessResult] = useState<{ ticket_id: string; resolution_text: string; was_escalated: boolean; confidence: number } | null>(null)
  const [rateLimitError, setRateLimitError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) { setTickets(data); setFiltered(data) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    let result = tickets
    if (search) result = result.filter(t => t.message.toLowerCase().includes(search.toLowerCase()) || t.ticket_id.includes(search))
    if (channelFilter !== 'all') result = result.filter(t => t.channel === channelFilter)
    if (statusFilter !== 'all') result = result.filter(t => t.status === statusFilter)
    setFiltered(result)
  }, [search, channelFilter, statusFilter, tickets])

  async function processWithAI(ticket: Ticket) {
    if (processingId) return
    setProcessingId(ticket.id)
    try {
      const res = await fetch('/api/process-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: ticket.id }),
      })
      const data = await res.json()
      if (data.success) {
        setProcessResult(data)
        load()
      } else if (res.status === 429) {
        setRateLimitError(data.error)
      } else {
        alert(`Processing failed: ${data.error}`)
      }
    } catch {
      alert('Network error — please try again')
    }
    setProcessingId(null)
  }

  async function createTicket() {
    setSubmitting(true)
    const supabase = createClient()
    const ticket_id = `TKT-${Date.now()}`
    const customer_id = newTicket.customer_id || `C-${Math.floor(Math.random() * 9000) + 1000}`
    await supabase.from('tickets').insert({
      ticket_id,
      customer_id,
      channel: newTicket.channel,
      message: newTicket.message,
      severity: newTicket.severity,
      status: 'open',
      intent: null,
      confidence: null,
      root_cause: null,
    })
    setShowModal(false)
    setNewTicket({ message: '', channel: 'chat', severity: 'medium', customer_id: '' })
    setSubmitting(false)
    load()
  }

  const openCount = tickets.filter(t => t.status === 'open').length

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ticket Queue</h1>
          <p className="text-slate-500 text-sm mt-1">
            {filtered.length} tickets
            {openCount > 0 && <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">{openCount} need processing</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
            <Plus size={14} /> New Ticket
          </button>
        </div>
      </div>

      {/* Rate limit warning */}
      {rateLimitError && (
        <div className="mb-4 flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
          <span className="text-lg leading-none">⚠</span>
          <div className="flex-1">{rateLimitError}</div>
          <button onClick={() => setRateLimitError(null)} className="text-amber-400 hover:text-amber-700 text-lg leading-none">✕</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tickets..."
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
        <select value={channelFilter} onChange={e => setChannelFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none">
          {CHANNELS.map(c => <option key={c} value={c}>{c === 'all' ? 'All Channels' : c}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none">
          {STATUSES.map(s => <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.replace('_', ' ')}</option>)}
        </select>
      </div>

      {/* Ticket Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 size={20} className="animate-spin mr-2" /> Loading tickets...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <MessageSquare size={32} className="mx-auto mb-3 opacity-30" />
          <p>No tickets found. Click "New Ticket" to create one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(t => (
            <div key={t.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:border-indigo-200 hover:shadow-md transition-all">
              <div className="flex items-start gap-4">

                {/* Left: channel icon */}
                <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-base flex-shrink-0 mt-0.5">
                  {CHANNEL_ICONS[t.channel] || '📋'}
                </div>

                {/* Middle: main content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono text-xs text-slate-400">{t.ticket_id}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SEVERITY_COLORS[t.severity] || 'bg-slate-100 text-slate-600'}`}>
                      {t.severity}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[t.status] || 'bg-slate-100 text-slate-600'}`}>
                      {t.status.replace('_', ' ')}
                    </span>
                    {t.intent && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-600 font-medium">
                        {t.intent.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-800 font-medium leading-snug">{t.message}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                    <span>Customer: {t.customer_id}</span>
                    <span>·</span>
                    <span>{t.channel}</span>
                    <span>·</span>
                    <span>{new Date(t.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    {t.confidence != null && (
                      <>
                        <span>·</span>
                        <span className="text-green-600 font-medium">AI: {Math.round(t.confidence * 100)}% confidence</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right: action button */}
                <div className="flex-shrink-0">
                  {(t.status === 'open' || t.status === 'in_progress') ? (
                    <button
                      onClick={() => processWithAI(t)}
                      disabled={processingId === t.id}
                      className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 text-white rounded-lg text-xs font-semibold hover:bg-violet-700 disabled:opacity-60 transition-colors whitespace-nowrap"
                    >
                      {processingId === t.id
                        ? <><Loader2 size={12} className="animate-spin" /> Processing...</>
                        : <><Bot size={12} /> Run AI</>}
                    </button>
                  ) : (
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${t.status === 'resolved' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                      {t.status === 'resolved' ? '✓ Resolved' : '⚠ Escalated'}
                    </span>
                  )}
                </div>

              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Result Modal */}
      {processResult && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${processResult.was_escalated ? 'bg-orange-100' : 'bg-green-100'}`}>
                <Bot size={20} className={processResult.was_escalated ? 'text-orange-600' : 'text-green-600'} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {processResult.was_escalated ? 'Ticket Escalated to Human' : 'Ticket Auto-Resolved'}
                </h2>
                <p className="text-sm text-slate-500">AI Confidence: {Math.round(processResult.confidence * 100)}%</p>
              </div>
            </div>
            {processResult.resolution_text && (
              <div className="bg-slate-50 rounded-lg p-4 mb-4 border border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">AI Response to Customer</p>
                <p className="text-sm text-slate-700 leading-relaxed">{processResult.resolution_text}</p>
              </div>
            )}
            <button
              onClick={() => setProcessResult(null)}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* New Ticket Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-slate-900 mb-4">New Support Ticket</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Customer Message *</label>
                <textarea
                  value={newTicket.message}
                  onChange={e => setNewTicket(p => ({ ...p, message: e.target.value }))}
                  rows={3}
                  placeholder="e.g. My membership is not activated after payment"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Channel</label>
                  <select value={newTicket.channel} onChange={e => setNewTicket(p => ({ ...p, channel: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none">
                    {['email','chat','whatsapp','voice','crm','app'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Severity</label>
                  <select value={newTicket.severity} onChange={e => setNewTicket(p => ({ ...p, severity: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none">
                    {['low','medium','high','critical'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Customer ID (optional)</label>
                <input
                  value={newTicket.customer_id}
                  onChange={e => setNewTicket(p => ({ ...p, customer_id: e.target.value }))}
                  placeholder="Leave blank to auto-generate"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button
                onClick={createTicket}
                disabled={!newTicket.message || submitting}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
