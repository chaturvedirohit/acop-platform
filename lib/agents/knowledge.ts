import { logAgentRun } from '@/lib/anthropic'
import { embed } from '@/lib/embeddings'

// ─────────────────────────────────────────────────────────────────────────────
// AGENT 3 — KNOWLEDGE AGENT  (Phase 3: semantic search via pgvector)
//
// HOW RAG WORKS NOW (plain English):
// 1. Take the ticket message + intent + root cause
// 2. Turn that into a 384-number embedding with the gte-small model
// 3. Ask Postgres (via the match_knowledge function) for the 3 articles whose
//    embeddings are closest in meaning — NOT just matching keywords
// 4. Return them as "context" for the Resolution Agent
//
// Why this beats the old keyword search: a ticket saying "membership not working"
// now finds an article titled "Activation failure troubleshooting" because their
// MEANINGS are close, even though they share no words.
//
// Fallback: if no articles have embeddings yet (backfill not run), we fall back
// to the old ilike keyword search so the pipeline never breaks.
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
  method: 'semantic' | 'keyword' | 'none'
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

    // ── SEMANTIC SEARCH (primary) ──────────────────────────────────────────
    // Build a query string from everything we know, embed it, find nearest.
    const queryText = `${params.message} | ${params.intent.replace(/_/g, ' ')} | ${params.root_cause.replace(/_/g, ' ')}`

    let articles: any[] = []
    let method: KnowledgeResult['method'] = 'none'

    try {
      const queryEmbedding = await embed(queryText)
      const { data, error } = await supabase.rpc('match_knowledge', {
        query_embedding: queryEmbedding,
        match_count: 3,
      })
      if (error) throw error
      if (data && data.length > 0) {
        articles = data.map((a: any) => ({
          ...a,
          relevance_reason: `Semantic match (${Math.round(a.similarity * 100)}% similar in meaning)`,
        }))
        method = 'semantic'
      }
    } catch (semanticErr) {
      // Vector search unavailable (extension off, no embeddings, etc.) — log and fall through
      console.error('Semantic search failed, falling back to keyword:', semanticErr)
    }

    // ── KEYWORD SEARCH (fallback) ──────────────────────────────────────────
    if (articles.length === 0) {
      const intentWords = params.intent.replace(/_/g, ' ').split(' ')
      const messageWords = params.message.toLowerCase().split(' ').filter(w => w.length > 4).slice(0, 5)
      const searchTerms = [...new Set([...intentWords, ...messageWords])]
      const seen = new Set<string>()

      for (const term of searchTerms.slice(0, 4)) {
        if (articles.length >= 3) break
        const { data } = await supabase
          .from('knowledge_base')
          .select('id, title, content, category')
          .or(`title.ilike.%${term}%,content.ilike.%${term}%`)
          .limit(2)
        if (data) {
          for (const article of data) {
            if (!seen.has(article.id) && articles.length < 3) {
              seen.add(article.id)
              articles.push({ ...article, relevance_reason: `Keyword match: "${term}"` })
            }
          }
        }
      }
      if (articles.length > 0) method = 'keyword'
    }

    // Bump retrieval_count for whatever we returned (best-effort)
    for (const a of articles) {
      const { data: cur } = await supabase.from('knowledge_base').select('retrieval_count').eq('id', a.id).single()
      await supabase.from('knowledge_base').update({ retrieval_count: (cur?.retrieval_count || 0) + 1 }).eq('id', a.id)
    }

    // Format context for the Resolution Agent
    const context_text = articles.length > 0
      ? articles.map((a, i) => `[Article ${i + 1}: ${a.title}]\n${a.content}`).join('\n\n---\n\n')
      : 'No relevant knowledge base articles found. Use general best practices.'

    const result: KnowledgeResult = {
      articles: articles.map(a => ({
        id: a.id,
        title: a.title,
        content: a.content,
        category: a.category,
        relevance_reason: a.relevance_reason,
      })),
      context_text,
      method,
    }

    await logAgentRun({
      agent_name: 'Knowledge Agent',
      action: `Retrieved ${articles.length} articles (${method}) for intent: ${params.intent}`,
      status: 'success',
      input: queryText,
      output: articles.map(a => a.title).join(', ') || 'No articles found',
      confidence: method === 'semantic' ? 0.92 : method === 'keyword' ? 0.7 : 0.4,
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
    return { articles: [], context_text: 'Knowledge retrieval unavailable.', method: 'none' }
  }
}
