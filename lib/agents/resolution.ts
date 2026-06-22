import { anthropic, SONNET, logAgentRun } from '@/lib/anthropic'

export interface ResolutionResult {
  resolution_text: string
  confidence: number
  is_grounded: boolean
  sources_used: string[]
  needs_escalation: boolean
  escalation_reason?: string
}

function parseJSON(text: string) {
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  return JSON.parse(cleaned)
}

export async function resolutionAgent(params: {
  ticket_id: string
  message: string
  intent: string
  root_cause: string
  severity: string
  segment: string
  context_text: string
  article_titles: string[]
}): Promise<ResolutionResult> {
  const start = Date.now()

  const systemPrompt = `You are a customer support resolution agent for a matrimony platform.
Your job: write a professional, empathetic response to the customer.

CRITICAL RULES:
1. Your response MUST be based on the knowledge base articles provided below
2. Never promise things not in the articles (e.g. "we'll refund in 1 hour" unless article says so)
3. Be warm and professional — not robotic
4. Keep response under 150 words
5. If the articles don't have enough information, set needs_escalation to true

Respond with ONLY valid JSON — no markdown, no code fences:
{
  "resolution_text": "The actual response to send the customer",
  "confidence": 0.0_to_1.0,
  "is_grounded": true_or_false,
  "sources_used": ["article titles used"],
  "needs_escalation": true_or_false,
  "escalation_reason": "reason if needs_escalation is true, else null"
}

KNOWLEDGE BASE ARTICLES:
${params.context_text}`

  const userMessage = `Customer message: "${params.message}"
Issue type: ${params.intent}
Root cause: ${params.root_cause}
Severity: ${params.severity}
Customer segment: ${params.segment}

Write a resolution response based only on the knowledge base articles above.`

  try {
    const response = await anthropic.messages.create({
      model: SONNET,
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const result: ResolutionResult = parseJSON(text)
    const latency = Date.now() - start

    await logAgentRun({
      agent_name: 'Resolution Agent',
      action: `Generated resolution (grounded: ${result.is_grounded})`,
      status: 'success',
      input: `${params.intent} | ${params.root_cause}`,
      output: result.resolution_text,
      confidence: result.confidence,
      ticket_id: params.ticket_id,
      latency_ms: latency,
      tokens_used: response.usage.input_tokens + response.usage.output_tokens,
    })

    return result
  } catch (err) {
    await logAgentRun({
      agent_name: 'Resolution Agent',
      action: 'Resolution generation failed',
      status: 'failure',
      output: String(err),
      ticket_id: params.ticket_id,
      latency_ms: Date.now() - start,
    })
    return {
      resolution_text: '',
      confidence: 0,
      is_grounded: false,
      sources_used: [],
      needs_escalation: true,
      escalation_reason: 'Resolution agent failed — manual response required',
    }
  }
}
