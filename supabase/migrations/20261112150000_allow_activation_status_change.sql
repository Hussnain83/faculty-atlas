-- The people_guard trigger blocks members from changing their own status. activate_my_account()
-- needs to flip invited -> active for the caller, so it sets a transaction-local flag the guard honours.
-- set_config is not reachable through the API (only functions in the public schema are), so users
-- cannot set this flag themselves.

create or replace function public.people_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or private.is_admin() then
    return new;
  end if;
  if current_setting('app.activating', true) = 'on'
     and old.status = 'invited' and new.status = 'active'
     and new.email is not distinct from old.email
     and new.user_id is not distinct from old.user_id
     and new.title is not distinct from old.title
     and new.department is not distinct from old.department
     and new.joined_year is not distinct from old.joined_year then
    return new;
  end if;
  if new.email is distinct from old.email
     or new.status is distinct from old.status
     or new.user_id is distinct from old.user_id
     or new.title is distinct from old.title
     or new.department is distinct from old.department
     or new.joined_year is distinct from old.joined_year then
    raise exception 'Only the research office can change email, status, title, department or joined year'
      using errcode = '42501';
  end if;
  return new;
end
$$;

create or replace function public.activate_my_account() returns boolean
language plpgsql security definer set search_path = '' as $$
declare changed int;
begin
  perform set_config('app.activating', 'on', true);
  update public.people
     set status = 'active'
   where user_id = (select auth.uid()) and status = 'invited';
  get diagnostics changed = row_count;
  perform set_config('app.activating', 'off', true);
  return changed = 1;
end
$$;
revoke execute on function public.activate_my_account() from public, anon;
grant execute on function public.activate_my_account() to authenticated;
