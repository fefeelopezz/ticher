-- One row per user and storage key (preps, subjects, chats, ...), mirroring the browser's localStorage.
create table if not exists public.user_data (
  email text not null,
  key text not null check (key ~ '^[a-z]{1,20}$'),
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (email, key)
);

-- RLS on with no policies: browsers (anon/publishable key) get nothing. Only the Next.js server,
-- using the secret key after checking the Ticher session, reads and writes rows.
alter table public.user_data enable row level security;
