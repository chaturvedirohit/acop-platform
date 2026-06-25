'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Zap, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

// ─────────────────────────────────────────────────────────────────────────────
// /reset-password
//
// Where the email reset link lands. Supabase puts a temporary recovery session
// in the URL when the user arrives, so updateUser({ password }) is allowed here
// even though they never typed their old password.
// ─────────────────────────────────────────────────────────────────────────────

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [done, setDone] = useState(false)
  const router = useRouter()

  // Establish the recovery session from the email link, then confirm it exists.
  // Newer Supabase links carry a "?code=" param that must be exchanged for a
  // session; older links put tokens in the URL hash (handled automatically).
  useEffect(() => {
    const supabase = createClient()

    async function init() {
      const code = new URLSearchParams(window.location.search).get('code')
      if (code) {
        try {
          await supabase.auth.exchangeCodeForSession(code)
          // Clean the code out of the URL so a refresh doesn't re-trigger it
          window.history.replaceState({}, '', '/reset-password')
        } catch {
          // fall through to the session check below
        }
      }

      const { data } = await supabase.auth.getSession()
      if (data.session) setReady(true)
      else setError('This reset link is invalid or has expired. Request a new one from the sign-in page.')
    }

    init()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
    } else {
      setDone(true)
      setTimeout(() => router.push('/dashboard'), 1500)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-bold text-slate-900 text-lg">Reso</span>
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Set a new password</h1>
          <p className="text-slate-500 text-sm mb-7">Choose a strong password you'll remember.</p>

          {done ? (
            <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-3 py-2">
              Password updated. Redirecting to your dashboard...
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">New password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={8}
                    disabled={!ready}
                    placeholder="Min 8 characters"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50 pr-10 disabled:opacity-50"
                  />
                  <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm password</label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  minLength={8}
                  disabled={!ready}
                  placeholder="Re-enter password"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50 disabled:opacity-50"
                />
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

              <button
                type="submit"
                disabled={loading || !ready}
                className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-60 transition-colors mt-1"
              >
                {loading ? 'Updating...' : 'Update password'}
              </button>
            </form>
          )}

          <div className="mt-5 text-center">
            <Link href="/login" className="text-sm text-indigo-600 hover:underline font-medium">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
