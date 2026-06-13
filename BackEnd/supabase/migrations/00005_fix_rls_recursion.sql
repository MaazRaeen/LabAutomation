-- Helper function to check if the current user is the creator of an experiment (RLS bypass)
create or replace function public.is_experiment_creator(exp_id uuid)
returns boolean
security definer set search_path = public
stable
language plpgsql
as $$
begin
  return exists (
    select 1 from public.experiments where id = exp_id and created_by = auth.uid()
  );
end;
$$;

-- Helper function to check if the current user is assigned to an experiment (RLS bypass)
create or replace function public.is_assigned_to_experiment(exp_id uuid)
returns boolean
security definer set search_path = public
stable
language plpgsql
as $$
begin
  return exists (
    select 1 from public.experiment_assignments where experiment_id = exp_id and student_id = auth.uid()
  );
end;
$$;

-- Update Experiments select policy
drop policy if exists "Experiments select policy" on public.experiments;
create policy "Experiments select policy"
  on public.experiments
  for select
  using (
    public.get_user_role() = 'admin'
    or (public.get_user_role() = 'teacher' and created_by = auth.uid())
    or (public.get_user_role() = 'student' and public.is_assigned_to_experiment(id))
  );

-- Update Assignments select policy
drop policy if exists "Assignments select policy" on public.experiment_assignments;
create policy "Assignments select policy"
  on public.experiment_assignments
  for select
  using (
    public.get_user_role() = 'admin'
    or (public.get_user_role() = 'student' and student_id = auth.uid())
    or (public.get_user_role() = 'teacher' and public.is_experiment_creator(experiment_id))
  );

-- Update Submissions select policy
drop policy if exists "Submissions select policy" on public.code_submissions;
create policy "Submissions select policy"
  on public.code_submissions
  for select
  using (
    public.get_user_role() = 'admin'
    or (public.get_user_role() = 'student' and student_id = auth.uid())
    or (public.get_user_role() = 'teacher' and public.is_experiment_creator(experiment_id))
  );

-- Update Lab records select policy
drop policy if exists "Lab records select policy" on public.lab_records;
create policy "Lab records select policy"
  on public.lab_records
  for select
  using (
    public.get_user_role() = 'admin'
    or (public.get_user_role() = 'student' and student_id = auth.uid())
    or (public.get_user_role() = 'teacher' and public.is_experiment_creator(experiment_id))
  );

-- Update Lab records update policy
drop policy if exists "Lab records update policy" on public.lab_records;
create policy "Lab records update policy"
  on public.lab_records
  for update
  using (
    public.get_user_role() = 'admin'
    or (public.get_user_role() = 'teacher' and public.is_experiment_creator(experiment_id))
  );

-- Update Resubmissions select policy
drop policy if exists "Resubmissions select policy" on public.resubmission_requests;
create policy "Resubmissions select policy"
  on public.resubmission_requests
  for select
  using (
    public.get_user_role() = 'admin'
    or (public.get_user_role() = 'student' and student_id = auth.uid())
    or (public.get_user_role() = 'teacher' and public.is_experiment_creator(experiment_id))
  );

-- Update Resubmissions update policy
drop policy if exists "Resubmissions update policy" on public.resubmission_requests;
create policy "Resubmissions update policy"
  on public.resubmission_requests
  for update
  using (
    public.get_user_role() = 'admin'
    or (public.get_user_role() = 'teacher' and public.is_experiment_creator(experiment_id))
  );
