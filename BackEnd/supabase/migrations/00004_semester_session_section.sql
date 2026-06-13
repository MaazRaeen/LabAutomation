-- Alter profiles table to add semester, session, section
alter table public.profiles add column semester text;
alter table public.profiles add column session text;
alter table public.profiles add column section text;

-- Alter experiments table to add target semester, session, section
alter table public.experiments add column target_semester text;
alter table public.experiments add column target_session text;
alter table public.experiments add column target_section text;

-- Update handle_new_user function to include these new fields
create or replace function public.handle_new_user()
returns trigger
security definer set search_path = public
language plpgsql
as $$
begin
  insert into public.profiles (id, full_name, role, enrollment_no, department, semester, session, section)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    new.raw_user_meta_data->>'enrollment_no',
    new.raw_user_meta_data->>'department',
    new.raw_user_meta_data->>'semester',
    new.raw_user_meta_data->>'session',
    new.raw_user_meta_data->>'section'
  );
  return new;
end;
$$;

-- Drop existing profiles select policy if it exists and recreate it to allow teachers to select profiles
drop policy if exists "Profiles select policy" on public.profiles;

create policy "Profiles select policy"
  on public.profiles
  for select
  using (
    auth.uid() = id 
    or public.get_user_role() = 'admin' 
    or public.get_user_role() = 'teacher'
  );
