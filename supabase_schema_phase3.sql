-- 1. Create Role Enum
create type user_role as enum ('admin', 'teacher', 'student');

-- 2. Create Profiles Table (Linked to auth.users)
create table public.profiles (
  id uuid references auth.users not null primary key,
  role user_role default 'student',
  full_name text,
  class_group text -- Optional: For grouping students (e.g., '8-A')
);

-- 3. Enable RLS
alter table public.profiles enable row level security;

-- 4. Create Policies for Profiles

-- Everyone can read profiles (needed for teachers/admins to see names)
create policy "Public profiles are viewable by everyone" 
on public.profiles for select 
using (true);

-- Users can insert their own profile (Trigger usually handles this, but allowed for manual)
create policy "Users can insert their own profile" 
on public.profiles for insert 
with check (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update own profile" 
on public.profiles for update 
using (auth.uid() = id);

-- Admins can update any profile (e.g. promoting roles)
create policy "Admins can update any profile" 
on public.profiles for update 
using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- 5. Auto-create Profile on Signup (Trigger)
-- This ensures every new user gets a 'student' profile automatically
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'student');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
