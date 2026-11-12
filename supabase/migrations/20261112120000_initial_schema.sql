-- =====================================================================
-- Faculty Atlas · initial schema
-- People are registered by admins first (the directory). An account is
-- linked to a person when they activate it. Members can only see people
-- who share at least one research group with them; admins see everyone.
-- =====================================================================

create extension if not exists citext with schema extensions;

-- ---------- types ----------
create type public.app_role as enum ('admin');
create type public.person_status as enum ('invited', 'active', 'deactivated');
create type public.group_color as enum ('lagoon', 'coral', 'iris', 'saffron', 'mint');
create type public.skill_category as enum ('research', 'tools', 'teaching');
create type public.achievement_kind as enum ('award', 'grant', 'certificate');
create type public.publication_kind as enum ('journal', 'conference');
create type public.activity_kind as enum ('publication', 'cv', 'person', 'award', 'group');

-- ---------- tables ----------
create table public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now()
);
comment on table public.user_roles is 'Accounts with elevated rights. Assigned with the secret key or SQL only.';

create table public.people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  email extensions.citext not null unique,
  full_name text not null check (char_length(full_name) between 2 and 120),
  title text not null default '',
  department text not null default '',
  office text,
  phone_ext text,
  orcid text check (orcid is null or orcid ~ '^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$'),
  bio text check (bio is null or char_length(bio) <= 1200),
  photo_path text,
  joined_year int check (joined_year between 1950 and 2100),
  status public.person_status not null default 'invited',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.people is 'The directory. Only people listed here can activate an account or join a group.';

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name text not null check (char_length(name) between 2 and 120),
  short_code text not null check (char_length(short_code) between 1 and 4),
  description text not null default '',
  color public.group_color not null default 'lagoon',
  lead_id uuid references public.people (id) on delete set null,
  founded_year int check (founded_year between 1950 and 2100),
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  added_at timestamptz not null default now(),
  added_by uuid default auth.uid() references auth.users (id) on delete set null,
  primary key (group_id, person_id)
);
create index group_members_person_idx on public.group_members (person_id);

create table public.person_skills (
  person_id uuid not null references public.people (id) on delete cascade,
  skill text not null check (char_length(skill) between 1 and 60),
  category public.skill_category not null default 'research',
  position int not null default 0,
  primary key (person_id, skill)
);

create table public.experiences (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  role text not null check (char_length(role) between 1 and 160),
  organization text not null default '',
  start_year int not null check (start_year between 1950 and 2100),
  end_year int check (end_year is null or end_year >= start_year),
  is_education boolean not null default false,
  description text check (description is null or char_length(description) <= 600),
  created_at timestamptz not null default now()
);
create index experiences_person_idx on public.experiences (person_id);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  kind public.achievement_kind not null,
  title text not null check (char_length(title) between 1 and 200),
  organization text not null default '',
  year int not null check (year between 1950 and 2100),
  created_at timestamptz not null default now()
);
create index achievements_person_idx on public.achievements (person_id);

