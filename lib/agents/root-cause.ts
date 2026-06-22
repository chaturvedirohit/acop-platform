import { anthropic, HAIKU, logAgentRun } from '@/lib/anthropic'

// ─────────────────────────────────────────────────────────────────────────────
// AGENT 2 — ROOT CAUSE AGENT
//
// Job: Given the ticket + triage result, identify WHY the problem happened.
// In a full production system this would query payment gateway APIs, CRM, logs.
// Phase 2: Claude reasons from the ticket message + intent to infer root cause.
// Phase 3: We'll add real API tool calls (payment gateway, CRM lookups).
// ─────────────────────────────────────────────────────────────────────────────

export interface RootCauseResult {
  root_cause: string
  root_cause_category: string
  confidence: number
  data_sources_checked: string[]
  recommended_action: string
}

export async function rootCauseAgent(params: {
  ticket_id: string
  message: string
  intent: string
  severity: string
  customer_id: string
  past_issues?: string[]
}): Promise<RootCauseResult> {
  const start = Date.now()

  const systemPrompt = `You are a root cause analysis agent for a matrimony platform's support system.
Your job: identify WHY the customer's problem is occurring.

Respond with ONLY valid JSON — no extra text.

{
  "root_cause": "specific technical or process reason",
  "root_cause_category": "payment|profile|technical|policy|user_error|unknown",
  "confidence": 0.0_to_1.0,
  "data_sources_checked": ["list of systems you would check"],
  "recommended_action": "what needs to happen to fix this"
}

Common root causes by intent:
- membership_activation: payment_callback_failed, webhook_timeout, manual_activation_needed
- refund_request: eligibility_check_needed, policy_verification_required
- profile_visibility: privacy_setting_default, profile_incomplete, verification_pending
- photo_upload_error: file_size_exceeded, format_not_supported, server_error
- payment_issue: gateway_timeout, card_declined, duplicate_transaction
- account_access: password_reset_needed, account_suspended, session_expired

Be specific. "payment_callback_failed" is better than "payment issue".`

  const userMessage = `Message: "${params.message}"
Intent: ${params.intent}
Severity: ${params.severity}
Customer: ${params.customer_id}
Past issues: ${params.past_issues?.join(', ') || 'none'}`

  try {
    const response = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const result: RootCauseResult = JSON.parse(text.trim())
    const latency = Date.now() - start

    await logAgentRun({
      agent_name: 'Root Cause Agent',
      action: `Root cause: ${result.root_cause}`,
      status: 'success',
      input: `${params.intent} | ${params.message}`,
      output: text,
      confidence: result.confidence,
      ticket_id: params.ticket_id,
      latency_ms: latency,
      tokens_used: response.usage.input_tokens + response.usage.output_tokens,
    })

    return result
  } catch (err) {
    await logAgentRun({
      agent_name: 'Root Cause Agent',
      action: 'Root cause analysis failed',
      status: 'failure',
      input: params.message,
      output: String(err),
      ticket_id: params.ticket_id,
      latency_ms: Date.now() - start,
    })
    return {
      root_cause: 'unknown',
      root_cause_category: 'unknown',
      confidence: 0.2,
      data_sources_checked: [],
      recommended_action: 'Manual investigation required',
    }
  }
}
