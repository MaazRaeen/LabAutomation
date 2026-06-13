-- Create notifications table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.notifications enable row level security;

-- Create policy for select
create policy "Users can select their own notifications"
  on public.notifications
  for select
  using (
    auth.uid() = user_id
    or public.get_user_role() = 'admin'
  );

-- Create policy for insert
create policy "Anyone can insert notifications"
  on public.notifications
  for insert
  with check (true);

-- Create policy for update
create policy "Users can update their own notifications"
  on public.notifications
  for update
  using (
    auth.uid() = user_id
    or public.get_user_role() = 'admin'
  );
