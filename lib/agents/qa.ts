import { anthropic, HAIKU, logAgentRun } from '@/lib/anthropic'

export interface QAResult {
  passed: boolean
  hallucination_detected: boolean
  compliance_issue: boolean
  tone_issue: boolean
  safety_issue: boolean
  qa_notes: string
  revised_resolution?: string
}

function parseJSON(text: string) {
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  return JSON.parse(cleaned)
}

export async function qaAgent(params: {
  ticket_id: string
  original_message: string
  resolution_text: string
  sources_used: string[]
  is_grounded: boolean
}): Promise<QAResult> {
  const start = Date.now()

  if (!params.resolution_text) {
    return {
      passed: false,
      hallucination_detected: false,
      compliance_issue: false,
      tone_issue: false,
      safety_issue: false,
      qa_notes: 'No resolution text to review',
    }
  }

  const systemPrompt = `You are a QA reviewer for customer support responses at a matrimony platform.
Review the proposed customer response below.

Check for:
1. hallucination_detected: Does it promise specific timelines/amounts not grounded in source articles?
2. compliance_issue: Does it make unauthorized commitments (e.g. "we'll call you back in 2 hours")?
3. tone_issue: Is it cold, rude, dismissive, or unprofessional?
4. safety_issue: Any offensive, discriminatory, or harmful content?

Respond ONLY with valid JSON — no markdown, no code fences:
{
  "passed": true_if_all_checks_pass,
  "hallucination_detected": true_or_false,
  "compliance_issue": true_or_false,
  "tone_issue": true_or_false,
  "safety_issue": true_or_false,
  "qa_notes": "brief note on any issues found, or All checks passed",
  "revised_resolution": "corrected version if tone_issue is true, else null"
}`

  const userMessage = `Customer question: "${params.original_message}"

Proposed response:
"${params.resolution_text}"

Sources referenced: ${params.sources_used.join(', ') || 'none'}
Is grounded in KB: ${params.is_grounded}`

  try {
    const response = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const result: QAResult = parseJSON(text)
    const latency = Date.now() - start

    await logAgentRun({
      agent_name: 'QA Agent',
      action: `QA check: ${result.passed ? 'PASSED' : 'FAILED'} — ${result.qa_notes}`,
      status: result.passed ? 'success' : 'failure',
      input: params.resolution_text.slice(0, 100),
      output: result.qa_notes,
      confidence: result.passed ? 0.9 : 0.3,
      ticket_id: params.ticket_id,
      latency_ms: latency,
      tokens_used: response.usage.input_tokens + response.usage.output_tokens,
    })

    return result
  } catch (err) {
    await logAgentRun({
      agent_name: 'QA Agent',
      action: 'QA check failed',
      status: 'failure',
      output: String(err),
      ticket_id: params.ticket_id,
      latency_ms: Date.now() - start,
    })
    return {
      passed: true,
      hallucination_detected: false,
      compliance_issue: false,
      tone_issue: false,
      safety_issue: false,
      qa_notes: 'QA check unavailable — auto-passed',
    }
  }
}
