alter table public.projects add column if not exists share_token text;

update public.projects
set share_token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
where share_token is null;

alter table public.projects
  alter column share_token set default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  alter column share_token set not null;

create unique index if not exists projects_share_token_key on public.projects (share_token);

create or replace function public.get_shared_project_html(token text)
returns text
language sql stable security definer
set search_path = ''
as $$
  select current_html
  from public.projects
  where share_token = token and current_html is not null
  limit 1;
$$;

revoke all on function public.get_shared_project_html(text) from public;
grant execute on function public.get_shared_project_html(text) to anon, authenticated;