-- A paper is stored once and linked to every co-author, so group totals never double count.
create table public.publications (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 400),
  venue text not null default '',
  kind public.publication_kind not null,
  year int not null check (year between 1950 and 2100),
  doi text unique,
  citations int not null default 0 check (citations >= 0),
  external_authors text[] not null default '{}',
  created_by uuid references public.people (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.publication_authors (
  publication_id uuid not null references public.publications (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  author_order int not null default 1,
  primary key (publication_id, person_id)
);
create index publication_authors_person_idx on public.publication_authors (person_id);

create table public.cvs (
  person_id uuid primary key references public.people (id) on delete cascade,
  file_path text not null,
  file_name text not null,
  size_bytes int not null check (size_bytes > 0 and size_bytes <= 10485760),
  pages int check (pages is null or pages > 0),
  uploaded_at timestamptz not null default now()
);

create table public.activity (
  id bigint generated always as identity primary key,
  actor_id uuid references public.people (id) on delete cascade,
  kind public.activity_kind not null,
  summary text not null,
  subject text not null default '',
  created_at timestamptz not null default now()
);
create index activity_created_idx on public.activity (created_at desc);
create index activity_actor_idx on public.activity (actor_id);

-- ---------- access helpers (security definer so policies can use them without recursion) ----------
create function public.current_person_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.people where user_id = (select auth.uid()) limit 1
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles where user_id = (select auth.uid()) and role = 'admin')
$$;

create function public.is_group_member(gid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and person_id = public.current_person_id()
  )
$$;

-- The core privacy rule: admin, yourself, or someone who shares a group with you.
create function public.can_see_person(pid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin()
      or pid = public.current_person_id()
      or exists (
        select 1
        from public.group_members mine
        join public.group_members theirs on theirs.group_id = mine.group_id
        where mine.person_id = public.current_person_id() and theirs.person_id = pid
      )
$$;

create function public.can_see_publication(pub uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin()
      or exists (
        select 1 from public.publication_authors a
        where a.publication_id = pub and public.can_see_person(a.person_id)
      )
$$;

create function public.is_publication_author(pub uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.publication_authors
    where publication_id = pub and person_id = public.current_person_id()
  )
$$;

-- Author list for a paper you can see. Co-authors outside your groups appear as "A. Raza"
-- with no id, so their profile stays private while the citation stays complete.
create function public.publication_author_names(pub uuid)
returns table (person_id uuid, display_name text, author_order int, visible boolean)
language sql stable security definer set search_path = '' as $$
  select
    case when public.can_see_person(p.id) then p.id end,
    case when public.can_see_person(p.id) then p.full_name
         else left(regexp_replace(p.full_name, '^(Dr\.|Prof\.)\s+', ''), 1) || '. ' ||
              regexp_replace(p.full_name, '^.*\s', '') end,
    a.author_order,
    public.can_see_person(p.id)
  from public.publication_authors a
  join public.people p on p.id = a.person_id
  where a.publication_id = pub and public.can_see_publication(pub)
  order by a.author_order
$$;

create function public.try_uuid(t text) returns uuid
language plpgsql immutable set search_path = '' as $$
begin
  return t::uuid;
exception when others then
  return null;
end
$$;

-- ---------- triggers ----------
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end
$$;
create trigger people_touch before update on public.people
  for each row execute function public.touch_updated_at();
create trigger publications_touch before update on public.publications
  for each row execute function public.touch_updated_at();

-- Members may edit their own profile, but not the fields the research office controls.
create function public.people_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or public.is_admin() then
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
create trigger people_guard before update on public.people
  for each row execute function public.people_guard();

-- Activity feed entries are written by the database, never directly by users.
create function public.log_activity(p_actor uuid, p_kind public.activity_kind, p_summary text, p_subject text)
returns void
language sql security definer set search_path = '' as $$
  insert into public.activity (actor_id, kind, summary, subject) values (p_actor, p_kind, p_summary, coalesce(p_subject, ''))
$$;

create function public.tg_activity_publication() returns trigger
language plpgsql security definer set search_path = '' as $$
declare pub record;
begin
  select title, created_by into pub from public.publications where id = new.publication_id;
  if pub.created_by = new.person_id then
    perform public.log_activity(new.person_id, 'publication', 'added a publication', pub.title);
  end if;
  return new;
end
$$;
create trigger activity_publication after insert on public.publication_authors
  for each row execute function public.tg_activity_publication();

create function public.tg_activity_cv() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.log_activity(new.person_id, 'cv', 'uploaded a new CV', new.file_name);
  return new;
end
$$;
create trigger activity_cv after insert or update of file_path on public.cvs
  for each row execute function public.tg_activity_cv();

create function public.tg_activity_achievement() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.log_activity(new.person_id, 'award', 'added an achievement', new.title);
  return new;
end
$$;
create trigger activity_achievement after insert on public.achievements
  for each row execute function public.tg_activity_achievement();

create function public.tg_activity_member() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.log_activity(new.person_id, 'group', 'joined a group',
    (select name from public.groups where id = new.group_id));
  return new;
end
$$;
create trigger activity_member after insert on public.group_members
  for each row execute function public.tg_activity_member();

create function public.tg_activity_activated() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'active' and old.status is distinct from 'active' then
    perform public.log_activity(new.id, 'person', 'activated their account',
      trim(both ' ·' from new.title || ' · ' || new.department));
  end if;
  return new;
end
$$;
create trigger activity_activated after update of status on public.people
  for each row execute function public.tg_activity_activated();

-- Internal helpers are not callable from the API.
revoke execute on function public.log_activity(uuid, public.activity_kind, text, text) from public, anon, authenticated;
revoke execute on function public.people_guard() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
revoke execute on function public.tg_activity_publication() from public, anon, authenticated;
revoke execute on function public.tg_activity_cv() from public, anon, authenticated;
revoke execute on function public.tg_activity_achievement() from public, anon, authenticated;
revoke execute on function public.tg_activity_member() from public, anon, authenticated;
revoke execute on function public.tg_activity_activated() from public, anon, authenticated;

-- ---------- row level security ----------
alter table public.user_roles enable row level security;
alter table public.people enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.person_skills enable row level security;
alter table public.experiences enable row level security;
alter table public.achievements enable row level security;
alter table public.publications enable row level security;
alter table public.publication_authors enable row level security;
alter table public.cvs enable row level security;
alter table public.activity enable row level security;

-- Signed-out visitors get nothing from these tables.
revoke all on all tables in schema public from anon;

create policy "own role or admin" on public.user_roles
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());

-- people
create policy "see people in your groups" on public.people
  for select to authenticated using (public.can_see_person(id));
create policy "admins register people" on public.people
  for insert to authenticated with check (public.is_admin());
create policy "edit own profile or admin" on public.people
  for update to authenticated
  using (public.is_admin() or user_id = (select auth.uid()))
  with check (public.is_admin() or user_id = (select auth.uid()));
create policy "admins remove people" on public.people
  for delete to authenticated using (public.is_admin());

-- groups: names and descriptions are visible to everyone signed in (shown as locked cards);
-- members, stats and output are protected by the tables below.
create policy "see active groups" on public.groups
  for select to authenticated using (archived_at is null or public.is_admin());
create policy "admins manage groups" on public.groups
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "see members of your groups" on public.group_members
  for select to authenticated using (public.is_admin() or public.is_group_member(group_id));
create policy "admins manage members" on public.group_members
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- profile sections: readable when the person is visible, writable by the owner or an admin
create policy "see skills of visible people" on public.person_skills
  for select to authenticated using (public.can_see_person(person_id));
create policy "owner or admin edits skills" on public.person_skills
  for all to authenticated
  using (person_id = public.current_person_id() or public.is_admin())
  with check (person_id = public.current_person_id() or public.is_admin());

create policy "see experience of visible people" on public.experiences
  for select to authenticated using (public.can_see_person(person_id));
create policy "owner or admin edits experience" on public.experiences
  for all to authenticated
  using (person_id = public.current_person_id() or public.is_admin())
  with check (person_id = public.current_person_id() or public.is_admin());

create policy "see achievements of visible people" on public.achievements
  for select to authenticated using (public.can_see_person(person_id));
create policy "owner or admin edits achievements" on public.achievements
  for all to authenticated
  using (person_id = public.current_person_id() or public.is_admin())
  with check (person_id = public.current_person_id() or public.is_admin());

create policy "see CVs of visible people" on public.cvs
  for select to authenticated using (public.can_see_person(person_id));
create policy "owner or admin manages CV" on public.cvs
  for all to authenticated
  using (person_id = public.current_person_id() or public.is_admin())
  with check (person_id = public.current_person_id() or public.is_admin());

-- publications
create policy "see papers by visible authors" on public.publications
  for select to authenticated
  using (public.can_see_publication(id) or created_by = public.current_person_id());
create policy "add your own papers" on public.publications
  for insert to authenticated
  with check (public.is_admin() or created_by = public.current_person_id());
create policy "authors edit papers" on public.publications
  for update to authenticated
  using (public.is_admin() or public.is_publication_author(id) or created_by = public.current_person_id())
  with check (public.is_admin() or public.is_publication_author(id) or created_by = public.current_person_id());
create policy "authors delete papers" on public.publications
  for delete to authenticated
  using (public.is_admin() or created_by = public.current_person_id());

create policy "see authors of visible papers" on public.publication_authors
  for select to authenticated using (public.can_see_publication(publication_id));
create policy "link authors to your papers" on public.publication_authors
  for insert to authenticated
  with check (
    public.is_admin()
    or person_id = public.current_person_id()
    or exists (select 1 from public.publications p
               where p.id = publication_id and p.created_by = public.current_person_id())
  );
create policy "unlink authors from your papers" on public.publication_authors
  for delete to authenticated
  using (
    public.is_admin()
    or person_id = public.current_person_id()
    or exists (select 1 from public.publications p
               where p.id = publication_id and p.created_by = public.current_person_id())
  );

create policy "see activity of visible people" on public.activity
  for select to authenticated using (public.can_see_person(actor_id));

-- ---------- storage: profile photos and CVs, one folder per person ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('photos', 'photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('cvs', 'cvs', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

create policy "read files of visible people" on storage.objects
  for select to authenticated
  using (bucket_id in ('photos', 'cvs')
         and public.can_see_person(public.try_uuid((storage.foldername(name))[1])));
create policy "upload to your own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('photos', 'cvs')
              and (public.try_uuid((storage.foldername(name))[1]) = public.current_person_id() or public.is_admin()));
create policy "replace files in your own folder" on storage.objects
  for update to authenticated
  using (bucket_id in ('photos', 'cvs')
         and (public.try_uuid((storage.foldername(name))[1]) = public.current_person_id() or public.is_admin()));
create policy "delete files in your own folder" on storage.objects
  for delete to authenticated
  using (bucket_id in ('photos', 'cvs')
         and (public.try_uuid((storage.foldername(name))[1]) = public.current_person_id() or public.is_admin()));
