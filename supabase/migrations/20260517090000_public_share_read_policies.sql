drop policy if exists "recommendation_packages_select_public_shared" on public.recommendation_packages;
create policy "recommendation_packages_select_public_shared"
on public.recommendation_packages
for select
using (share_slug is not null and status = 'completed');

drop policy if exists "client_requirements_select_public_shared" on public.client_requirements;
create policy "client_requirements_select_public_shared"
on public.client_requirements
for select
using (
  exists (
    select 1
    from public.recommendation_packages package
    where package.requirement_id = client_requirements.id
      and package.share_slug is not null
      and package.status = 'completed'
  )
);

drop policy if exists "generated_pdfs_select_public_shared" on public.generated_pdfs;
create policy "generated_pdfs_select_public_shared"
on public.generated_pdfs
for select
using (
  exists (
    select 1
    from public.recommendation_packages package
    where package.pdf_id = generated_pdfs.id
      and package.share_slug is not null
      and package.status = 'completed'
  )
);

drop policy if exists "generated_videos_select_public_shared" on public.generated_videos;
create policy "generated_videos_select_public_shared"
on public.generated_videos
for select
using (
  exists (
    select 1
    from public.recommendation_packages package
    where package.video_id = generated_videos.id
      and package.share_slug is not null
      and package.status = 'completed'
  )
);

drop policy if exists "property_recommendations_select_public_shared" on public.property_recommendations;
create policy "property_recommendations_select_public_shared"
on public.property_recommendations
for select
using (
  exists (
    select 1
    from public.recommendation_packages package
    where package.run_id = property_recommendations.run_id
      and package.share_slug is not null
      and package.status = 'completed'
  )
);
