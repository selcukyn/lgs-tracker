-- Allow Admins to Delete Profiles
create policy "Admins can delete profiles"
on public.profiles
for delete
using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
