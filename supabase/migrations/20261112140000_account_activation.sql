-- =====================================================================
-- Accounts: activation and deactivation
-- =====================================================================

-- A deactivated person keeps their account row but loses all access:
-- current_person_id() returns null for them, so every rule treats them as a stranger.
create or replace function private.current_person_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.people
  where user_id = (select auth.uid()) and status <> 'deactivated'
  limit 1
$$;

-- Called by the activation flow once the person has verified their email,
-- set a password and finished their profile. Only flips invited -> active for yourself.
create function public.activate_my_account() returns boolean
language plpgsql security definer set search_path = '' as $$
declare changed int;
begin
  update public.people
     set status = 'active'
   where user_id = (select auth.uid()) and status = 'invited';
  get diagnostics changed = row_count;
  return changed = 1;
end
$$;
revoke execute on function public.activate_my_account() from public, anon;
grant execute on function public.activate_my_account() to authenticated;

-- Who am I? One call for the app shell: person, status and admin flag.
create function public.my_account()
returns table (person_id uuid, full_name text, title text, department text, photo_path text, status public.person_status, is_admin boolean)
language sql stable security definer set search_path = '' as $$
  select p.id, p.full_name, p.title, p.department, p.photo_path, p.status, private.is_admin()
  from (select 1) one
  left join public.people p on p.user_id = (select auth.uid())
  where (select auth.uid()) is not null
$$;
revoke execute on function public.my_account() from public, anon;
grant execute on function public.my_account() to authenticated;
