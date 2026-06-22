'use client'

import Link from 'next/link'
import { Bot, Zap, ShieldCheck, BarChart3, ArrowRight, CheckCircle2, Star } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <span className="font-bold text-slate-900 text-lg">Reso</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900 font-medium">Sign in</Link>
            <Link href="/login" className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors">
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="pt-32 pb-20 px-6 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-500/30 rounded-full px-4 py-1.5 text-sm text-indigo-300 mb-6">
            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></span>
            7 AI agents working in real-time
          </div>
          <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6 bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
            Customer support<br />that resolves itself
          </h1>
          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Reso uses 7 specialized AI agents to automatically triage, diagnose, and resolve customer tickets — with 88% confidence, in seconds.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login" className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-7 py-3.5 rounded-xl font-semibold text-base transition-colors">
              Start for free <ArrowRight size={16} />
            </Link>
            <Link href="/login" className="flex items-center gap-2 border border-slate-600 hover:border-slate-400 text-slate-300 px-7 py-3.5 rounded-xl font-medium text-base transition-colors">
              View live demo
            </Link>
          </div>
          <p className="text-slate-500 text-sm mt-5">No credit card required · Free forever plan available</p>
        </div>

        {/* Hero stats */}
        <div className="max-w-3xl mx-auto mt-16 grid grid-cols-3 gap-6">
          {[
            { value: '88%', label: 'Avg AI confidence' },
            { value: '< 8s', label: 'Resolution time' },
            { value: '7', label: 'Specialized agents' },
          ].map(s => (
            <div key={s.label} className="text-center bg-white/5 border border-white/10 rounded-2xl py-6">
              <div className="text-3xl font-bold text-white mb-1">{s.value}</div>
              <div className="text-sm text-slate-400">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── LOGOS ── */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sm text-slate-400 mb-6 uppercase tracking-widest font-medium">Built with enterprise-grade technology</p>
          <div className="flex flex-wrap items-center justify-center gap-8 text-slate-400 font-semibold text-sm">
            {['Anthropic Claude', 'Supabase', 'Next.js 14', 'Vercel', 'PostgreSQL', 'TypeScript'].map(t => (
              <span key={t} className="px-4 py-2 bg-white border border-slate-200 rounded-lg">{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Everything your support team needs</h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">Reso handles the repetitive work so your team focuses on what matters.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Bot, color: 'bg-indigo-50 text-indigo-600', title: 'Multi-agent pipeline', desc: '7 AI agents chain together — triage, root cause, knowledge search, resolution, QA, escalation, and insights.' },
              { icon: Zap, color: 'bg-violet-50 text-violet-600', title: 'Instant resolution', desc: 'Tickets are classified and resolved in under 8 seconds. No queue. No waiting. Answers grounded in your knowledge base.' },
              { icon: ShieldCheck, color: 'bg-green-50 text-green-600', title: 'Hallucination-free', desc: 'Every response is grounded in your knowledge base articles. QA agent checks for compliance and brand tone before sending.' },
              { icon: BarChart3, color: 'bg-amber-50 text-amber-600', title: 'Live observability', desc: 'Every agent run is logged with confidence score, latency, and token usage. Full audit trail, always.' },
              { icon: CheckCircle2, color: 'bg-teal-50 text-teal-600', title: 'Human-in-the-loop', desc: 'Low confidence? VIP customer? Escalation agent routes to your human review queue with AI context pre-filled.' },
              { icon: Star, color: 'bg-rose-50 text-rose-600', title: 'Omnichannel ready', desc: 'Handles tickets from email, chat, WhatsApp, voice, CRM, and app — all in one unified queue.' },
            ].map(f => (
              <div key={f.title} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md hover:border-indigo-200 transition-all">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                  <f.icon size={20} />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-24 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">How Reso works</h2>
            <p className="text-slate-500 text-lg">A ticket comes in. 7 agents run. Customer gets an answer.</p>
          </div>
          <div className="space-y-4">
            {[
              { num: '01', agent: 'Triage Agent', desc: 'Reads the ticket and classifies intent, severity, and customer segment in under 1 second.' },
              { num: '02', agent: 'Root Cause Agent', desc: 'Diagnoses why the problem happened — payment callback? Profile setting? Technical error?' },
              { num: '03', agent: 'Knowledge Agent', desc: 'Searches your knowledge base for the top 3 most relevant articles to ground the response.' },
              { num: '04', agent: 'Resolution Agent', desc: 'Writes a warm, professional response to the customer — backed only by what the articles say.' },
              { num: '05', agent: 'QA Agent', desc: 'Checks the response for hallucinations, compliance issues, and tone before it goes anywhere.' },
              { num: '06', agent: 'Escalation Agent', desc: 'Hard rules decide: auto-resolve or send to human review? VIP + high severity always escalates.' },
              { num: '07', agent: 'Insights Agent', desc: 'Logs the entire run — latency, confidence, tokens — and updates the ticket status automatically.' },
            ].map((step, i) => (
              <div key={step.num} className="flex gap-4 bg-white border border-slate-200 rounded-xl p-5">
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">{step.num}</div>
                <div>
                  <p className="font-semibold text-slate-900">{step.agent}</p>
                  <p className="text-slate-500 text-sm mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Simple pricing</h2>
            <p className="text-slate-500 text-lg">Start free. Scale as you grow.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'Starter', price: 'Free', desc: 'Perfect for trying out Reso', features: ['Up to 20 AI runs/day', '5 screens included', 'Knowledge base', 'Agent monitor', 'Community support'] },
              { name: 'Growth', price: '₹2,499', period: '/month', desc: 'For growing support teams', features: ['Unlimited AI runs', 'Priority processing', 'Custom knowledge base', 'API access', 'Email support'], highlight: true },
              { name: 'Enterprise', price: 'Custom', desc: 'For large-scale operations', features: ['Custom daily limits', 'SLA guarantees', 'Dedicated agents', 'SSO + audit logs', '24/7 support'] },
            ].map(plan => (
              <div key={plan.name} className={`rounded-2xl p-6 border ${plan.highlight ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-slate-200 bg-white'}`}>
                <p className={`text-sm font-semibold mb-1 ${plan.highlight ? 'text-indigo-200' : 'text-slate-500'}`}>{plan.name}</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className={`text-3xl font-bold ${plan.highlight ? 'text-white' : 'text-slate-900'}`}>{plan.price}</span>
                  {plan.period && <span className={`text-sm ${plan.highlight ? 'text-indigo-200' : 'text-slate-500'}`}>{plan.period}</span>}
                </div>
                <p className={`text-sm mb-5 ${plan.highlight ? 'text-indigo-200' : 'text-slate-500'}`}>{plan.desc}</p>
                <ul className="space-y-2.5 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className={`flex items-center gap-2 text-sm ${plan.highlight ? 'text-indigo-100' : 'text-slate-600'}`}>
                      <CheckCircle2 size={14} className={plan.highlight ? 'text-indigo-300' : 'text-green-500'} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/login" className={`block text-center py-2.5 rounded-xl text-sm font-semibold transition-colors ${plan.highlight ? 'bg-white text-indigo-600 hover:bg-indigo-50' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                  {plan.price === 'Free' ? 'Get started free' : plan.price === 'Custom' ? 'Contact us' : 'Start free trial'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6 bg-gradient-to-br from-indigo-600 to-violet-700">
        <div className="max-w-2xl mx-auto text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to resolve faster?</h2>
          <p className="text-indigo-200 text-lg mb-8">Join teams using AI agents to handle customer support automatically. No coding required.</p>
          <Link href="/login" className="inline-flex items-center gap-2 bg-white text-indigo-700 px-8 py-3.5 rounded-xl font-semibold hover:bg-indigo-50 transition-colors">
            Get started free <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-8 px-6 border-t border-slate-100 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Zap size={13} className="text-white" />
            </div>
            <span className="font-bold text-slate-900">Reso</span>
            <span className="text-slate-400 text-sm ml-2">AI-Powered Customer Support</span>
          </div>
          <p className="text-slate-400 text-sm">Built with Claude API · Supabase · Vercel</p>
        </div>
      </footer>

    </div>
  )
}
