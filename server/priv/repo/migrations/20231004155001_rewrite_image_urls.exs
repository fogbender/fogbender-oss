defmodule Fog.Repo.Migrations.RewriteImageUrls do
  use Ecto.Migration

  def change do
    execute(
      """
      update public.user
      set image_url=regexp_replace(image_url, '^https://avatars\.dicebear\.com/api/(.+)/(.+)\.svg$', 'https://api.dicebear.com/7.x/\1/svg?seed=\2');
      """,
      ""
    )

    execute(
      """
      update public.user set image_url = regexp_replace(image_url, '[,\s]', '+', 'g') where image_url similar to '%api.dice%[, ]%';
      """,
      ""
    )
  end
end
