-- 1. Create Exams Table
create table public.exams (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users default auth.uid(),
  name text not null,
  date date not null,
  total_score numeric,
  total_net numeric,
  results jsonb -- Stores the detailed subject breakdown
);

-- 2. Create Solutions Table (Daily Logs)
create table public.solutions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users default auth.uid(),
  date date not null,
  subject text not null,
  topic text,
  count integer default 0,
  correct integer default 0,
  publisher text
);

-- 3. Setup Security (Row Level Security)
alter table public.exams enable row level security;
alter table public.solutions enable row level security;

-- 4. Create Policies (Initially allow public access for easy testing)
-- NOTE: In production, you would restrict this to (user_id = auth.uid())

create policy "Enable all access for everyone" on public.exams
for all using (true) with check (true);

create policy "Enable all access for everyone" on public.solutions
for all using (true) with check (true);
