'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { BookOpen, Plus, Search, RefreshCw, Tag } from 'lucide-react'

interface Article {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  retrieval_count: number
  created_at: string
  updated_at: string
}

const CATEGORIES = ['all', 'SOP', 'FAQ', 'Product', 'Policy', 'Technical', 'Billing']

export default function KnowledgePage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [filtered, setFiltered] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [selected, setSelected] = useState<Article | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [newArticle, setNewArticle] = useState({ title: '', content: '', category: 'FAQ', tags: '' })
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('knowledge_base')
      .select('*')
      .order('retrieval_count', { ascending: false })
    if (data) { setArticles(data); setFiltered(data) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    let result = articles
    if (search) result = result.filter(a => a.title.toLowerCase().includes(search.toLowerCase()) || a.content.toLowerCase().includes(search.toLowerCase()))
    if (category !== 'all') result = result.filter(a => a.category === category)
    setFiltered(result)
  }, [search, category, articles])

  async function addArticle() {
    setSubmitting(true)
    // Goes through the API route so the article gets a semantic embedding on save
    await fetch('/api/add-article', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newArticle.title,
        content: newArticle.content,
        category: newArticle.category,
        tags: newArticle.tags.split(',').map(t => t.trim()).filter(Boolean),
      }),
    })
    setShowModal(false)
    setNewArticle({ title: '', content: '', category: 'FAQ', tags: '' })
    setSubmitting(false)
    load()
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Knowledge Base</h1>
          <p className="text-slate-500 text-sm mt-1">{filtered.length} articles · RAG retrieval source</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
            <Plus size={14} /> Add Article
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search knowledge base..." className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        </div>
        <select value={category} onChange={e => setCategory(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none">
          {CATEGORIES.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 space-y-3">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-sm">Loading articles...</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <BookOpen size={36} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 text-sm">No articles yet. Add SOPs, FAQs, and product docs to power the Knowledge Agent.</p>
            </div>
          ) : filtered.map(article => (
            <button key={article.id} onClick={() => setSelected(article)} className={`w-full text-left bg-white rounded-xl border p-4 shadow-sm transition-all hover:shadow-md ${selected?.id === article.id ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="font-semibold text-slate-800 text-sm line-clamp-2">{article.title}</p>
                <span className="shrink-0 text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">{article.category}</span>
              </div>
              <p className="text-xs text-slate-400 line-clamp-2 mb-2">{article.content}</p>
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {(article.tags || []).slice(0, 2).map(tag => (
                    <span key={tag} className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{tag}</span>
                  ))}
                </div>
                <span className="text-xs text-slate-400 flex items-center gap-1"><Tag size={10} />{article.retrieval_count} retrievals</span>
              </div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2">
          {selected ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sticky top-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">{selected.category}</span>
                  <h2 className="text-xl font-bold text-slate-900 mt-2">{selected.title}</h2>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <p>{selected.retrieval_count} retrievals</p>
                  <p className="mt-0.5">{new Date(selected.updated_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap border-t border-slate-100 pt-4">
                {selected.content}
              </div>
              {selected.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-slate-100">
                  {selected.tags.map(tag => (
                    <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 h-64 flex items-center justify-center">
              <div className="text-center text-slate-400">
                <BookOpen size={32} className="mx-auto mb-2" />
                <p className="text-sm">Select an article to read</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Add Knowledge Article</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                <input value={newArticle.title} onChange={e => setNewArticle(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Membership Activation SOP" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select value={newArticle.category} onChange={e => setNewArticle(p => ({ ...p, category: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none">
                  {['SOP', 'FAQ', 'Product', 'Policy', 'Technical', 'Billing'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Content *</label>
                <textarea value={newArticle.content} onChange={e => setNewArticle(p => ({ ...p, content: e.target.value }))} rows={5} placeholder="Write the article content here..." className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tags (comma-separated)</label>
                <input value={newArticle.tags} onChange={e => setNewArticle(p => ({ ...p, tags: e.target.value }))} placeholder="membership, activation, payment" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={addArticle} disabled={!newArticle.title || !newArticle.content || submitting} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                {submitting ? 'Saving...' : 'Add Article'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
