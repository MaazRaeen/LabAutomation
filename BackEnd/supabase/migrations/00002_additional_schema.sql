-- Create lab_records table
create table public.lab_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) on delete cascade not null,
  experiment_id uuid references public.experiments(id) on delete cascade not null,
  file_url text not null,
  status text not null check (status in ('submitted', 'pending', 'verified')),
  submitted_at timestamptz not null default now()
);

-- Create evaluations table
create table public.evaluations (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references public.code_submissions(id) on delete cascade not null,
  teacher_id uuid references public.profiles(id) on delete set null,
  marks integer not null,
  max_marks integer not null default 10,
  remarks text,
  evaluated_at timestamptz not null default now()
);

-- Create resubmission_requests table
create table public.resubmission_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) on delete cascade not null,
  experiment_id uuid references public.experiments(id) on delete cascade not null,
  justification text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  teacher_note text,
  created_at timestamptz not null default now()
);

-- Create marks_revision_requests table
create table public.marks_revision_requests (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid references public.evaluations(id) on delete cascade not null,
  teacher_id uuid references public.profiles(id) on delete set null,
  original_marks integer not null,
  requested_marks integer not null,
  justification text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  created_at timestamptz not null default now()
);

-- Create audit_logs table
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_table text not null,
  target_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security (RLS) on all tables
alter table public.lab_records enable row level security;
alter table public.evaluations enable row level security;
alter table public.resubmission_requests enable row level security;
alter table public.marks_revision_requests enable row level security;
alter table public.audit_logs enable row level security;
