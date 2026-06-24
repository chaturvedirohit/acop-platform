import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers'

// ─────────────────────────────────────────────────────────────────────────────
// EMBEDDINGS — turn text into a 384-number vector that captures its meaning.
//
// Plain English:
// We run a small open-source model called "gte-small" right here in Node.
// It reads a sentence and outputs 384 numbers. Sentences with similar meaning
// get similar numbers — that's what makes semantic search work.
//
// No API key, no cost. The model (~120MB) downloads to a temp folder on the
// first call and is reused after that.
//
// Anthropic's Claude does NOT do embeddings — only text generation — which is
// why we use this separate model instead of the ANTHROPIC_API_KEY.
// ─────────────────────────────────────────────────────────────────────────────

const MODEL = 'Supabase/gte-small'

// Cache the loaded model across requests (it's expensive to load).
let extractorPromise: Promise<FeatureExtractionPipeline> | null = null

function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline('feature-extraction', MODEL)
  }
  return extractorPromise
}

// Turn one piece of text into a 384-dim embedding (a plain number array).
export async function embed(text: string): Promise<number[]> {
  const extractor = await getExtractor()
  // mean pooling + normalize is the standard recipe for sentence embeddings
  const output = await extractor(text, { pooling: 'mean', normalize: true })
  return Array.from(output.data as Float32Array)
}
