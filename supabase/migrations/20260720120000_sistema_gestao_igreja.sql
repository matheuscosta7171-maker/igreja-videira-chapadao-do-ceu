-- Sistema de Gestão da Igreja Videira — Chapadão do Céu
-- Migração segura e idempotente. Não apaga tabelas ou dados existentes.
begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  avatar_path text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('superadmin','admin','pastor','leader','member')),
  assigned_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create or replace function public.has_any_role(required_roles text[])
returns boolean language sql stable security definer set search_path=public as $$
  select exists (
    select 1 from public.user_roles ur
    join public.profiles p on p.id=ur.user_id and p.active
    where ur.user_id=auth.uid() and ur.role=any(required_roles)
  );
$$;

create or replace function public.is_superadmin()
returns boolean language sql stable security definer set search_path=public as $$
  select public.has_any_role(array['superadmin']);
$$;

grant execute on function public.has_any_role(text[]) to anon, authenticated;
grant execute on function public.is_superadmin() to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,full_name,email)
  values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),new.email)
  on conflict(id) do update set email=excluded.email,updated_at=now();
  insert into public.user_roles(user_id,role)
  values(new.id,'member') on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert or update of email on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles(id,full_name,email)
select id,coalesce(raw_user_meta_data->>'full_name',''),email from auth.users
on conflict(id) do update set email=excluded.email,updated_at=now();

insert into public.user_roles(user_id,role)
select id,'member' from auth.users on conflict do nothing;

