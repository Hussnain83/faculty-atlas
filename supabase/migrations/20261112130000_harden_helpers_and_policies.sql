-- =====================================================================
-- Hardening after the Supabase security advisor:
-- 1. Move the privacy helper functions out of the public API schema, so
--    nobody can call them directly through /rest/v1/rpc. Policies keep
--    working because they reference functions by id, not by name.
-- 2. Split the "manage" policies into insert / update / delete so each
--    table has a single SELECT policy (faster queries).
-- =====================================================================

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

alter function public.current_person_id() set schema private;
alter function public.is_admin() set schema private;
alter function public.is_group_member(uuid) set schema private;
alter function public.can_see_person(uuid) set schema private;
alter function public.can_see_publication(uuid) set schema private;
alter function public.is_publication_author(uuid) set schema private;
alter function public.try_uuid(text) set schema private;

-- Function bodies refer to each other by name, so point them at the new schema.
create or replace function private.is_group_member(gid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and person_id = private.current_person_id()
  )
$$;

create or replace function private.can_see_person(pid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_admin()
      or pid = private.current_person_id()
      or exists (
        select 1
        from public.group_members mine
        join public.group_members theirs on theirs.group_id = mine.group_id
        where mine.person_id = private.current_person_id() and theirs.person_id = pid
      )
$$;

create or replace function private.can_see_publication(pub uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_admin()
      or exists (
        select 1 from public.publication_authors a
        where a.publication_id = pub and private.can_see_person(a.person_id)
      )
$$;

create or replace function private.is_publication_author(pub uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.publication_authors
    where publication_id = pub and person_id = private.current_person_id()
  )
$$;

create or replace function public.publication_author_names(pub uuid)
returns table (person_id uuid, display_name text, author_order int, visible boolean)
language sql stable security definer set search_path = '' as $$
  select
    case when private.can_see_person(p.id) then p.id end,
    case when private.can_see_person(p.id) then p.full_name
         else left(regexp_replace(p.full_name, '^(Dr\.|Prof\.)\s+', ''), 1) || '. ' ||
              regexp_replace(p.full_name, '^.*\s', '') end,
    a.author_order,
    private.can_see_person(p.id)
  from public.publication_authors a
  join public.people p on p.id = a.person_id
  where a.publication_id = pub and private.can_see_publication(pub)
  order by a.author_order
$$;

create or replace function public.people_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or private.is_admin() then
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

revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;
revoke execute on function public.publication_author_names(uuid) from public, anon;
grant execute on function public.publication_author_names(uuid) to authenticated;

-- ---------- one SELECT policy per table ----------
drop policy "admins manage groups" on public.groups;
create policy "admins add groups" on public.groups for insert to authenticated with check (private.is_admin());
create policy "admins edit groups" on public.groups for update to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "admins delete groups" on public.groups for delete to authenticated using (private.is_admin());

drop policy "admins manage members" on public.group_members;
create policy "admins add members" on public.group_members for insert to authenticated with check (private.is_admin());
create policy "admins remove members" on public.group_members for delete to authenticated using (private.is_admin());

drop policy "owner or admin edits skills" on public.person_skills;
create policy "owner or admin adds skills" on public.person_skills for insert to authenticated
  with check (person_id = private.current_person_id() or private.is_admin());
create policy "owner or admin edits skills" on public.person_skills for update to authenticated
  using (person_id = private.current_person_id() or private.is_admin())
  with check (person_id = private.current_person_id() or private.is_admin());
create policy "owner or admin removes skills" on public.person_skills for delete to authenticated
  using (person_id = private.current_person_id() or private.is_admin());

drop policy "owner or admin edits experience" on public.experiences;
create policy "owner or admin adds experience" on public.experiences for insert to authenticated
  with check (person_id = private.current_person_id() or private.is_admin());
create policy "owner or admin edits experience" on public.experiences for update to authenticated
  using (person_id = private.current_person_id() or private.is_admin())
  with check (person_id = private.current_person_id() or private.is_admin());
create policy "owner or admin removes experience" on public.experiences for delete to authenticated
  using (person_id = private.current_person_id() or private.is_admin());

drop policy "owner or admin edits achievements" on public.achievements;
create policy "owner or admin adds achievements" on public.achievements for insert to authenticated
  with check (person_id = private.current_person_id() or private.is_admin());
create policy "owner or admin edits achievements" on public.achievements for update to authenticated
  using (person_id = private.current_person_id() or private.is_admin())
  with check (person_id = private.current_person_id() or private.is_admin());
create policy "owner or admin removes achievements" on public.achievements for delete to authenticated
  using (person_id = private.current_person_id() or private.is_admin());

drop policy "owner or admin manages CV" on public.cvs;
create policy "owner or admin adds CV" on public.cvs for insert to authenticated
  with check (person_id = private.current_person_id() or private.is_admin());
create policy "owner or admin replaces CV" on public.cvs for update to authenticated
  using (person_id = private.current_person_id() or private.is_admin())
  with check (person_id = private.current_person_id() or private.is_admin());
create policy "owner or admin removes CV" on public.cvs for delete to authenticated
  using (person_id = private.current_person_id() or private.is_admin());
