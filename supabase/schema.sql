create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default '未命名项目',
  current_html text,
  share_token text not null default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')) unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  html text,
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;
alter table public.messages enable row level security;

create policy "Users manage own projects"
  on public.projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own messages"
  on public.messages for all
  using (
    exists (
      select 1 from public.projects
      where projects.id = messages.project_id
        and projects.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects
      where projects.id = messages.project_id
        and projects.user_id = auth.uid()
    )
  );

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
