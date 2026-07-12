create extension if not exists pgcrypto;

create table if not exists generation_jobs (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  upstream_task_id text,
  mode text not null check (mode in ('text', 'image')),
  output_type text not null default 'video' check (output_type in ('video', 'image')),
  request_payload jsonb,
  prompt text not null,
  image_url text,
  video_url text,
  download_url text,
  status text not null default 'queued' check (
    status in ('queued', 'processing', 'succeeded', 'failed')
  ),
  credits_charged integer not null,
  ratio text,
  resolution text,
  duration integer,
  generate_audio boolean,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists generation_jobs_user_created_idx
  on generation_jobs (clerk_user_id, created_at desc, id desc);

create index if not exists generation_jobs_user_task_idx
  on generation_jobs (clerk_user_id, upstream_task_id);

alter table generation_jobs
  add column if not exists output_type text not null default 'video';

alter table generation_jobs
  add column if not exists request_payload jsonb;

alter table generation_jobs
  drop constraint if exists generation_jobs_status_check;

alter table generation_jobs
  add constraint generation_jobs_status_check
  check (status in ('queued', 'processing', 'succeeded', 'failed'));

alter table generation_jobs
  drop constraint if exists generation_jobs_output_type_check;

alter table generation_jobs
  add constraint generation_jobs_output_type_check
  check (output_type in ('video', 'image'));
