-- Drop existing insert/update/delete policies for experiment_assignments if they exist
drop policy if exists "Assignments insert policy" on public.experiment_assignments;
drop policy if exists "Assignments update policy" on public.experiment_assignments;
drop policy if exists "Assignments delete policy" on public.experiment_assignments;

-- Create insert policy: Teachers (who are experiment creators) and Admins can insert assignments
create policy "Assignments insert policy"
  on public.experiment_assignments
  for insert
  with check (
    public.get_user_role() = 'admin'
    or (public.get_user_role() = 'teacher' and public.is_experiment_creator(experiment_id))
  );

-- Create update policy: Teachers, Students (to update their own assignment status), and Admins can update assignments
create policy "Assignments update policy"
  on public.experiment_assignments
  for update
  using (
    public.get_user_role() = 'admin'
    or (public.get_user_role() = 'student' and student_id = auth.uid())
    or (public.get_user_role() = 'teacher' and public.is_experiment_creator(experiment_id))
  );

-- Create delete policy: Teachers and Admins can delete assignments
create policy "Assignments delete policy"
  on public.experiment_assignments
  for delete
  using (
    public.get_user_role() = 'admin'
    or (public.get_user_role() = 'teacher' and public.is_experiment_creator(experiment_id))
  );
