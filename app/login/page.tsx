'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Zap, Eye, EyeOff, Bot, ShieldCheck, BarChart3 } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    const supabase = createClient()

    if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) { setError(error.message) } else { setMessage('Password reset link sent. Check your email, then click the link to set a new password.') }
    } else if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) { setError(error.message) } else { setMessage('Check your email to confirm your account, then sign in.') }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message) } else { router.push('/dashboard') }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex">

      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex-col justify-between p-12">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-bold text-white text-lg">Reso</span>
        </Link>

        <div>
          <h2 className="text-3xl font-bold text-white mb-4 leading-snug">
            Customer support<br />that resolves itself
          </h2>
          <p className="text-slate-400 text-base mb-10 leading-relaxed">
            7 AI agents work in a pipeline to triage, diagnose, and resolve tickets automatically — in under 8 seconds.
          </p>
          <div className="space-y-4">
            {[
              { icon: Bot, text: '7 specialized AI agents in one pipeline' },
              { icon: ShieldCheck, text: 'Hallucination-free — every response grounded in your KB' },
              { icon: BarChart3, text: 'Full observability — confidence, latency, tokens tracked' },
            ].map(item => (
              <div key={item.text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                  <item.icon size={15} className="text-indigo-400" />
                </div>
                <p className="text-slate-300 text-sm">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-slate-600 text-xs">Built with Anthropic Claude · Supabase · Vercel</p>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50">

        {/* Mobile logo */}
        <Link href="/" className="flex items-center gap-2 mb-8 lg:hidden">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-bold text-slate-900 text-lg">Reso</span>
        </Link>

        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-1">
              {mode === 'signin' ? 'Welcome back' : mode === 'signup' ? 'Create account' : 'Reset password'}
            </h1>
            <p className="text-slate-500 text-sm mb-7">
              {mode === 'signin' ? 'Sign in to your Reso dashboard' : mode === 'signup' ? 'Set up your Reso workspace in seconds' : 'Enter your email and we\'ll send you a reset link'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@company.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50"
                />
              </div>
              {mode !== 'forgot' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-slate-700">Password</label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => { setMode('forgot'); setError(''); setMessage('') }}
                        className="text-xs text-indigo-600 hover:underline font-medium"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={8}
                      placeholder="Min 8 characters"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50 pr-10"
                    />
                    <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              )}

              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}
              {message && <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-3 py-2">{message}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-60 transition-colors mt-1"
              >
                {loading ? 'Please wait...' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
              </button>
            </form>

            <div className="mt-5 text-center">
              {mode === 'forgot' ? (
                <button
                  onClick={() => { setMode('signin'); setError(''); setMessage('') }}
                  className="text-sm text-indigo-600 hover:underline font-medium"
                >
                  Back to sign in
                </button>
              ) : (
                <button
                  onClick={() => { setMode(m => m === 'signin' ? 'signup' : 'signin'); setError(''); setMessage('') }}
                  className="text-sm text-indigo-600 hover:underline font-medium"
                >
                  {mode === 'signin' ? "Don't have an account? Sign up free" : 'Already have an account? Sign in'}
                </button>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-5">
            No credit card required · Free plan available
          </p>
        </div>
      </div>

    </div>
  )
}
