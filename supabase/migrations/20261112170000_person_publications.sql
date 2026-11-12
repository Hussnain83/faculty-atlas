-- =====================================================================
-- One call for a profile's publication list, with authors in order.
-- Co-authors the viewer may not see come back as "A. Raza" with no id or photo.
-- Returns nothing at all if the viewer may not see the person.
-- =====================================================================

create function public.person_publications(pid uuid)
returns table (
  id uuid,
  title text,
  venue text,
  kind public.publication_kind,
  year int,
  doi text,
  citations int,
  external_authors text[],
  authors jsonb
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
    )
  from public.publications pub
  where private.can_see_person(pid)
    and exists (select 1 from public.publication_authors me where me.publication_id = pub.id and me.person_id = pid)
  order by pub.year desc, pub.citations desc
$$;
revoke execute on function public.person_publications(uuid) from public, anon;
grant execute on function public.person_publications(uuid) to authenticated;
