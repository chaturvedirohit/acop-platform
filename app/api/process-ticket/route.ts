import { NextRequest, NextResponse } from 'next/server'
import { runPipeline } from '@/lib/agents/pipeline'
import { createClient } from '@/lib/supabase-server'

// ─────────────────────────────────────────────────────────────────────────────
// API ROUTE: POST /api/process-ticket
//
// Plain English: This is the "door" between the browser and the AI agents.
// When the user clicks "Process with AI" on a ticket, the browser calls this URL.
// This route:
//   1. Verifies the user is logged in (auth check)
//   2. Fetches the ticket from database
//   3. Runs the 7-agent pipeline
//   4. Returns the result to the browser
//
// SECURITY: ANTHROPIC_API_KEY is only accessed here (server-side).
// It never goes to the browser. The user can never see it.
//
// RATE LIMITING: Each call costs real money (Claude API).
// We add a simple guard: max 1 active process per ticket at a time.
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // ── AUTH CHECK ──────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── PARSE REQUEST ───────────────────────────────────────────────────────────
  let ticket_id: string
  try {
    const body = await request.json()
    ticket_id = body.ticket_id
    if (!ticket_id) throw new Error('Missing ticket_id')
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // ── FETCH TICKET FROM DATABASE ──────────────────────────────────────────────
  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', ticket_id)
    .single()

  if (ticketError || !ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
  }

  // ── GUARD: Don't re-process already resolved/escalated tickets ──────────────
  if (ticket.status === 'resolved' || ticket.status === 'escalated') {
    return NextResponse.json({
      error: `Ticket is already ${ticket.status}. Create a new ticket to reprocess.`
    }, { status: 409 })
  }

  // ── MARK AS PROCESSING ──────────────────────────────────────────────────────
  // Set status to 'in_progress' immediately so the UI can show a spinner
  await supabase
    .from('tickets')
    .update({ status: 'in_progress' })
    .eq('id', ticket_id)

  // ── RUN THE 7-AGENT PIPELINE ────────────────────────────────────────────────
  const result = await runPipeline({
    ticket_id,
    message: ticket.message,
    channel: ticket.channel,
    customer_id: ticket.customer_id,
    segment: ticket.segment,
  })

  // ── RETURN RESULT ───────────────────────────────────────────────────────────
  if (!result.success) {
    // Pipeline errored — mark ticket as open again for retry
    await supabase
      .from('tickets')
      .update({ status: 'open' })
      .eq('id', ticket_id)

    return NextResponse.json({
      success: false,
      error: result.error || 'Pipeline failed',
    }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    ticket_id: result.ticket_id,
    intent: result.intent,
    severity: result.severity,
    resolution_text: result.resolution_text,
    confidence: result.confidence,
    was_escalated: result.was_escalated,
    escalation_reason: result.escalation_reason,
    qa_passed: result.qa_passed,
    articles_used: result.articles_used,
    total_latency_ms: result.total_latency_ms,
  })
}
