import Anthropic from '@anthropic-ai/sdk'

// Single shared Anthropic client — server-side only (never exposed to browser)
// ANTHROPIC_API_KEY is set in .env.local and Vercel env vars
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Model constants — Haiku for fast/cheap tasks, Sonnet for quality tasks
export const HAIKU  = 'claude-haiku-4-5-20251001'   // fast, cheap — classification
export const SONNET = 'claude-sonnet-4-6'            // quality — generation

// Helper: log an agent run to Supabase
export async function logAgentRun(params: {
  agent_name: string
  action: string
  status: 'success' | 'failure' | 'pending'
  input?: string
  output?: string
  confidence?: number
  ticket_id?: string
  latency_ms?: number
  tokens_used?: number
}) {
  // Dynamic import to avoid circular dependency
  const { createClient } = await import('@/lib/supabase-server')
  const supabase = await createClient()
  await supabase.from('agent_logs').insert(params)
}
