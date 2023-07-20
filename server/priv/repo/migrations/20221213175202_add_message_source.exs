defmodule Fog.Repo.Migrations.AddMessageSource do
  use Ecto.Migration

  def change do
    alter table(:message) do
      add(:source, :string)
    end
  end
end
