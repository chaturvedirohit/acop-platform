import { logAgentRun } from '@/lib/anthropic'

// ─────────────────────────────────────────────────────────────────────────────
// AGENT 3 — KNOWLEDGE AGENT
//
// Job: Search the knowledge base and return the most relevant articles.
//
// HOW RAG WORKS (plain English):
// 1. Take the ticket message + intent
// 2. Search the knowledge_base table for articles that match
// 3. Return the top 3 most relevant articles as "context"
// 4. The Resolution Agent then uses these articles to write its response
//
// Phase 2: PostgreSQL full-text search (fast, no extra setup needed)
// Phase 3: Upgrade to pgvector embeddings for semantic search
//           (finds "activation failure" when searching "membership not working")
// ─────────────────────────────────────────────────────────────────────────────

export interface KnowledgeResult {
  articles: Array<{
    id: string
    title: string
    content: string
    category: string
    relevance_reason: string
  }>
  context_text: string  // pre-formatted for the Resolution Agent
}

export async function knowledgeAgent(params: {
  ticket_id: string
  message: string
  intent: string
  root_cause: string
}): Promise<KnowledgeResult> {
  const start = Date.now()

  try {
    const { createClient } = await import('@/lib/supabase-server')
    const supabase = await createClient()

    // Build search terms from intent and message
    // e.g. "membership_activation" → ["membership", "activation"]
    const intentWords = params.intent.replace(/_/g, ' ').split(' ')
    const rootCauseWords = params.root_cause.replace(/_/g, ' ').split(' ')
    const messageWords = params.message.toLowerCase().split(' ')
      .filter(w => w.length > 4) // skip short words like "the", "and"
      .slice(0, 5)

    const searchTerms = [...new Set([...intentWords, ...rootCauseWords, ...messageWords])]

    // Search knowledge base — try each search term and collect unique results
    const seen = new Set<string>()
    const articles: any[] = []

    for (const term of searchTerms.slice(0, 4)) {
      if (articles.length >= 3) break
      const { data } = await supabase
        .from('knowledge_base')
        .select('id, title, content, category, tags, retrieval_count')
        .or(`title.ilike.%${term}%,content.ilike.%${term}%,tags.cs.{${term}}`)
        .limit(2)

      if (data) {
        for (const article of data) {
          if (!seen.has(article.id) && articles.length < 3) {
            seen.add(article.id)
            articles.push(article)
            // Increment retrieval count
            await supabase
              .from('knowledge_base')
              .update({ retrieval_count: (article.retrieval_count || 0) + 1 })
              .eq('id', article.id)
          }
        }
      }
    }

    // Format context for Resolution Agent
    const context_text = articles.length > 0
      ? articles.map((a, i) =>
          `[Article ${i + 1}: ${a.title}]\n${a.content}`
        ).join('\n\n---\n\n')
      : 'No relevant knowledge base articles found. Use general best practices.'

    const result: KnowledgeResult = {
      articles: articles.map(a => ({
        id: a.id,
        title: a.title,
        content: a.content,
        category: a.category,
        relevance_reason: `Matched search terms from intent: ${params.intent}`,
      })),
      context_text,
    }

    await logAgentRun({
      agent_name: 'Knowledge Agent',
      action: `Retrieved ${articles.length} articles for intent: ${params.intent}`,
      status: 'success',
      input: `${params.intent} | ${params.root_cause}`,
      output: articles.map(a => a.title).join(', ') || 'No articles found',
      confidence: articles.length > 0 ? 0.85 : 0.4,
      ticket_id: params.ticket_id,
      latency_ms: Date.now() - start,
    })

    return result
  } catch (err) {
    await logAgentRun({
      agent_name: 'Knowledge Agent',
      action: 'Knowledge retrieval failed',
      status: 'failure',
      output: String(err),
      ticket_id: params.ticket_id,
      latency_ms: Date.now() - start,
    })
    return { articles: [], context_text: 'Knowledge retrieval unavailable.' }
  }
}
