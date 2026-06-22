import { anthropic, HAIKU, logAgentRun } from '@/lib/anthropic'

export interface TriageResult {
  intent: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  segment: 'standard' | 'premium' | 'vip'
  confidence: number
  summary: string
}

// Strip markdown code fences Claude sometimes wraps JSON in
function parseJSON(text: string) {
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  return JSON.parse(cleaned)
}

export async function triageAgent(params: {
  ticket_id: string
  message: string
  channel: string
  customer_id: string
  past_issues?: string[]
}): Promise<TriageResult> {
  const start = Date.now()

  const systemPrompt = `You are a customer support triage agent for a matrimony platform (like Bharat Matrimony).
Your ONLY job: classify the customer's message.

Respond with ONLY valid JSON — no explanation, no markdown, no extra text.

JSON format:
{
  "intent": "snake_case_intent_name",
  "severity": "low|medium|high|critical",
  "segment": "standard|premium|vip",
  "confidence": 0.0_to_1.0,
  "summary": "One sentence summary of the issue"
}

Severity guide:
- critical: account locked, data breach, payment fraud
- high: payment done but service not delivered, account access blocked
- medium: feature not working, profile issues, preference problems
- low: general questions, how-to, feature requests

Segment guide (estimate from message tone/content if not provided):
- vip: mentions VIP, gold, platinum, or is very demanding
- premium: mentions premium, paid membership
- standard: free or unspecified user

Common intents: membership_activation, refund_request, profile_visibility,
photo_upload_error, preference_update, account_access, payment_issue,
match_not_found, contact_limit, subscription_renewal, general_inquiry`

  const userMessage = `Customer message: "${params.message}"
Channel: ${params.channel}
Customer ID: ${params.customer_id}
Past issues: ${params.past_issues?.join(', ') || 'none'}`

  try {
    const response = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 300,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const result: TriageResult = parseJSON(text)
    const latency = Date.now() - start

    await logAgentRun({
      agent_name: 'Triage Agent',
      action: `Classified intent: ${result.intent}`,
      status: 'success',
      input: params.message,
      output: text,
      confidence: result.confidence,
      ticket_id: params.ticket_id,
      latency_ms: latency,
      tokens_used: response.usage.input_tokens + response.usage.output_tokens,
    })

    return result
  } catch (err) {
    await logAgentRun({
      agent_name: 'Triage Agent',
      action: 'Classification failed',
      status: 'failure',
      input: params.message,
      output: String(err),
      ticket_id: params.ticket_id,
      latency_ms: Date.now() - start,
    })
    return { intent: 'general_inquiry', severity: 'medium', segment: 'standard', confidence: 0.3, summary: params.message }
  }
}
