-- Helper function to retrieve the current user's role from profiles
create or replace function public.get_user_role()
returns text
security definer set search_path = public
stable
language plpgsql
as $$
declare
  user_role text;
begin
  select role into user_role from public.profiles where id = auth.uid();
  return user_role;
end;
$$;

-- RLS policies for profiles
create policy "Profiles select policy"
  on public.profiles
  for select
  using (auth.uid() = id or public.get_user_role() = 'admin');

-- RLS policies for experiments
create policy "Experiments select policy"
  on public.experiments
  for select
  using (
    public.get_user_role() = 'admin'
    or (public.get_user_role() = 'teacher' and created_by = auth.uid())
    or (public.get_user_role() = 'student' and id in (
      select experiment_id from public.experiment_assignments where student_id = auth.uid()
    ))
  );

create policy "Experiments insert policy"
  on public.experiments
  for insert
  with check (
    public.get_user_role() = 'teacher' and created_by = auth.uid()
  );

create policy "Experiments update policy"
  on public.experiments
  for update
  using (
    public.get_user_role() = 'teacher' and created_by = auth.uid()
  );

create policy "Experiments delete policy"
  on public.experiments
  for delete
  using (
    public.get_user_role() = 'teacher' and created_by = auth.uid()
  );

-- RLS policies for experiment_assignments
create policy "Assignments select policy"
  on public.experiment_assignments
  for select
  using (
    public.get_user_role() = 'admin'
    or (public.get_user_role() = 'student' and student_id = auth.uid())
    or (public.get_user_role() = 'teacher' and experiment_id in (
      select id from public.experiments where created_by = auth.uid()
    ))
  );

-- RLS policies for code_submissions
create policy "Submissions select policy"
  on public.code_submissions
  for select
  using (
    public.get_user_role() = 'admin'
    or (public.get_user_role() = 'student' and student_id = auth.uid())
    or (public.get_user_role() = 'teacher' and experiment_id in (
      select id from public.experiments where created_by = auth.uid()
    ))
  );

create policy "Submissions insert policy"
  on public.code_submissions
  for insert
  with check (
    public.get_user_role() = 'student' and student_id = auth.uid()
  );

-- RLS policies for lab_records
create policy "Lab records select policy"
  on public.lab_records
  for select
  using (
    public.get_user_role() = 'admin'
    or (public.get_user_role() = 'student' and student_id = auth.uid())
    or (public.get_user_role() = 'teacher' and experiment_id in (
      select id from public.experiments where created_by = auth.uid()
    ))
  );

create policy "Lab records insert policy"
  on public.lab_records
  for insert
  with check (
    public.get_user_role() = 'student' and student_id = auth.uid()
  );

create policy "Lab records update policy"
  on public.lab_records
  for update
  using (
    public.get_user_role() = 'admin'
    or (public.get_user_role() = 'teacher' and experiment_id in (
      select id from public.experiments where created_by = auth.uid()
    ))
  );

-- RLS policies for evaluations
create policy "Evaluations select policy"
  on public.evaluations
  for select
  using (
    public.get_user_role() = 'admin'
    or (public.get_user_role() = 'student' and submission_id in (
      select id from public.code_submissions where student_id = auth.uid()
    ))
    or (public.get_user_role() = 'teacher' and teacher_id = auth.uid())
  );

create policy "Evaluations insert policy"
  on public.evaluations
  for insert
  with check (
    public.get_user_role() = 'teacher' and teacher_id = auth.uid()
  );

create policy "Evaluations update policy"
  on public.evaluations
  for update
  using (
    public.get_user_role() = 'teacher' and teacher_id = auth.uid()
  );

-- RLS policies for resubmission_requests
create policy "Resubmissions select policy"
  on public.resubmission_requests
  for select
  using (
    public.get_user_role() = 'admin'
    or (public.get_user_role() = 'student' and student_id = auth.uid())
    or (public.get_user_role() = 'teacher' and experiment_id in (
      select id from public.experiments where created_by = auth.uid()
    ))
  );

create policy "Resubmissions insert policy"
  on public.resubmission_requests
  for insert
  with check (
    public.get_user_role() = 'student' and student_id = auth.uid()
  );

create policy "Resubmissions update policy"
  on public.resubmission_requests
  for update
  using (
    public.get_user_role() = 'admin'
    or (public.get_user_role() = 'teacher' and experiment_id in (
      select id from public.experiments where created_by = auth.uid()
    ))
  );

-- RLS policies for marks_revision_requests
create policy "Revision requests select policy"
  on public.marks_revision_requests
  for select
  using (
    public.get_user_role() = 'admin'
    or (public.get_user_role() = 'teacher' and teacher_id = auth.uid())
  );

create policy "Revision requests insert policy"
  on public.marks_revision_requests
  for insert
  with check (
    public.get_user_role() = 'teacher' and teacher_id = auth.uid()
  );

create policy "Revision requests update policy"
  on public.marks_revision_requests
  for update
  using (
    public.get_user_role() = 'admin'
  );

-- RLS policies for audit_logs
create policy "Audit logs select policy"
  on public.audit_logs
  for select
  using (
    public.get_user_role() = 'admin'
  );
