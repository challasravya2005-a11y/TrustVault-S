-- TrustVault schema
-- Run in Supabase SQL Editor. This script is additive and preserves existing data.

create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null,
  password_hash text not null,
  role text not null check (role in ('admin', 'uploader', 'viewer')),
  created_at timestamptz not null default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  name text not null,
  category text not null default 'General',
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists documents_owner_idx on documents(owner_id);
create index if not exists documents_created_idx on documents(created_at desc);

create table if not exists document_access (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  permission text not null check (permission in ('read', 'edit')),
  granted_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (document_id, user_id)
);

create index if not exists document_access_user_idx on document_access(user_id);

create table if not exists audit_logs (
  id bigint generated always as identity primary key,
  user_id uuid references users(id) on delete set null,
  user_email text,
  action text not null check (
    action in ('LOGIN', 'LOGOUT', 'UPLOAD', 'VIEW', 'DOWNLOAD', 'EDIT', 'DELETE', 'SHARE', 'REVOKE')
  ),
  document_id uuid references documents(id) on delete set null,
  success boolean not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_idx on audit_logs(created_at desc);
create index if not exists audit_logs_action_idx on audit_logs(action);

-- Additive migration for existing installations that lack category support.
alter table documents add column if not exists category text not null default 'General';

-- The application uses the service-role key only on the server.
-- Enable RLS and provide no client-facing policies so anon/authenticated keys cannot read data directly.
alter table users enable row level security;
alter table documents enable row level security;
alter table document_access enable row level security;
alter table audit_logs enable row level security;

-- Private storage bucket. Service-role server code uploads/downloads files; no public URLs are used.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;
