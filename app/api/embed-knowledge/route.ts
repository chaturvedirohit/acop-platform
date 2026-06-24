import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { embed } from '@/lib/embeddings'

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/embed-knowledge
//
// Backfill: generate embeddings for every knowledge_base article that doesn't
// have one yet. Run this once after the SQL migration, and again any time you
// bulk-import articles. Embedding-on-insert (the knowledge page) handles new
// single articles automatically — this is the catch-up tool.
//
// Loading the gte-small model takes a few seconds on the first call, so give
// the route generous time.
// ─────────────────────────────────────────────────────────────────────────────

export const maxDuration = 60

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Find articles still missing an embedding
  const { data: articles, error } = await supabase
    .from('knowledge_base')
    .select('id, title, content')
    .is('embedding', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!articles || articles.length === 0) {
    return NextResponse.json({ success: true, embedded: 0, message: 'All articles already embedded.' })
  }

  let embedded = 0
  const failures: string[] = []

  for (const article of articles) {
    try {
      // Embed title + content together so the vector captures the whole article
      const vector = await embed(`${article.title}\n\n${article.content}`)
      const { error: updateErr } = await supabase
        .from('knowledge_base')
        .update({ embedding: vector })
        .eq('id', article.id)
      if (updateErr) throw updateErr
      embedded++
    } catch (e) {
      failures.push(`${article.title}: ${String(e)}`)
    }
  }

  return NextResponse.json({
    success: true,
    embedded,
    total: articles.length,
    failures: failures.length > 0 ? failures : undefined,
  })
}
