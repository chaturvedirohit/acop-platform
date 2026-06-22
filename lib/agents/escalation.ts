import { logAgentRun } from '@/lib/anthropic'

// ─────────────────────────────────────────────────────────────────────────────
// AGENT 6 — ESCALATION AGENT
//
// Job: Decide if this ticket needs a human agent.
// Uses HARD RULES — no AI needed for this decision. Why?
//   - Rules are predictable (no hallucination risk)
//   - Rules are auditable ("why was this escalated?" → traceable rule)
//   - Faster + cheaper than calling Claude
//
// HARD RULES (always escalate if any are true):
//   1. Severity is critical
//   2. QA check failed
//   3. Resolution confidence below 0.6
//   4. Resolution agent said it needs escalation
//   5. Customer segment is VIP + severity is high or above
// ─────────────────────────────────────────────────────────────────────────────

export interface EscalationResult {
  should_escalate: boolean
  escalation_reason: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assigned_queue: string
}

export async function escalationAgent(params: {
  ticket_id: string
  severity: string
  segment: string
  confidence: number
  qa_passed: boolean
  resolution_needs_escalation: boolean
  resolution_escalation_reason?: string
  intent: string
}): Promise<EscalationResult> {
  const start = Date.now()

  let should_escalate = false
  let escalation_reason = ''
  let priority: EscalationResult['priority'] = 'low'
  let assigned_queue = 'general'

  // Rule 1: Critical severity always escalates
  if (params.severity === 'critical') {
    should_escalate = true
    escalation_reason = 'Critical severity ticket'
    priority = 'urgent'
    assigned_queue = 'escalations'
  }

  // Rule 2: QA failed
  else if (!params.qa_passed) {
    should_escalate = true
    escalation_reason = 'QA check failed — response needs human review'
    priority = 'high'
    assigned_queue = 'qa_review'
  }

  // Rule 3: Low confidence in resolution
  else if (params.confidence < 0.6) {
    should_escalate = true
    escalation_reason = `Low confidence (${Math.round(params.confidence * 100)}%) — knowledge gap`
    priority = 'medium'
    assigned_queue = 'knowledge_gap'
  }

  // Rule 4: Resolution agent flagged it
  else if (params.resolution_needs_escalation) {
    should_escalate = true
    escalation_reason = params.resolution_escalation_reason || 'Resolution agent flagged for human review'
    priority = 'medium'
    assigned_queue = 'general'
  }

  // Rule 5: VIP + high severity
  else if (params.segment === 'vip' && (params.severity === 'high' || params.severity === 'critical')) {
    should_escalate = true
    escalation_reason = 'VIP customer with high severity — priority handling'
    priority = 'high'
    assigned_queue = 'vip_escalations'
  }

  // No escalation needed
  else {
    priority = params.severity === 'high' ? 'medium' : 'low'
    assigned_queue = 'auto_resolved'
  }

  await logAgentRun({
    agent_name: 'Escalation Agent',
    action: should_escalate ? `ESCALATE → ${assigned_queue}: ${escalation_reason}` : 'Auto-resolve',
    status: 'success',
    input: `severity:${params.severity} segment:${params.segment} confidence:${params.confidence}`,
    output: should_escalate ? escalation_reason : 'No escalation needed',
    confidence: 1.0, // Rule-based — always certain
    ticket_id: params.ticket_id,
    latency_ms: Date.now() - start,
  })

  return { should_escalate, escalation_reason, priority, assigned_queue }
}
