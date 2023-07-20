defmodule Fog.Repo.Migrations.AddFeatureOptionEmailDigestTemplateColumn do
  use Ecto.Migration

  def change do
    alter table(:feature_option) do
      add(:email_digest_template, :text, null: true)
    end
  end
end
