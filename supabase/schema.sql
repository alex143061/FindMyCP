create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.devices (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  device_name text not null,
  device_model text not null,
  platform text not null,
  tracking_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.location_history (
  id uuid primary key,
  device_id uuid not null references public.devices (id) on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy double precision,
  altitude double precision,
  speed double precision,
  heading double precision,
  battery_level integer check (battery_level between 0 and 100),
  recorded_at timestamptz not null,
  uploaded_at timestamptz not null default now()
);

create index if not exists devices_user_id_idx
  on public.devices (user_id);
create index if not exists location_history_device_recorded_idx
  on public.location_history (device_id, recorded_at desc);

alter table public.profiles enable row level security;
alter table public.devices enable row level security;
alter table public.location_history enable row level security;

drop policy if exists "Users can read their profile" on public.profiles;
create policy "Users can read their profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists "Users can update their profile" on public.profiles;
create policy "Users can update their profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists "Users can read their devices" on public.devices;
create policy "Users can read their devices"
  on public.devices for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users can register their devices" on public.devices;
create policy "Users can register their devices"
  on public.devices for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can update their devices" on public.devices;
create policy "Users can update their devices"
  on public.devices for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can read their device locations" on public.location_history;
create policy "Users can read their device locations"
  on public.location_history for select to authenticated
  using (
    exists (
      select 1
      from public.devices
      where devices.id = location_history.device_id
        and devices.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can upload locations for their devices" on public.location_history;
create policy "Users can upload locations for their devices"
  on public.location_history for insert to authenticated
  with check (
    exists (
      select 1
      from public.devices
      where devices.id = location_history.device_id
        and devices.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can update locations for their devices" on public.location_history;
create policy "Users can update locations for their devices"
  on public.location_history for update to authenticated
  using (
    exists (
      select 1
      from public.devices
      where devices.id = location_history.device_id
        and devices.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.devices
      where devices.id = location_history.device_id
        and devices.user_id = (select auth.uid())
    )
  );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

grant select, update on public.profiles to authenticated;
grant select, insert, update on public.devices to authenticated;
grant select, insert, update on public.location_history to authenticated;
