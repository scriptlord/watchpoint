-- WatchPoint — enable public self-signup (with the verification gate intact)

-- 1) Demo convenience: auto-confirm new emails so signup can sign in immediately.
--    (A production deployment would instead keep email confirmation on.)
create or replace function auth_auto_confirm()
returns trigger
language plpgsql
security definer
set search_path = auth, public
as $$
begin
  new.email_confirmed_at := coalesce(new.email_confirmed_at, now());
  return new;
end;
$$;

drop trigger if exists trg_auto_confirm on auth.users;
create trigger trg_auto_confirm
  before insert on auth.users
  for each row execute function auth_auto_confirm();

-- 2) A SELF-registered membership always lands as a pending, unverified resident.
--    Operators creating members for others (auth.uid() <> user_id) are unaffected,
--    and the seed (run as postgres, auth.uid() is null) is unaffected. This also
--    closes the gap where members_insert_self could set role/is_verified directly.
create or replace function force_self_registration_pending()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id = auth.uid() then
    new.role := 'resident';
    new.is_verified := false;
    new.status := 'pending';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_self_register_guard on estate_members;
create trigger trg_self_register_guard
  before insert on estate_members
  for each row execute function force_self_registration_pending();
