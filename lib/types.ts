export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'escalated' | 'closed'
export type TicketSeverity = 'low' | 'medium' | 'high' | 'critical'
export type TicketChannel = 'email' | 'chat' | 'whatsapp' | 'voice' | 'crm' | 'app'
export type CustomerSegment = 'standard' | 'premium' | 'vip'
export type AgentStatus = 'active' | 'idle' | 'error'
export type EscalationStatus = 'pending' | 'approved' | 'rejected' | 'resolved'

export interface Ticket {
  id: string
  ticket_id: string
  customer_id: string
  channel: TicketChannel
  message: string
  intent: string | null
  severity: TicketSeverity
  segment: CustomerSegment
  status: TicketStatus
  root_cause: string | null
  confidence: number | null
  created_at: string
  updated_at: string
  customers?: Customer
}

export interface Customer {
  id: string
  customer_id: string
  name: string
  email: string
  segment: CustomerSegment
  past_issues: string[]
  created_at: string
}

export interface AgentLog {
  id: string
  agent_name: string
  action: string
  confidence: number | null
  status: 'success' | 'failure' | 'pending'
  input: string | null
  output: string | null
  ticket_id: string | null
  latency_ms: number | null
  tokens_used: number | null
  created_at: string
}

export interface Escalation {
  id: string
  ticket_id: string
  reason: string
  status: EscalationStatus
  reviewer_notes: string | null
  resolution: string | null
  created_at: string
  resolved_at: string | null
  tickets?: Ticket
}

export interface KnowledgeArticle {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  retrieval_count: number
  created_at: string
  updated_at: string
}

export interface Resolution {
  id: string
  ticket_id: string
  resolution_text: string
  root_cause: string | null
  accepted: boolean | null
  csat_score: number | null
  created_at: string
}

export interface DashboardMetrics {
  total_tickets: number
  open_tickets: number
  resolved_today: number
  escalated: number
  automation_rate: number
  avg_confidence: number
  csat_avg: number
  fcr_rate: number
}
