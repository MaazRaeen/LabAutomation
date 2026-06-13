-- Migration to support permanent deletion of teacher and student accounts by admins

create or replace function public.delete_user_account(target_user_id uuid)
returns void
security definer set search_path = public
language plpgsql
as $$
declare
  requestor_role text;
  target_user_role text;
begin
  -- 1. Get the role of the user invoking the function
  select role into requestor_role from public.profiles where id = auth.uid();

  -- 2. Check if the requestor is an admin
  if requestor_role <> 'admin' or requestor_role is null then
    raise exception 'Unauthorized: Only administrators can delete accounts.';
  end if;

  -- 3. Prevent admin from deleting themselves
  if auth.uid() = target_user_id then
    raise exception 'Conflict: Administrators cannot delete their own accounts.';
  end if;

  -- 4. Get the role of the target user
  select role into target_user_role from public.profiles where id = target_user_id;

  -- 5. If the target is a teacher, delete their experiments (which cascades to assignments, submissions, evaluations, etc.)
  if target_user_role = 'teacher' then
    delete from public.experiments where created_by = target_user_id;
  end if;

  -- 6. Delete the user from auth.users (cascades to profiles and all student records due to ON DELETE CASCADE)
  delete from auth.users where id = target_user_id;
end;
$$;
