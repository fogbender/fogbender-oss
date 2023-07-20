defmodule Test.Repo.IntegrationIssue do
  use Fog.RepoCase, async: true
  alias Fog.{Repo, Data}

  setup do
    v = vendor()
    w = workspace(v)
    integration = integration(w, "gitlab", "PROJECT1")

    params = %{
      workspace_id: w.id,
      type: integration.type,
      project_id: integration.project_id,
      issue_id: "ISSUE1",
      issue_number: "1",
      url: "https://test.issue",
      name: "TEST ISSUE 1",
      state: "open"
    }

    Kernel.binding()
  end

  test "create integration issue", ctx do
    assert %Data.IntegrationIssue{id: id} = Repo.IntegrationIssue.insert_or_update(ctx.params)

    assert %Data.IntegrationIssue{
             issue_id: "ISSUE1",
             issue_number: "1",
             url: "https://test.issue",
             name: "TEST ISSUE 1"
           } = Repo.get(Data.IntegrationIssue, id)
  end

  test "update integration issue", ctx do
    assert %Data.IntegrationIssue{id: id} = Repo.IntegrationIssue.insert_or_update(ctx.params)

    params = %{
      ctx.params
      | issue_number: "01",
        url: "https://test.issue.new",
        name: "TEST ISSUE NEW"
    }

    assert %Data.IntegrationIssue{id: ^id} = Repo.IntegrationIssue.insert_or_update(params)

    assert %Data.IntegrationIssue{
             issue_number: "01",
             url: "https://test.issue.new",
             name: "TEST ISSUE NEW"
           } = Repo.get(Data.IntegrationIssue, id)
  end
end
