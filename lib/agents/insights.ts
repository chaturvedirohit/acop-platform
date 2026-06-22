import { logAgentRun } from '@/lib/anthropic'

// ─────────────────────────────────────────────────────────────────────────────
// AGENT 7 — INSIGHTS AGENT
//
// Job: Persist the full outcome of the pipeline run to the database.
// This is the "memory" of the system — every run is stored so you can:
//   - Track which tickets were auto-resolved vs escalated
//   - See agent performance over time (confidence, latency)
//   - Build the "Automation Rate" metric on the dashboard
//
// Plain English: After all other agents run, this agent saves a report card
// for the entire pipeline run to the 'resolutions' table.
// ─────────────────────────────────────────────────────────────────────────────

export interface InsightsResult {
  saved: boolean
  resolution_id?: string
}

export async function insightsAgent(params: {
  ticket_id: string
  intent: string
  root_cause: string
  resolution_text: string
  confidence: number
  was_escalated: boolean
  escalation_reason?: string
  sources_used: string[]
  qa_passed: boolean
  total_latency_ms: number
}): Promise<InsightsResult> {
  const start = Date.now()

  try {
    const { createClient } = await import('@/lib/supabase-server')
    const supabase = await createClient()

    // Save the resolution record (only columns that exist in schema)
    const { data, error } = await supabase
      .from('resolutions')
      .insert({
        ticket_id: params.ticket_id,
        resolution_text: params.resolution_text,
        root_cause: params.root_cause,
        accepted: !params.was_escalated,
      })
      .select('id')
      .single()

    if (error) throw error

    // Update ticket status based on outcome
    const newStatus = params.was_escalated ? 'escalated' : 'resolved'
    await supabase
      .from('tickets')
      .update({
        status: newStatus,
        intent: params.intent,
        confidence: params.confidence,
        root_cause: params.root_cause,
      })
      .eq('id', params.ticket_id)

    await logAgentRun({
      agent_name: 'Insights Agent',
      action: `Pipeline complete — ticket ${newStatus}`,
      status: 'success',
      output: `resolution_id: ${data?.id} | latency: ${params.total_latency_ms}ms`,
      confidence: params.confidence,
      ticket_id: params.ticket_id,
      latency_ms: Date.now() - start,
    })

    return { saved: true, resolution_id: data?.id }
  } catch (err) {
    await logAgentRun({
      agent_name: 'Insights Agent',
      action: 'Failed to persist resolution',
      status: 'failure',
      output: String(err),
      ticket_id: params.ticket_id,
      latency_ms: Date.now() - start,
    })
    return { saved: false }
  }
}
