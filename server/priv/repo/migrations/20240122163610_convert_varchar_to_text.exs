defmodule Fog.Repo.Migrations.ConvertVarchatToText do
  use Ecto.Migration

  def change do
    alter table(:embeddings_source) do
      modify(:status, :text)
    end

    alter table(:file) do
      modify(:filename, :text, null: false)
      modify(:content_type, :text, null: false)
    end

    alter table(:fogvite) do
      modify(:invite_sent_to_email, :text)
      modify(:fogvite_code, :text, default: "")
    end

    alter table(:fogvite_code) do
      modify(:code, :text, null: false)
    end

    alter table(:message) do
      modify(:from_name_override, :text)
      modify(:from_image_url_override, :text)
      modify(:source, :text)
    end

    alter table(:org) do
      modify(:name, :text)
      modify(:domain, :text)
      modify(:logo, :text)
      modify(:site, :text)
    end

    alter table(:room) do
      modify(:agent_groups, {:array, :text})
    end

    alter table(:subscription_emails) do
      modify(:email, :text, null: false)
      modify(:user_info, :text)
    end

    alter table(:vendor_api_token) do
      modify(:scopes, {:array, :text})
    end

    alter table(:workspace) do
      modify(:description, :text)
    end
  end
end
