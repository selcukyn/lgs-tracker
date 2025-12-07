-- 1. 'profiles' tablosuna email sütunu ekle
alter table public.profiles add column if not exists email text;

-- 2. Tetikleyiciyi (Trigger) Güncelle: Yeni üyelerin emailini de kaydetsin
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, role, full_name, email)
  values (new.id, 'student', new.raw_user_meta_data->>'full_name', new.email);
  return new;
end;
$$ language plpgsql security definer;

-- 3. MEVCUT KULLANICILARI DÜZELTME (Backfill)
-- Auth tablosundaki herkesi profiles tablosuna ekler (veya varsa emailini günceller)
insert into public.profiles (id, email, role, full_name)
select id, email, 'student', raw_user_meta_data->>'full_name'
from auth.users
on conflict (id) do update
set email = excluded.email;

-- 4. KENDİNİZİ ADMİN YAPIN
-- 'admin@example.com' yerine kendi email adresinizi yazıp bu satırı çalıştırın.
update public.profiles
set role = 'admin'
where email = 'admin@example.com';
