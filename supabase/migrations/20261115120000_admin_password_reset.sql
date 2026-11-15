-- =====================================================================
-- Admins (the research office) may not have a directory entry, but still
-- need "Forgot password". The app checks this with the secret key only;
-- signed-in users and visitors cannot call it, so it can't be used to
-- discover who the admins are.
-- =====================================================================

create function public.admin_email_exists(p_email text)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from auth.users u
    join public.user_roles r on r.user_id = u.id and r.role = 'admin'
    where lower(u.email) = lower(trim(p_email))
  )
$$;
revoke execute on function public.admin_email_exists(text) from public, anon, authenticated;
grant execute on function public.admin_email_exists(text) to service_role;
