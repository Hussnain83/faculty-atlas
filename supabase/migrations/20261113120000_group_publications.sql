-- =====================================================================
-- One call for a group page: every paper written by at least one member,
-- counted once, with authors in order and the group members among them
-- (used to draw co-author links). Returns nothing unless the viewer is a
-- member of the group or an admin.
-- =====================================================================

create function public.group_publications(gid uuid)
returns table (
  id uuid,
  title text,
  venue text,
  kind public.publication_kind,
  year int,
  doi text,
  citations int,
  external_authors text[],
  authors jsonb,
  member_ids uuid[]
)
language sql stable security definer set search_path = '' as $$
  select
    pub.id, pub.title, pub.venue, pub.kind, pub.year, pub.doi, pub.citations, pub.external_authors,
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', case when private.can_see_person(p.id) then p.id end,
          'name', case when private.can_see_person(p.id) then p.full_name
                       else left(regexp_replace(p.full_name, '^(Dr\.|Prof\.)\s+', ''), 1) || '. ' ||
                            regexp_replace(p.full_name, '^.*\s', '') end,
          'photo', case when private.can_see_person(p.id) then p.photo_path end
        ) order by a.author_order
      )
      from public.publication_authors a
      join public.people p on p.id = a.person_id
      where a.publication_id = pub.id
    ),
    array(
      select a.person_id
      from public.publication_authors a
      join public.group_members gm on gm.person_id = a.person_id and gm.group_id = gid
      where a.publication_id = pub.id
      order by a.author_order
    )
  from public.publications pub
  where (private.is_admin() or private.is_group_member(gid))
    and exists (
      select 1 from public.publication_authors a
      join public.group_members gm on gm.person_id = a.person_id and gm.group_id = gid
      where a.publication_id = pub.id
    )
  order by pub.year desc, pub.citations desc
$$;
revoke execute on function public.group_publications(uuid) from public, anon;
grant execute on function public.group_publications(uuid) to authenticated;
