import { triageAgent } from './triage'
import { rootCauseAgent } from './root-cause'
import { knowledgeAgent } from './knowledge'
import { resolutionAgent } from './resolution'
import { qaAgent } from './qa'
import { escalationAgent } from './escalation'
import { insightsAgent } from './insights'

// ─────────────────────────────────────────────────────────────────────────────
// THE PIPELINE ORCHESTRATOR
//
// This is the conductor of the orchestra. Each of the 7 agents is like
// a musician — the pipeline tells them when to play, in what order,
// and passes the output of each agent as input to the next.
//
// FLOW:
// Ticket → [1] Triage → [2] Root Cause → [3] Knowledge Search
//         → [4] Resolution → [5] QA → [6] Escalation → [7] Insights
//
// If an agent fails, the pipeline catches the error and continues
// with safe fallback values (it never crashes the whole flow).
// ─────────────────────────────────────────────────────────────────────────────

export interface PipelineResult {
  success: boolean
  ticket_id: string
  intent: string
  severity: string
  resolution_text: string
  confidence: number
  was_escalated: boolean
  escalation_reason?: string
  qa_passed: boolean
  articles_used: string[]
  total_latency_ms: number
  error?: string
}

export async function runPipeline(params: {
  ticket_id: string
  message: string
  channel: string
  customer_id: string
  segment?: string
}): Promise<PipelineResult> {
  const pipelineStart = Date.now()

  try {
    // ── STEP 1: TRIAGE ───────────────────────────────────────────────────────
    // Classify the ticket: what is it about? How urgent?
    const triage = await triageAgent({
      ticket_id: params.ticket_id,
      message: params.message,
      channel: params.channel,
      customer_id: params.customer_id,
    })

    // ── STEP 2: ROOT CAUSE ───────────────────────────────────────────────────
    // Why is this happening? (technical diagnosis)
    const rootCause = await rootCauseAgent({
      ticket_id: params.ticket_id,
      message: params.message,
      intent: triage.intent,
      severity: triage.severity,
      customer_id: params.customer_id,
    })

    // ── STEP 3: KNOWLEDGE SEARCH ─────────────────────────────────────────────
    // Find relevant help articles to ground the response
    const knowledge = await knowledgeAgent({
      ticket_id: params.ticket_id,
      message: params.message,
      intent: triage.intent,
      root_cause: rootCause.root_cause,
    })

    // ── STEP 4: RESOLUTION ───────────────────────────────────────────────────
    // Write the actual customer response (grounded in KB articles)
    const resolution = await resolutionAgent({
      ticket_id: params.ticket_id,
      message: params.message,
      intent: triage.intent,
      root_cause: rootCause.root_cause,
      severity: triage.severity,
      segment: triage.segment,
      context_text: knowledge.context_text,
      article_titles: knowledge.articles.map(a => a.title),
    })

    // ── STEP 5: QA ───────────────────────────────────────────────────────────
    // Check the response for hallucinations, compliance issues, tone
    const qa = await qaAgent({
      ticket_id: params.ticket_id,
      original_message: params.message,
      resolution_text: resolution.resolution_text,
      sources_used: resolution.sources_used,
      is_grounded: resolution.is_grounded,
    })

    // Use revised resolution if QA found a tone issue and provided a fix
    const finalResolution = qa.revised_resolution || resolution.resolution_text

    // ── STEP 6: ESCALATION ───────────────────────────────────────────────────
    // Hard rules: should a human handle this?
    const escalation = await escalationAgent({
      ticket_id: params.ticket_id,
      severity: triage.severity,
      segment: triage.segment,
      confidence: resolution.confidence,
      qa_passed: qa.passed,
      resolution_needs_escalation: resolution.needs_escalation,
      resolution_escalation_reason: resolution.escalation_reason,
      intent: triage.intent,
    })

    // If escalating, create an escalation record in Supabase
    if (escalation.should_escalate) {
      const { createClient } = await import('@/lib/supabase-server')
      const supabase = await createClient()
      await supabase.from('escalations').insert({
        ticket_id: params.ticket_id,
        reason: escalation.escalation_reason,
        priority: escalation.priority,
        status: 'pending',
        ai_summary: `Intent: ${triage.intent} | Root cause: ${rootCause.root_cause}`,
        ai_recommendation: rootCause.recommended_action,
      })
    }

    const totalLatency = Date.now() - pipelineStart

    // ── STEP 7: INSIGHTS ─────────────────────────────────────────────────────
    // Save the full outcome to database + update ticket status
    await insightsAgent({
      ticket_id: params.ticket_id,
      intent: triage.intent,
      root_cause: rootCause.root_cause,
      resolution_text: finalResolution,
      confidence: resolution.confidence,
      was_escalated: escalation.should_escalate,
      escalation_reason: escalation.escalation_reason,
      sources_used: resolution.sources_used,
      qa_passed: qa.passed,
      total_latency_ms: totalLatency,
    })

    return {
      success: true,
      ticket_id: params.ticket_id,
      intent: triage.intent,
      severity: triage.severity,
      resolution_text: finalResolution,
      confidence: resolution.confidence,
      was_escalated: escalation.should_escalate,
      escalation_reason: escalation.escalation_reason,
      qa_passed: qa.passed,
      articles_used: resolution.sources_used,
      total_latency_ms: totalLatency,
    }
  } catch (err) {
    return {
      success: false,
      ticket_id: params.ticket_id,
      intent: 'unknown',
      severity: 'medium',
      resolution_text: '',
      confidence: 0,
      was_escalated: true,
      escalation_reason: `Pipeline error: ${String(err)}`,
      qa_passed: false,
      articles_used: [],
      total_latency_ms: Date.now() - pipelineStart,
      error: String(err),
    }
  }
}
