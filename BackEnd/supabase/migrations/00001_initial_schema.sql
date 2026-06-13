-- Create profiles table (references auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  role text not null check (role in ('student', 'teacher', 'admin')),
  enrollment_no text,
  department text,
  created_at timestamptz not null default now()
);

-- Create experiments table
create table public.experiments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text not null,
  description text not null,
  instructions_url text,
  created_by uuid references public.profiles(id) on delete set null,
  deadline timestamptz not null,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

-- Create experiment_assignments table
create table public.experiment_assignments (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid references public.experiments(id) on delete cascade not null,
  student_id uuid references public.profiles(id) on delete cascade not null,
  assigned_at timestamptz not null default now(),
  status text not null check (status in ('pending', 'submitted', 'late', 'verified')),
  unique (experiment_id, student_id)
);

-- Create code_submissions table
create table public.code_submissions (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid references public.experiments(id) on delete cascade not null,
  student_id uuid references public.profiles(id) on delete cascade not null,
  file_url text not null,
  language text not null,
  submitted_at timestamptz not null default now(),
  is_late boolean not null default false,
  version integer not null default 1
);

-- Enable Row Level Security (RLS) on all tables
alter table public.profiles enable row level security;
alter table public.experiments enable row level security;
alter table public.experiment_assignments enable row level security;
alter table public.code_submissions enable row level security;

-- Create function to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
security definer set search_path = public
language plpgsql
as $$
begin
  insert into public.profiles (id, full_name, role, enrollment_no, department)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    new.raw_user_meta_data->>'enrollment_no',
    new.raw_user_meta_data->>'department'
  );
  return new;
end;
$$;

-- Create trigger on auth.users for signup
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
