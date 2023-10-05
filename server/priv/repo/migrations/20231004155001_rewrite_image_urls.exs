defmodule Fog.Repo.Migrations.RewriteImageUrls do
  use Ecto.Migration

  def change do
    query!(
      """
      update public.user
      set image_url=regexp_replace(image_url, '^https://avatars\.dicebear\.com/api/(.+)/(.+)\.svg$', 'https://api.dicebear.com/7.x/\1/svg?seed=\2');
      """,
      []
    )
  end

  defp query!(q, args) do
    fn ->
      repo().query!(q, args, log: :info)
    end
  end
end
