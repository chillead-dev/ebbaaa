# other-vercel-social

Static site + Vercel Serverless Functions (`/api`) + Supabase Postgres.

## Setup (Supabase)
Run this in Supabase SQL editor:

```sql
create table if not exists users (
  id bigserial primary key,
  username text unique not null,
  pass_hash text not null,
  created_at timestamptz default now(),
  is_banned boolean default false,
  is_verified boolean default false,
  role text default 'user' check (role in ('user','admin'))
);

create table if not exists posts (
  id bigserial primary key,
  author_id bigint references users(id) on delete cascade,
  text text not null,
  created_at timestamptz default now()
);

create index if not exists idx_posts_created on posts(created_at desc);
```

## Vercel env vars
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- JWT_SECRET
- OWNER_ADMIN_TOKEN (long random string; for first admin promotion at login)

## Local
This project is designed for Vercel deployment. For local testing, you can use any static server for /public and run functions with vercel dev.