create table if not exists public.cells (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  leader_id uuid references public.profiles(id),
  discipulator_name text,
  meeting_day text,
  meeting_time time,
  public_address text,
  active boolean not null default true,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leader_cells (
  leader_id uuid not null references public.profiles(id) on delete cascade,
  cell_id uuid not null references public.cells(id) on delete cascade,
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  primary key(leader_id,cell_id)
);

create table if not exists public.public_leaders (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  discipleship text not null,
  whatsapp text,
  meeting_day text,
  meeting_time text,
  address_text text,
  display_order integer not null default 0,
  active boolean not null default true,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_leaders_whatsapp check (whatsapp is null or whatsapp ~ '^55[0-9]{10,11}$')
);

create table if not exists public.cell_reports (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells(id),
  leader_id uuid not null references public.profiles(id),
  meeting_date date not null,
  members_count integer not null default 0 check(members_count>=0),
  regular_attendees_count integer not null default 0 check(regular_attendees_count>=0),
  visitors_count integer not null default 0 check(visitors_count>=0),
  total_attendance integer generated always as (members_count+regular_attendees_count+visitors_count) stored,
  offering_pix numeric(12,2) not null default 0 check(offering_pix>=0),
  offering_cash numeric(12,2) not null default 0 check(offering_cash>=0),
  total_offering numeric(12,2) generated always as (offering_pix+offering_cash) stored,
  salvation_appeals_count integer not null default 0 check(salvation_appeals_count>=0),
  observations text check(char_length(observations)<=2000),
  status text not null default 'draft' check(status in ('draft','submitted','reviewed','returned')),
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(cell_id,meeting_date)
);

create table if not exists public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  submitter_id uuid references public.profiles(id),
  name text not null check(char_length(name) between 2 and 120),
  contact text check(contact is null or char_length(contact)<=160),
  request_text text not null check(char_length(request_text) between 10 and 4000),
  anonymous boolean not null default false,
  contact_allowed boolean not null default false,
  status text not null default 'received' check(status in ('received','praying','answered','archived','rejected')),
  internal_notes text check(internal_notes is null or char_length(internal_notes)<=2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pastoral_visits (
  id uuid primary key default gen_random_uuid(),
  submitter_id uuid references public.profiles(id),
  pastor_id uuid references public.profiles(id),
  name text not null check(char_length(name) between 2 and 120),
  phone text not null check(char_length(phone) between 8 and 30),
  email text check(email is null or char_length(email)<=160),
  visit_type text not null check(visit_type in ('pastoral_visit','counseling','prayer','hospital','family','other')),
  reason_summary text not null check(char_length(reason_summary) between 5 and 500),
  desired_date date not null,
  desired_time time not null,
  address_text text check(address_text is null or char_length(address_text)<=500),
  observations text check(observations is null or char_length(observations)<=1500),
  contact_consent boolean not null check(contact_consent),
  status text not null default 'requested' check(status in ('requested','awaiting_confirmation','confirmed','reschedule_requested','declined','completed','cancelled')),
  proposed_date date,
  proposed_time time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists pastoral_visits_confirmed_slot
on public.pastoral_visits(pastor_id,desired_date,desired_time)
where status='confirmed' and pastor_id is not null;

create table if not exists public.pastor_availability (
  id uuid primary key default gen_random_uuid(),
  pastor_id uuid not null references public.profiles(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  available boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  constraint availability_period check(ends_at>starts_at)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.testimonies (
  id uuid primary key default gen_random_uuid(),
  submitter_id uuid references public.profiles(id),
  name text not null check(char_length(name) between 2 and 120),
  title text not null check(char_length(title) between 3 and 160),
  testimony_text text not null check(char_length(testimony_text) between 20 and 6000),
  event_date date,
  publication_authorized boolean not null default false,
  show_name boolean not null default false,
  contact text check(contact is null or char_length(contact)<=160),
  status text not null default 'pending' check(status in ('pending','approved','published','rejected','archived')),
  featured boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  published boolean not null default false,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.homepage_sections (
  id uuid primary key default gen_random_uuid(),
  section_key text not null unique,
  title text,
  body text,
  media_path text,
  link_url text,
  display_order integer not null default 0,
  published boolean not null default false,
  archived boolean not null default false,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.church_schedule (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location_text text,
  event_type text not null default 'event',
  published boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_period check(ends_at is null or ends_at>=starts_at)
);

create table if not exists public.church_contacts (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  contact_type text not null check(contact_type in ('phone','whatsapp','email','website','social','group')),
  value text not null,
  published boolean not null default false,
  archived boolean not null default false,
  display_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.giving_information (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Dízimos e Ofertas',
  explanation text,
  pix_key text,
  beneficiary text,
  bank_name text,
  qr_code_path text,
  instructions text,
  published boolean not null default false,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.construction_projects (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Construção do Nosso Prédio',
  introduction text,
  description text,
  objective text,
  progress_text text,
  project_media_path text,
  project_pdf_path text,
  video_url text,
  giving_text text,
  contact_url text,
  latest_update date,
  published boolean not null default false,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.construction_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.construction_projects(id) on delete cascade,
  title text not null,
  description text,
  milestone_date date,
  status text not null default 'planned' check(status in ('planned','in_progress','completed')),
  display_order integer not null default 0
);

create table if not exists public.church_addresses (
  id uuid primary key default gen_random_uuid(),
  church_name text not null default 'Igreja Videira',
  street text,
  street_number text,
  district text,
  city text,
  state text,
  postal_code text,
  complement text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  google_maps_url text,
  published boolean not null default false,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  body text,
  main_verse text,
  pdf_path text,
  image_path text,
  video_url text,
  notes text,
  status text not null default 'draft' check(status in ('draft','published','archived')),
  published_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.media_files (
  id uuid primary key default gen_random_uuid(),
  bucket text not null default 'church-public',
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null check(size_bytes between 1 and 15728640),
  entity_type text,
  entity_id uuid,
  active boolean not null default true,
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated by default as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  summary text,
  created_at timestamptz not null default now()
);

-- Dados públicos reais já existentes no projeto. Nenhum endereço fictício é migrado.
insert into public.public_leaders(slug,name,discipleship,whatsapp,meeting_day,meeting_time,display_order)
values
('matheus-costa','Matheus Costa','Matheus','5564999774263','Sábado','19h30',1),
('matheus-victor','Matheus Victor','Matheus','5564999551166','Quarta-feira','19h30',2),
('daniel','Daniel','Matheus','5564999829078','Quarta-feira','19h30',3),
('isadora','Isadora','Matheus','5564992477061','Sábado','19h30',4),
('klebson','Klebson','Klebson','5564999421889','Sábado','19h30',5),
('rhayngrid','Rhayngrid','Klebson','5564992694958','Sábado','19h30',6),
('wiliane','Wiliane','Klebson','5564999773325','Sábado','19h30',7),
('antonio','Antônio','Antônio','5564992463291','Quarta-feira','19h30',8),
('humberto','Humberto','Antônio','5564999567148','Quarta-feira','19h30',9),
('jose-nivolan','José Nivolan','Antônio','5564999345232','Quarta-feira','19h30',10),
('maycon','Maycon','Antônio','5564996527688','Quarta-feira','19h30',11),
('elimar','Elimar','Antônio','5564996160524','Quarta-feira','19h30',12),
('edson','Edson','Edson','5564999775360','Quarta-feira','19h30',13),
('messias','Messias','Edson','5564996990705','Quarta-feira','19h30',14),
('enio','Enio','Edson','5564999364212','Quarta-feira','19h30',15),
('celio','Celio','Edson','5564996231367','Quarta-feira','19h30',16)
on conflict(slug) do update set name=excluded.name,discipleship=excluded.discipleship,whatsapp=excluded.whatsapp,meeting_day=excluded.meeting_day,meeting_time=excluded.meeting_time,display_order=excluded.display_order;

create or replace function public.can_manage_content()
returns boolean language sql stable security definer set search_path=public as $$
  select public.has_any_role(array['superadmin','admin']);
$$;

create or replace function public.can_view_pastoral_data()
returns boolean language sql stable security definer set search_path=public as $$
  select public.has_any_role(array['superadmin','admin','pastor']);
$$;

create or replace function public.can_view_all_reports()
returns boolean language sql stable security definer set search_path=public as $$
  select public.has_any_role(array['superadmin','admin','pastor']);
$$;

grant execute on function public.can_manage_content() to anon,authenticated;
grant execute on function public.can_view_pastoral_data() to anon,authenticated;
grant execute on function public.can_view_all_reports() to anon,authenticated;

create or replace function public.owns_cell(target_cell uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.leader_cells where leader_id=auth.uid() and cell_id=target_cell);
$$;
grant execute on function public.owns_cell(uuid) to authenticated;

-- RLS
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.cells enable row level security;
alter table public.leader_cells enable row level security;
alter table public.public_leaders enable row level security;
alter table public.cell_reports enable row level security;
alter table public.prayer_requests enable row level security;
alter table public.pastoral_visits enable row level security;
alter table public.pastor_availability enable row level security;
alter table public.notifications enable row level security;
alter table public.testimonies enable row level security;
alter table public.site_settings enable row level security;
alter table public.homepage_sections enable row level security;
alter table public.church_schedule enable row level security;
alter table public.church_contacts enable row level security;
alter table public.giving_information enable row level security;
alter table public.construction_projects enable row level security;
alter table public.construction_milestones enable row level security;
alter table public.church_addresses enable row level security;
alter table public.content_pages enable row level security;
alter table public.media_files enable row level security;
alter table public.audit_logs enable row level security;

-- Perfis e papéis
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using(id=auth.uid() or public.has_any_role(array['superadmin','admin','pastor']));
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated using(id=auth.uid() or public.is_superadmin()) with check(id=auth.uid() or public.is_superadmin());
drop policy if exists roles_select on public.user_roles;
create policy roles_select on public.user_roles for select to authenticated using(user_id=auth.uid() or public.is_superadmin());
drop policy if exists roles_superadmin_all on public.user_roles;
create policy roles_superadmin_all on public.user_roles for all to authenticated using(public.is_superadmin()) with check(public.is_superadmin() and assigned_by=auth.uid());

-- Células e relatórios
drop policy if exists cells_public_read on public.cells;
create policy cells_public_read on public.cells for select to anon,authenticated using((published and active) or public.can_view_all_reports() or public.owns_cell(id));
drop policy if exists cells_admin_all on public.cells;
create policy cells_admin_all on public.cells for all to authenticated using(public.can_manage_content()) with check(public.can_manage_content());
drop policy if exists leader_cells_select on public.leader_cells;
create policy leader_cells_select on public.leader_cells for select to authenticated using(leader_id=auth.uid() or public.can_view_all_reports());
drop policy if exists leader_cells_admin_all on public.leader_cells;
create policy leader_cells_admin_all on public.leader_cells for all to authenticated using(public.can_manage_content()) with check(public.can_manage_content());
drop policy if exists public_leaders_read on public.public_leaders;
create policy public_leaders_read on public.public_leaders for select to anon,authenticated using((published and active) or public.can_manage_content());
drop policy if exists public_leaders_admin_all on public.public_leaders;
create policy public_leaders_admin_all on public.public_leaders for all to authenticated using(public.can_manage_content()) with check(public.can_manage_content());
drop policy if exists reports_select on public.cell_reports;
create policy reports_select on public.cell_reports for select to authenticated using(public.can_view_all_reports() or leader_id=auth.uid() or public.owns_cell(cell_id));
drop policy if exists reports_insert on public.cell_reports;
create policy reports_insert on public.cell_reports for insert to authenticated with check(public.can_view_all_reports() or (leader_id=auth.uid() and public.owns_cell(cell_id) and created_by=auth.uid()));
drop policy if exists reports_update on public.cell_reports;
create policy reports_update on public.cell_reports for update to authenticated using(public.can_view_all_reports() or ((leader_id=auth.uid() or public.owns_cell(cell_id)) and status in ('draft','returned'))) with check(public.can_view_all_reports() or (leader_id=auth.uid() and status in ('draft','submitted')));

-- Formulários privados
drop policy if exists prayer_public_insert on public.prayer_requests;
create policy prayer_public_insert on public.prayer_requests for insert to anon,authenticated with check(status='received' and internal_notes is null and (submitter_id is null or submitter_id=auth.uid()));
drop policy if exists prayer_select on public.prayer_requests;
create policy prayer_select on public.prayer_requests for select to authenticated using(public.can_view_pastoral_data() or submitter_id=auth.uid());
drop policy if exists prayer_staff_update on public.prayer_requests;
create policy prayer_staff_update on public.prayer_requests for update to authenticated using(public.can_view_pastoral_data()) with check(public.can_view_pastoral_data());
drop policy if exists visits_public_insert on public.pastoral_visits;
create policy visits_public_insert on public.pastoral_visits for insert to anon,authenticated with check(status='requested' and pastor_id is null and (submitter_id is null or submitter_id=auth.uid()));
drop policy if exists visits_select on public.pastoral_visits;
create policy visits_select on public.pastoral_visits for select to authenticated using(public.can_view_pastoral_data() or submitter_id=auth.uid());
drop policy if exists visits_staff_update on public.pastoral_visits;
create policy visits_staff_update on public.pastoral_visits for update to authenticated using(public.can_view_pastoral_data()) with check(public.can_view_pastoral_data());
drop policy if exists availability_staff on public.pastor_availability;
create policy availability_staff on public.pastor_availability for all to authenticated using(public.can_view_pastoral_data()) with check(public.can_view_pastoral_data());
drop policy if exists notifications_own on public.notifications;
create policy notifications_own on public.notifications for select to authenticated using(recipient_id=auth.uid());
drop policy if exists notifications_own_update on public.notifications;
create policy notifications_own_update on public.notifications for update to authenticated using(recipient_id=auth.uid()) with check(recipient_id=auth.uid());

-- Testemunhos
drop policy if exists testimonies_public_insert on public.testimonies;
create policy testimonies_public_insert on public.testimonies for insert to anon,authenticated with check(status='pending' and featured=false and published_at is null and (submitter_id is null or submitter_id=auth.uid()));
drop policy if exists testimonies_public_read on public.testimonies;
create policy testimonies_public_read on public.testimonies for select to anon,authenticated using((status='published' and publication_authorized) or public.can_manage_content() or submitter_id=auth.uid());
drop policy if exists testimonies_admin_update on public.testimonies;
create policy testimonies_admin_update on public.testimonies for update to authenticated using(public.can_manage_content()) with check(public.can_manage_content());

-- Conteúdo público gerenciável
drop policy if exists settings_public_read on public.site_settings;
create policy settings_public_read on public.site_settings for select to anon,authenticated using(published or public.can_manage_content());
drop policy if exists settings_admin_all on public.site_settings;
create policy settings_admin_all on public.site_settings for all to authenticated using(public.can_manage_content()) with check(public.can_manage_content());
drop policy if exists homepage_public_read on public.homepage_sections;
create policy homepage_public_read on public.homepage_sections for select to anon,authenticated using((published and not archived) or public.can_manage_content());
drop policy if exists homepage_admin_all on public.homepage_sections;
create policy homepage_admin_all on public.homepage_sections for all to authenticated using(public.can_manage_content()) with check(public.can_manage_content());
drop policy if exists schedule_public_read on public.church_schedule;
create policy schedule_public_read on public.church_schedule for select to anon,authenticated using((published and not archived) or public.can_manage_content());
drop policy if exists schedule_admin_all on public.church_schedule;
create policy schedule_admin_all on public.church_schedule for all to authenticated using(public.can_manage_content()) with check(public.can_manage_content());
drop policy if exists contacts_public_read on public.church_contacts;
create policy contacts_public_read on public.church_contacts for select to anon,authenticated using((published and not archived) or public.can_manage_content());
drop policy if exists contacts_admin_all on public.church_contacts;
create policy contacts_admin_all on public.church_contacts for all to authenticated using(public.can_manage_content()) with check(public.can_manage_content());
drop policy if exists giving_public_read on public.giving_information;
create policy giving_public_read on public.giving_information for select to anon,authenticated using(published or public.can_manage_content());
drop policy if exists giving_admin_all on public.giving_information;
create policy giving_admin_all on public.giving_information for all to authenticated using(public.can_manage_content()) with check(public.can_manage_content());
drop policy if exists construction_public_read on public.construction_projects;
create policy construction_public_read on public.construction_projects for select to anon,authenticated using(published or public.can_manage_content());
drop policy if exists construction_admin_all on public.construction_projects;
create policy construction_admin_all on public.construction_projects for all to authenticated using(public.can_manage_content()) with check(public.can_manage_content());
drop policy if exists milestones_public_read on public.construction_milestones;
create policy milestones_public_read on public.construction_milestones for select to anon,authenticated using(exists(select 1 from public.construction_projects p where p.id=project_id and p.published) or public.can_manage_content());
drop policy if exists milestones_admin_all on public.construction_milestones;
create policy milestones_admin_all on public.construction_milestones for all to authenticated using(public.can_manage_content()) with check(public.can_manage_content());
drop policy if exists address_public_read on public.church_addresses;
create policy address_public_read on public.church_addresses for select to anon,authenticated using(published or public.can_manage_content());
drop policy if exists address_admin_all on public.church_addresses;
create policy address_admin_all on public.church_addresses for all to authenticated using(public.can_manage_content()) with check(public.can_manage_content());
drop policy if exists pages_public_read on public.content_pages;
create policy pages_public_read on public.content_pages for select to anon,authenticated using(status='published' or public.can_manage_content());
drop policy if exists pages_admin_all on public.content_pages;
create policy pages_admin_all on public.content_pages for all to authenticated using(public.can_manage_content()) with check(public.can_manage_content());
drop policy if exists media_admin_all on public.media_files;
create policy media_admin_all on public.media_files for all to authenticated using(public.can_manage_content()) with check(public.can_manage_content() and uploaded_by=auth.uid());
drop policy if exists audit_superadmin_read on public.audit_logs;
create policy audit_superadmin_read on public.audit_logs for select to authenticated using(public.is_superadmin());

-- Notificações internas de visita
create or replace function public.notify_visit_change()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_op='INSERT' then
    insert into public.notifications(recipient_id,type,title,message,entity_type,entity_id)
    select distinct ur.user_id,'visit_requested','Nova solicitação de visita','Uma nova solicitação pastoral aguarda análise.','pastoral_visit',new.id
    from public.user_roles ur where ur.role in ('superadmin','admin','pastor');
  elsif new.status is distinct from old.status and new.submitter_id is not null then
    insert into public.notifications(recipient_id,type,title,message,entity_type,entity_id)
    values(new.submitter_id,'visit_status','Atualização da visita','Sua solicitação pastoral foi atualizada para: '||new.status||'.','pastoral_visit',new.id);
  end if;
  return new;
end;
$$;
drop trigger if exists pastoral_visit_notifications on public.pastoral_visits;
create trigger pastoral_visit_notifications after insert or update of status on public.pastoral_visits
for each row execute function public.notify_visit_change();

-- Auditoria sem conteúdo sensível
create or replace function public.write_audit_log()
returns trigger language plpgsql security definer set search_path=public as $$
declare record_id text;
begin
  record_id=coalesce((to_jsonb(new)->>'id'),(to_jsonb(old)->>'id'),'');
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,summary)
  values(auth.uid(),lower(tg_op),tg_table_name,record_id,tg_op||' em '||tg_table_name);
  return coalesce(new,old);
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array['user_roles','cells','leader_cells','public_leaders','site_settings','homepage_sections','church_schedule','church_contacts','giving_information','construction_projects','construction_milestones','church_addresses','content_pages'] loop
    execute format('drop trigger if exists audit_changes on public.%I',table_name);
    execute format('create trigger audit_changes after insert or update or delete on public.%I for each row execute function public.write_audit_log()',table_name);
  end loop;
end $$;

-- updated_at
do $$
declare table_name text;
begin
  foreach table_name in array array['profiles','cells','public_leaders','cell_reports','prayer_requests','pastoral_visits','testimonies','church_schedule','church_contacts','content_pages'] loop
    execute format('drop trigger if exists set_updated_at on public.%I',table_name);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',table_name);
  end loop;
end $$;

-- Conteúdo antigo passa a usar papéis, preservando leitura pública.
drop policy if exists "Somente administrador insere palavras" on public.palavras;
drop policy if exists "Somente administrador atualiza palavras" on public.palavras;
drop policy if exists "Somente administrador exclui palavras" on public.palavras;
create policy "Equipe gerencia palavras" on public.palavras for all to authenticated using(public.can_manage_content()) with check(public.can_manage_content());
drop policy if exists "Administrador insere materiais do jejum" on public.jejum_materiais;
drop policy if exists "Administrador exclui materiais do jejum" on public.jejum_materiais;
create policy "Equipe gerencia materiais do jejum" on public.jejum_materiais for all to authenticated using(public.can_manage_content()) with check(public.can_manage_content());

-- Storage público somente para mídia aprovada do site.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('church-public','church-public',true,15728640,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict(id) do update set public=true,file_size_limit=15728640,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists church_public_read on storage.objects;
create policy church_public_read on storage.objects for select to anon,authenticated using(bucket_id='church-public');
drop policy if exists church_public_manage on storage.objects;
create policy church_public_manage on storage.objects for all to authenticated using(bucket_id='church-public' and public.can_manage_content()) with check(bucket_id='church-public' and public.can_manage_content());

drop policy if exists "Administrador envia arquivos" on storage.objects;
drop policy if exists "Administrador atualiza arquivos" on storage.objects;
drop policy if exists "Administrador exclui arquivos" on storage.objects;
drop policy if exists "Administrador envia materiais do jejum" on storage.objects;
drop policy if exists "Administrador exclui materiais do jejum" on storage.objects;
drop policy if exists legacy_content_manage on storage.objects;
create policy legacy_content_manage on storage.objects for all to authenticated
using(bucket_id in ('palavras','jejum') and public.can_manage_content())
with check(bucket_id in ('palavras','jejum') and public.can_manage_content());

-- Privilégios mínimos. RLS continua sendo obrigatório.
grant usage on schema public to anon,authenticated;
grant select on public.public_leaders,public.site_settings,public.homepage_sections,public.church_schedule,public.church_contacts,public.giving_information,public.construction_projects,public.construction_milestones,public.church_addresses,public.content_pages to anon,authenticated;
grant insert on public.prayer_requests,public.pastoral_visits,public.testimonies to anon,authenticated;
grant select,insert,update on public.profiles,public.user_roles,public.cells,public.leader_cells,public.cell_reports,public.prayer_requests,public.pastoral_visits,public.pastor_availability,public.notifications,public.testimonies,public.public_leaders,public.site_settings,public.homepage_sections,public.church_schedule,public.church_contacts,public.giving_information,public.construction_projects,public.construction_milestones,public.church_addresses,public.content_pages,public.media_files to authenticated;
grant select on public.audit_logs to authenticated;
grant usage,select on all sequences in schema public to authenticated;

commit;

-- Após criar o primeiro usuário, execute separadamente no SQL Editor:
-- insert into public.user_roles(user_id,role,assigned_by)
-- select id,'superadmin',id from auth.users where lower(email)=lower('SEU_EMAIL_REAL')
-- on conflict(user_id,role) do nothing;
