defmodule Fog.Api.Event.Issue do
  alias Fog.Api.Event.Issue

  defstruct [
    :msgType,
    :msgId,
    :type,
    :integrationId,
    :integrationProjectId,
    :id,
    :issueId,
    :number,
    :state,
    :title,
    :url,
    :labels,
    :meta_tag
  ]

  def from_data(i) do
    %Issue{
      type: i.type,
      integrationId: "#{i.integration_id}",
      integrationProjectId: "#{i.integration_project_id}",
      # (gitlab issues have multiple ids)
      id: i.id,
      issueId: i.issueId,
      number: i.number,
      state: i.state,
      title: i.title,
      url: i.url,
      labels: i.labels,
      meta_tag: Fog.Issue.meta_tag(i)
    }
  end
end
