import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { embed } from '@/lib/embeddings'

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/add-article
//
// Adds a knowledge base article AND generates its embedding in one step, so it's
// immediately searchable by the semantic Knowledge Agent. Embedding must happen
// server-side (the gte-small model runs in Node), which is why this is an API
// route rather than a direct browser insert.
// ─────────────────────────────────────────────────────────────────────────────

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { title: string; content: string; category?: string; tags?: string[] }
  try {
    body = await request.json()
    if (!body.title || !body.content) throw new Error('Missing title or content')
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Generate the embedding from title + content
  let embedding: number[] | null = null
  // Only embed when semantic search is enabled (the model is too heavy for
  // Vercel's free tier). Otherwise the article saves and is found by keyword.
  if (process.env.ENABLE_SEMANTIC_SEARCH === 'true') {
    try {
      embedding = await embed(`${body.title}\n\n${body.content}`)
    } catch (e) {
      console.error('Embedding failed (article will still save, searchable by keyword):', e)
    }
  }

  const { error } = await supabase.from('knowledge_base').insert({
    title: body.title,
    content: body.content,
    category: body.category || 'FAQ',
    tags: body.tags || [],
    retrieval_count: 0,
    embedding,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, embedded: embedding !== null })
}
