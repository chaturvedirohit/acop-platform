-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 3 — pgvector semantic search for the Knowledge Agent
--
-- Run this ONCE in the Supabase SQL Editor (after the original schema.sql).
-- Plain English, step by step:
--   1. Turn on the "vector" extension so Postgres can store + compare embeddings
--   2. Add an "embedding" column to knowledge_base (384 numbers per article)
--   3. Create a search function that finds the closest articles to a query vector
--
-- 384 = the output size of the gte-small model we run in Next.js.
-- ─────────────────────────────────────────────────────────────────────────────

-- STEP 1: Enable the pgvector extension
create extension if not exists vector;

-- STEP 2: Add the embedding column (nullable — existing rows stay empty until backfilled)
alter table public.knowledge_base
  add column if not exists embedding vector(384);

-- STEP 3: Index for fast similarity search (cosine distance)
-- ivfflat is a good default; lists=100 is fine for a small knowledge base.
create index if not exists knowledge_base_embedding_idx
  on public.knowledge_base
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- STEP 4: The search function the Knowledge Agent calls.
-- Takes a query embedding, returns the top N most similar articles with a
-- similarity score (1.0 = identical meaning, 0.0 = unrelated).
create or replace function match_knowledge(
  query_embedding vector(384),
  match_count int default 3
)
returns table (
  id uuid,
  title text,
  content text,
  category text,
  similarity float
)
language sql stable
as $$
  select
    kb.id,
    kb.title,
    kb.content,
    kb.category,
    1 - (kb.embedding <=> query_embedding) as similarity
  from public.knowledge_base kb
  where kb.embedding is not null
  order by kb.embedding <=> query_embedding
  limit match_count;
$$;
