-- Daily, phase 1: tables for the offline-first sync.
--
-- Every synced table has the same sync columns:
--   updated_at  set by the client when it changes a row; the newer change wins
--   deleted     tombstone instead of a real delete, so deletions sync as well
--   synced_at   set by the database on every write; clients pull rows written after their cursor

create function public.set_synced_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.synced_at := clock_timestamp();
  return new;
end;
$$;

-- Last write wins for every writer (app and Edge Functions): an update with an older timestamp is dropped.
create function public.keep_newer_row()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.updated_at < old.updated_at then
    return null;
  end if;
  new.synced_at := clock_timestamp();
  return new;
end;
$$;

create table public.categories (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  sort_order double precision not null default 0,
  updated_at timestamptz not null,
  deleted boolean not null default false,
  synced_at timestamptz not null default clock_timestamp(),
  primary key (user_id, id)
);

create table public.habits (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category_id text,
  schedules jsonb not null,
  sort_order double precision not null default 0,
  archived boolean not null default false,
  system text,
  updated_at timestamptz not null,
  deleted boolean not null default false,
  synced_at timestamptz not null default clock_timestamp(),
  primary key (user_id, id)
);

-- The Shortcuts API addresses habits by slug.
create unique index habits_slug on public.habits (user_id, slug) where not deleted;

-- Every tap is its own row, so taps from several devices add up instead of overwriting each other.
create table public.habit_events (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  habit_id text not null,
  day date not null,
  type text not null check (type in ('add', 'skip')),
  amount integer not null default 0,
  created_at timestamptz not null,
  source text not null default 'app' check (source in ('app', 'api')),
  updated_at timestamptz not null,
  deleted boolean not null default false,
  synced_at timestamptz not null default clock_timestamp(),
  primary key (user_id, id)
);

create index habit_events_by_habit_day on public.habit_events (user_id, habit_id, day);

create table public.settings (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  value jsonb not null,
  updated_at timestamptz not null,
  deleted boolean not null default false,
  synced_at timestamptz not null default clock_timestamp(),
  primary key (user_id, id)
);

-- The same index, triggers, row level security and realtime for all synced tables.
do $$
declare
  t text;
begin
  foreach t in array array['categories', 'habits', 'habit_events', 'settings'] loop
    execute format('create index %I on public.%I (user_id, synced_at)', t || '_by_synced_at', t);
    execute format('create trigger set_synced_at before insert on public.%I for each row execute function public.set_synced_at()', t);
    execute format('create trigger keep_newer_row before update on public.%I for each row execute function public.keep_newer_row()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "Own rows" on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t
    );
    execute format('alter publication supabase_realtime add table public.%I', t);
  end loop;
end;
$$;
