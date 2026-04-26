alter table public.profiles
add column if not exists e2ee_public_key text;

alter table public.profiles
add constraint profiles_e2ee_public_key_format
check (e2ee_public_key is null or length(trim(e2ee_public_key)) > 0);
