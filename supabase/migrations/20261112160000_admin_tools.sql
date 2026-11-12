-- =====================================================================
-- Admin tools: log registrations in the activity feed
-- =====================================================================

create function public.tg_activity_registered() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.log_activity(new.id, 'person', 'was registered in the directory',
    trim(both ' ·' from new.title || ' · ' || new.department));
  return new;
end
$$;
revoke execute on function public.tg_activity_registered() from public, anon, authenticated;

create trigger activity_registered after insert on public.people
  for each row execute function public.tg_activity_registered();

-- Case-insensitive name search for the directory.
create index if not exists people_full_name_idx on public.people (lower(full_name));
