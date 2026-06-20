-- WatchPoint — let members see the names/photos of people in their own estate.
-- The base policy only allowed reading your OWN profile, which blocks the feed
-- reporter name, the organogram, and member lists. This adds estate-scoped
-- read visibility (you can see co-members in estates you belong to; never across estates).

create policy profiles_select_estate on profiles
  for select using (
    id in (
      select em.user_id
      from estate_members em
      where em.estate_id in (select current_user_estate_ids())
    )
  );
