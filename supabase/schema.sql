-- ============================================================
-- ACOP Platform — Complete Database Schema
-- Paste this entire file into Supabase SQL Editor and click Run
-- ============================================================

-- CUSTOMERS
create table if not exists public.customers (
  id            uuid primary key default gen_random_uuid(),
  customer_id   text not null unique,
  name          text not null default '',
  email         text not null default '',
  segment       text not null default 'standard' check (segment in ('standard', 'premium', 'vip')),
  past_issues   text[] not null default '{}',
  created_at    timestamptz not null default now()
);

alter table public.customers enable row level security;

create policy "Users can view all customers"
  on public.customers for select
  to authenticated using (true);

create policy "Users can insert customers"
  on public.customers for insert
  to authenticated with check (true);

create policy "Users can update customers"
  on public.customers for update
  to authenticated using (true);


-- TICKETS
create table if not exists public.tickets (
  id            uuid primary key default gen_random_uuid(),
  ticket_id     text not null unique,
  customer_id   text not null,
  channel       text not null default 'chat' check (channel in ('email','chat','whatsapp','voice','crm','app')),
  message       text not null,
  intent        text,
  severity      text not null default 'medium' check (severity in ('low','medium','high','critical')),
  segment       text not null default 'standard' check (segment in ('standard','premium','vip')),
  status        text not null default 'open' check (status in ('open','in_progress','resolved','escalated','closed')),
  root_cause    text,
  confidence    float check (confidence >= 0 and confidence <= 1),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.tickets enable row level security;

create policy "Users can view all tickets"
  on public.tickets for select
  to authenticated using (true);

create policy "Users can insert tickets"
  on public.tickets for insert
  to authenticated with check (true);

create policy "Users can update tickets"
  on public.tickets for update
  to authenticated using (true);


-- AGENT LOGS
create table if not exists public.agent_logs (
  id            uuid primary key default gen_random_uuid(),
  agent_name    text not null,
  action        text not null,
  confidence    float check (confidence >= 0 and confidence <= 1),
  status        text not null default 'pending' check (status in ('success','failure','pending')),
  input         text,
  output        text,
  ticket_id     text,
  latency_ms    integer,
  tokens_used   integer,
  created_at    timestamptz not null default now()
);

alter table public.agent_logs enable row level security;

create policy "Users can view agent logs"
  on public.agent_logs for select
  to authenticated using (true);

create policy "Users can insert agent logs"
  on public.agent_logs for insert
  to authenticated with check (true);


-- ESCALATIONS
create table if not exists public.escalations (
  id              uuid primary key default gen_random_uuid(),
  ticket_id       text not null,
  reason          text not null,
  status          text not null default 'pending' check (status in ('pending','approved','rejected','resolved')),
  reviewer_notes  text,
  resolution      text,
  created_at      timestamptz not null default now(),
  resolved_at     timestamptz
);

alter table public.escalations enable row level security;

create policy "Users can view escalations"
  on public.escalations for select
  to authenticated using (true);

create policy "Users can insert escalations"
  on public.escalations for insert
  to authenticated with check (true);

create policy "Users can update escalations"
  on public.escalations for update
  to authenticated using (true);


-- KNOWLEDGE BASE
create table if not exists public.knowledge_base (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  content         text not null,
  category        text not null default 'FAQ',
  tags            text[] not null default '{}',
  retrieval_count integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.knowledge_base enable row level security;

create policy "Users can view knowledge base"
  on public.knowledge_base for select
  to authenticated using (true);

create policy "Users can insert knowledge base"
  on public.knowledge_base for insert
  to authenticated with check (true);

create policy "Users can update knowledge base"
  on public.knowledge_base for update
  to authenticated using (true);


-- RESOLUTIONS
create table if not exists public.resolutions (
  id               uuid primary key default gen_random_uuid(),
  ticket_id        text not null,
  resolution_text  text not null,
  root_cause       text,
  accepted         boolean,
  csat_score       integer check (csat_score >= 1 and csat_score <= 5),
  created_at       timestamptz not null default now()
);

alter table public.resolutions enable row level security;

create policy "Users can view resolutions"
  on public.resolutions for select
  to authenticated using (true);

create policy "Users can insert resolutions"
  on public.resolutions for insert
  to authenticated with check (true);

create policy "Users can update resolutions"
  on public.resolutions for update
  to authenticated using (true);


-- SAMPLE DATA (optional — adds demo tickets and articles)
insert into public.customers (customer_id, name, email, segment) values
  ('C-1001', 'Priya Sharma', 'priya@example.com', 'premium'),
  ('C-1002', 'Rahul Gupta', 'rahul@example.com', 'vip'),
  ('C-1003', 'Anita Desai', 'anita@example.com', 'standard')
on conflict do nothing;

insert into public.tickets (ticket_id, customer_id, channel, message, intent, severity, segment, status, root_cause, confidence) values
  ('TKT-0001', 'C-1001', 'chat', 'My membership is not activated after successful payment', 'membership_activation', 'high', 'premium', 'escalated', 'payment_callback_failed', 0.92),
  ('TKT-0002', 'C-1002', 'email', 'Profile is not visible to other users on the platform', 'profile_visibility', 'medium', 'vip', 'in_progress', 'privacy_setting_default', 0.87),
  ('TKT-0003', 'C-1003', 'whatsapp', 'I want a refund for my premium membership', 'refund_request', 'high', 'standard', 'escalated', null, 0.61),
  ('TKT-0004', 'C-1001', 'app', 'Cannot upload my photo, keeps showing error', 'photo_upload_error', 'medium', 'premium', 'resolved', 'file_size_limit', 0.95),
  ('TKT-0005', 'C-1002', 'chat', 'How do I change my preferred partner city?', 'preference_update', 'low', 'vip', 'resolved', null, 0.98)
on conflict do nothing;

insert into public.escalations (ticket_id, reason, status) values
  ('TKT-0001', 'Payment gateway callback failed — manual activation needed', 'pending'),
  ('TKT-0003', 'Refund request requires human approval per policy', 'pending')
on conflict do nothing;

insert into public.knowledge_base (title, content, category, tags, retrieval_count) values
  ('Membership Activation SOP', 'Step 1: Verify payment was received in payment gateway dashboard.\nStep 2: Check if webhook callback was triggered.\nStep 3: If callback failed, manually trigger activation via admin panel.\nStep 4: Notify customer within 2 hours.\nStep 5: Log incident for engineering review.', 'SOP', ARRAY['membership', 'activation', 'payment'], 47),
  ('Refund Policy', 'Refunds are allowed within 7 days of purchase if the service was not delivered. VIP customers get priority processing within 24 hours. Standard and premium customers get processing within 48-72 hours. All refunds require manager approval above ₹5,000.', 'Policy', ARRAY['refund', 'payment', 'policy'], 32),
  ('Profile Visibility FAQ', 'Q: Why is my profile not visible?\nA: Your profile may be set to private. Go to Settings > Privacy > Profile Visibility and set it to Public. New profiles may take 24 hours to appear in search results after verification is complete.', 'FAQ', ARRAY['profile', 'visibility', 'privacy'], 28),
  ('Photo Upload Troubleshooting', 'Accepted formats: JPG, PNG, WEBP. Maximum file size: 5MB. Minimum resolution: 200x200px. If upload fails: clear browser cache, try a different browser, or use the mobile app. Contact support if issue persists after 3 attempts.', 'Technical', ARRAY['photo', 'upload', 'error'], 19)
on conflict do nothing;
