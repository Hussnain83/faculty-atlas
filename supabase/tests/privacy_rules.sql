-- =====================================================================
-- Privacy rule checks. Run against the sample data:
--   npx supabase db query --remote --file supabase/tests/privacy_rules.sql
-- Everything runs inside one DO block that always ends by raising an
-- exception, so the temporary test accounts and edits are rolled back.
-- The result table is printed in the error message: every row must say PASS.
-- =====================================================================
do $$
declare
  admin_uid uuid := gen_random_uuid();
  amina_uid uuid := gen_random_uuid();
  kenji_uid uuid := gen_random_uuid();
  amina uuid;
  zara uuid;
  sofia uuid;
  out text := '';
  fails int := 0;
  n bigint;
  ok boolean;

  procedure_check text;
begin
  select id into amina from public.people where email = 'a.raza@northfield.edu';
  select id into zara  from public.people where email = 'z.siddiqui@northfield.edu';
  select id into sofia from public.people where email = 's.marquez@northfield.edu';

  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
    (admin_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test-admin@northfield.edu', '', now(), '{}', '{}', now(), now()),
    (amina_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test-amina@northfield.edu', '', now(), '{}', '{}', now(), now()),
    (kenji_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test-kenji@northfield.edu', '', now(), '{}', '{}', now(), now());
  insert into public.user_roles (user_id, role) values (admin_uid, 'admin');
  update public.people set user_id = amina_uid where id = amina;
  update public.people set user_id = kenji_uid where email = 'k.watanabe@northfield.edu';

  -- ---------- signed out (anon) ----------
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  begin
    select count(*) into n from public.people;
    ok := n = 0;
  exception when insufficient_privilege then
    ok := true; n := 0;
  end;
  out := out || format(E'\n%s  signed out sees 0 people (got %s)', case when ok then 'PASS' else 'FAIL' end, n);
  if not ok then fails := fails + 1; end if;

  -- ---------- admin ----------
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', admin_uid, 'role', 'authenticated')::text, true);
  select count(*) into n from public.people;
  ok := n = 15; out := out || format(E'\n%s  admin sees all 15 people (got %s)', case when ok then 'PASS' else 'FAIL' end, n); if not ok then fails := fails + 1; end if;
  select count(*) into n from public.group_members;
  ok := n = 19; out := out || format(E'\n%s  admin sees all 19 memberships (got %s)', case when ok then 'PASS' else 'FAIL' end, n); if not ok then fails := fails + 1; end if;
  select count(*) into n from public.publications;
  ok := n = 153; out := out || format(E'\n%s  admin sees all 153 papers (got %s)', case when ok then 'PASS' else 'FAIL' end, n); if not ok then fails := fails + 1; end if;

  -- ---------- Amina: member of AI Lab + Computer Vision ----------
  perform set_config('request.jwt.claims', json_build_object('sub', amina_uid, 'role', 'authenticated')::text, true);
  select count(*) into n from public.people;
  ok := n = 9; out := out || format(E'\n%s  Amina sees the 9 people in her two groups (got %s)', case when ok then 'PASS' else 'FAIL' end, n); if not ok then fails := fails + 1; end if;
  select count(*) into n from public.people where id = zara;
  ok := n = 1; out := out || format(E'\n%s  Amina can see Zara (shares AI Lab)', case when ok then 'PASS' else 'FAIL' end); if not ok then fails := fails + 1; end if;
  select count(*) into n from public.people where id = sofia;
  ok := n = 0; out := out || format(E'\n%s  Amina cannot see Sofia (no shared group)', case when ok then 'PASS' else 'FAIL' end); if not ok then fails := fails + 1; end if;
  select count(*) into n from public.person_skills where person_id = sofia;
  ok := n = 0; out := out || format(E'\n%s  Amina cannot read Sofia''s skills', case when ok then 'PASS' else 'FAIL' end); if not ok then fails := fails + 1; end if;
  select count(*) into n from public.groups;
  ok := n = 4; out := out || format(E'\n%s  Amina sees all 4 group names (locked cards) (got %s)', case when ok then 'PASS' else 'FAIL' end, n); if not ok then fails := fails + 1; end if;
  select count(distinct group_id) into n from public.group_members;
  ok := n = 2; out := out || format(E'\n%s  Amina sees member lists of only her 2 groups (got %s)', case when ok then 'PASS' else 'FAIL' end, n); if not ok then fails := fails + 1; end if;
  select count(*) into n from public.publications p
   where not exists (select 1 from public.publication_authors a join public.people pe on pe.id = a.person_id where a.publication_id = p.id);
  ok := n = 0; out := out || format(E'\n%s  every paper Amina sees has a visible author', case when ok then 'PASS' else 'FAIL' end); if not ok then fails := fails + 1; end if;
  select count(*) into n from public.publication_author_names((select publication_id from public.publication_authors where person_id = amina limit 1)) where not visible and person_id is not null;
  ok := n = 0; out := out || format(E'\n%s  hidden co-authors come back without an id', case when ok then 'PASS' else 'FAIL' end); if not ok then fails := fails + 1; end if;

  update public.people set bio = 'Updated by test' where id = amina;
  get diagnostics n = row_count;
  ok := n = 1; out := out || format(E'\n%s  Amina can edit her own bio', case when ok then 'PASS' else 'FAIL' end); if not ok then fails := fails + 1; end if;
  update public.people set bio = 'Hacked' where id = zara;
  get diagnostics n = row_count;
  ok := n = 0; out := out || format(E'\n%s  Amina cannot edit Zara''s profile', case when ok then 'PASS' else 'FAIL' end); if not ok then fails := fails + 1; end if;
  begin
    update public.people set status = 'deactivated' where id = amina;
    ok := false;
  exception when insufficient_privilege then ok := true;
  end;
  out := out || format(E'\n%s  Amina cannot change her own status', case when ok then 'PASS' else 'FAIL' end); if not ok then fails := fails + 1; end if;
  begin
    insert into public.people (email, full_name) values ('intruder@northfield.edu', 'Not Allowed');
    ok := false;
  exception when insufficient_privilege then ok := true;
  end;
  out := out || format(E'\n%s  Amina cannot register new people', case when ok then 'PASS' else 'FAIL' end); if not ok then fails := fails + 1; end if;
  begin
    insert into public.group_members (group_id, person_id) values ((select id from public.groups where slug = 'learning-sciences'), amina);
    ok := false;
  exception when insufficient_privilege then ok := true;
  end;
  out := out || format(E'\n%s  Amina cannot add herself to another group', case when ok then 'PASS' else 'FAIL' end); if not ok then fails := fails + 1; end if;
  begin
    insert into public.person_skills (person_id, skill) values (zara, 'Injected');
    ok := false;
  exception when insufficient_privilege then ok := true;
  end;
  out := out || format(E'\n%s  Amina cannot add skills to Zara', case when ok then 'PASS' else 'FAIL' end); if not ok then fails := fails + 1; end if;
  select count(*) into n from public.activity a where not exists (select 1 from public.people p where p.id = a.actor_id);
  ok := n = 0; out := out || format(E'\n%s  Amina''s activity feed only shows visible people', case when ok then 'PASS' else 'FAIL' end); if not ok then fails := fails + 1; end if;
  select count(*) into n from public.user_roles;
  ok := n = 0; out := out || format(E'\n%s  Amina cannot see who the admins are', case when ok then 'PASS' else 'FAIL' end); if not ok then fails := fails + 1; end if;

  -- ---------- Kenji: registered, in no group ----------
  perform set_config('request.jwt.claims', json_build_object('sub', kenji_uid, 'role', 'authenticated')::text, true);
  select count(*) into n from public.people;
  ok := n = 1; out := out || format(E'\n%s  Kenji (no groups) sees only himself (got %s)', case when ok then 'PASS' else 'FAIL' end, n); if not ok then fails := fails + 1; end if;
  select count(*) into n from public.group_members;
  ok := n = 0; out := out || format(E'\n%s  Kenji sees no member lists (got %s)', case when ok then 'PASS' else 'FAIL' end, n); if not ok then fails := fails + 1; end if;

  perform set_config('role', 'postgres', true);
  raise exception E'PRIVACY TESTS: % failed\n%\n(rolled back, nothing was saved)', fails, out;
end
$$;
