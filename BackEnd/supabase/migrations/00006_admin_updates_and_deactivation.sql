-- Alter profiles table to add is_active column
alter table public.profiles add column if not exists is_active boolean not null default true;

-- Alter profiles table to add email column
alter table public.profiles add column if not exists email text;

-- Update existing profiles with emails from auth.users
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;

-- Recreate trigger function to capture email on signup
create or replace function public.handle_new_user()
returns trigger
security definer set search_path = public
language plpgsql
as $$
begin
  insert into public.profiles (id, full_name, role, enrollment_no, department, semester, session, section, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    new.raw_user_meta_data->>'enrollment_no',
    new.raw_user_meta_data->>'department',
    new.raw_user_meta_data->>'semester',
    new.raw_user_meta_data->>'session',
    new.raw_user_meta_data->>'section',
    new.email
  );
  return new;
end;
$$;

-- Drop profiles update policy if it exists and recreate it to allow admins and owners to update
drop policy if exists "Profiles update policy" on public.profiles;
create policy "Profiles update policy"
  on public.profiles
  for update
  using (
    auth.uid() = id
    or public.get_user_role() = 'admin'
  );

-- Recreate evaluations update policy to allow admins and original teachers to update marks
drop policy if exists "Evaluations update policy" on public.evaluations;
create policy "Evaluations update policy"
  on public.evaluations
  for update
  using (
    public.get_user_role() = 'admin'
    or (public.get_user_role() = 'teacher' and teacher_id = auth.uid())
  );
