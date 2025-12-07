-- Backfill Profiles for existing users
-- This copies every user from the Authentication table into our new Profiles table
insert into public.profiles (id, role, full_name)
select id, 'student', raw_user_meta_data->>'full_name'
from auth.users
where id not in (select id from public.profiles);

-- Verify it worked
select * from public.profiles;
