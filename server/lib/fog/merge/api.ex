defmodule Fog.Merge.Api do
  @merge_url "https://api.merge.dev"

  alias Fog.{Repo}

  def link_token(workspace, salt) do
    {:ok, %Tesla.Env{body: body}} =
      client()
      |> Tesla.post("/api/integrations/create-link-token", %{
        "end_user_origin_id" => salt,
        "end_user_organization_name" => workspace.vendor.name,
        "end_user_email_address" => Repo.Workspace.forward_email_address(workspace.id),
        "categories" => ["crm"]
      })

    body["link_token"]
  end

  def linked_accounts(end_user_origin_ids) do
    linked_accounts(end_user_origin_ids, [], [])
  end

  def linked_accounts(_, [cursor: nil], acc) do
    acc |> List.flatten()
  end

  def linked_accounts(end_user_origin_ids, cursor, acc) do
    {:ok, %Tesla.Env{body: %{"next" => next, "results" => results}}} =
      client()
      |> Tesla.get("https://api.merge.dev/api/crm/v1/linked-accounts",
        query:
          [
            end_user_origin_ids: end_user_origin_ids,
            page_size: 100
          ] ++ cursor
      )

    linked_accounts(end_user_origin_ids, [cursor: next], [results | acc])
  end

  def account_token(public_token) do
    url = "https://api.merge.dev/api/crm/v1/account-token/#{public_token}"

    {:ok, %Tesla.Env{body: %{"account_token" => account_token}, status: 200}} =
      client()
      |> Tesla.get(url)

    account_token
  end

  def account_details(account_token) do
    url = "https://api.merge.dev/api/crm/v1/account-details"

    {:ok, %Tesla.Env{body: body, status: 200}} =
      client([{"x-account-token", account_token}])
      |> Tesla.get(url)

    body
  end

  def search_accounts("hubspot", account_token, term) do
    # NOTE doesn't work
    url = "https://api.merge.dev/api/crm/v1/passthrough"

    {:ok, %Tesla.Env{body: body, status: 200}} =
      client([{"x-account-token", account_token}])
      |> Tesla.post(url, %{
        method: "GET",
        path: "/crm/v3/objects/companies/search",
        base_url_override: "https://api.hubapi.com",
        headers: %{
          "Authorization" => "Bearer {{API_KEY}}"
        },
        data: %{
          "filterGroups" => [
            %{
              "filters" => [
                %{
                  "propertyName" => "name",
                  "operator" => "CONTAINS_TOKEN",
                  "value" => "*#{term}*"
                }
              ]
            }
          ]
        }
      })

    body
  end

  def accounts(account_token) do
    accounts(account_token, [], [])
  end

  def accounts(_, [cursor: nil], acc) do
    acc |> List.flatten()
  end

  def accounts(account_token, cursor, acc) do
    url = "https://api.merge.dev/api/crm/v1/accounts"

    {:ok, %Tesla.Env{body: %{"next" => next, "results" => results}}} =
      client([{"x-account-token", account_token}])
      |> Tesla.get(url,
        page_size: 100,
        cursor: cursor
      )

    accounts(account_token, [cursor: next], [results | acc])
  end

  def account(account_token, remote_id) do
    url = "https://api.merge.dev/api/crm/v1/accounts"

    {:ok, %Tesla.Env{body: %{"results" => account}, status: 200}} =
      client([{"x-account-token", account_token}])
      |> Tesla.get(url, query: [remote_id: remote_id])

    account
  end

  def delete_account(account_token) do
    url = "https://api.merge.dev/api/crm/v1/delete-account"

    {:ok, %Tesla.Env{status: 200}} =
      client([{"x-account-token", account_token}])
      |> Tesla.post(url, %{})

    :ok
  end

  def create_ticket(
        "hubspot",
        account_token,
        remote_account_id,
        title,
        _description,
        _fog_room_url
      ) do
    url = "/api/crm/v1/passthrough"

    data =
      %{
        "properties" => %{
          "hs_pipeline" => "0",
          "hs_pipeline_stage" => "1",
          "subject" => title
        }
      }
      |> Jason.encode!()

    {:ok, %Tesla.Env{body: %{"status" => 201, "response" => ticket}, status: 200}} =
      client([{"x-account-token", account_token}])
      |> Tesla.post(url, %{
        "method" => "POST",
        "path" => "/crm/v3/objects/tickets",
        "base_url_override" => "https://api.hubapi.com",
        "headers" => %{
          "content-type" => "application/json"
        },
        "request_format" => "JSON",
        "data" => data
      })

    %{"id" => ticket_id} = ticket

    {:ok, _} =
      create_association(
        "hubspot",
        account_token,
        "ticket",
        ticket_id,
        "company",
        remote_account_id
      )

    {:ok, ticket}
  end

  def create_association("hubspot", account_token, from_type, from_id, to_type, to_id) do
    url = "/api/crm/v1/passthrough"
    path = "/crm/v4/objects/#{from_type}/#{from_id}/associations/#{to_type}/#{to_id}"

    {:ok, %Tesla.Env{body: %{"status" => 201} = body, status: 200}} =
      client([{"x-account-token", account_token}])
      |> Tesla.post(url, %{
        "method" => "PUT",
        "path" => path,
        "base_url_override" => "https://api.hubapi.com",
        "headers" => %{
          "content-type" => "application/json"
        },
        "request_format" => "JSON",
        "data" => []
      })

    {:ok, body}
  end

  def add_note_to_ticket("hubspot", account_token, ticket_id, note_text) do
    url = "/api/crm/v1/passthrough"
    path = "crm/v3/objects/notes"

    data =
      %{
        "properties" => %{
          "hs_note_body" => note_text,
          "hs_timestamp" => DateTime.utc_now() |> DateTime.to_iso8601()
        }
      }
      |> Jason.encode!()

    {:ok, %Tesla.Env{body: %{"status" => 201, "response" => note}, status: 200}} =
      client([{"x-account-token", account_token}])
      |> Tesla.post(url, %{
        "method" => "POST",
        "path" => path,
        "base_url_override" => "https://api.hubapi.com",
        "headers" => %{
          "content-type" => "application/json"
        },
        "request_format" => "JSON",
        "data" => data
      })

    %{"id" => note_id} = note

    {:ok, _} = create_association("hubspot", account_token, "note", note_id, "ticket", ticket_id)

    {:ok, note}
  end

  def add_note_to_company("hubspot", account_token, company_id, note_text) do
    url = "/api/crm/v1/passthrough"
    path = "crm/v3/objects/notes"

    data =
      %{
        "properties" => %{
          "hs_note_body" => note_text,
          "hs_timestamp" => DateTime.utc_now() |> DateTime.to_iso8601()
        }
      }
      |> Jason.encode!()

    {:ok, %Tesla.Env{body: %{"status" => 201, "response" => note}, status: 200}} =
      client([{"x-account-token", account_token}])
      |> Tesla.post(url, %{
        "method" => "POST",
        "path" => path,
        "base_url_override" => "https://api.hubapi.com",
        "headers" => %{
          "content-type" => "application/json"
        },
        "request_format" => "JSON",
        "data" => data
      })

    %{"id" => note_id} = note

    {:ok, _} =
      create_association("hubspot", account_token, "note", note_id, "company", company_id)

    {:ok, note}
  end

  def update_note("hubspot", account_token, note_id, note_text) do
    url = "/api/crm/v1/passthrough"
    path = "crm/v3/objects/notes/#{note_id}"

    data =
      %{
        "properties" => %{
          "hs_note_body" => note_text,
          "hs_timestamp" => DateTime.utc_now() |> DateTime.to_iso8601()
        }
      }
      |> Jason.encode!()

    {:ok, %Tesla.Env{body: %{"status" => 200, "response" => note}, status: 200}} =
      client([{"x-account-token", account_token}])
      |> Tesla.post(url, %{
        "method" => "PATCH",
        "path" => path,
        "base_url_override" => "https://api.hubapi.com",
        "headers" => %{
          "content-type" => "application/json"
        },
        "request_format" => "JSON",
        "data" => data
      })

    {:ok, note}
  end

  def close_ticket("hubspot", account_token, ticket_id) do
    {:ok, _} = update_ticket("hubspot", account_token, ticket_id, %{"hs_pipeline_stage" => "4"})
  end

  def reopen_ticket("hubspot", account_token, ticket_id) do
    {:ok, _} = update_ticket("hubspot", account_token, ticket_id, %{"hs_pipeline_stage" => "1"})
  end

  def update_ticket("hubspot", account_token, ticket_id, properties) do
    url = "/api/crm/v1/passthrough"
    path = "/crm/v3/objects/tickets/#{ticket_id}"

    data = %{"properties" => properties} |> Jason.encode!()

    {:ok, %Tesla.Env{body: %{"status" => 200, "response" => ticket}, status: 200}} =
      client([{"x-account-token", account_token}])
      |> Tesla.post(url, %{
        "method" => "PATCH",
        "path" => path,
        "base_url_override" => "https://api.hubapi.com",
        "headers" => %{
          "content-type" => "application/json"
        },
        "request_format" => "JSON",
        "data" => data
      })

    {:ok, ticket}
  end

  def token_info("hubspot", account_token) do
    url = "/api/crm/v1/passthrough"
    path = "/oauth/v1/access-tokens/{{ACCESS_TOKEN}}"

    {:ok, %Tesla.Env{body: %{"response" => token_info}, status: 200}} =
      client([{"x-account-token", account_token}])
      |> Tesla.post(url, %{
        "method" => "GET",
        "path" => path,
        "base_url_override" => "https://api.hubapi.com",
        "headers" => %{
          "content-type" => "application/json"
        },
        "request_format" => "JSON"
      })

    token_info
  end

  def token_info("salesforce", account_token) do
    url = "/api/crm/v1/passthrough"
    path = "Soap/u/54.0/{{API_URL_SUBDOMAIN}}"

    {:ok, %Tesla.Env{body: body, status: 200}} =
      client([{"x-account-token", account_token}])
      |> Tesla.post(url, %{
        "method" => "POST",
        "path" => path,
        "request_type" => "XML",
        "data" => """
          <soapenv:Envelope
            xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
            xmlns:urn="urn:partner.soap.sforce.com">
            <soapenv:Header>
              <urn:PackageVersionHeader>
              <!--Zero or more repetitions:-->
                <urn:packageVersions>
                  <urn:namespace></urn:namespace>
                </urn:packageVersions>
              </urn:PackageVersionHeader>
              <urn:MruHeader>
              </urn:MruHeader>
              <urn:QueryOptions>
              <!--Optional:-->
              </urn:QueryOptions>
              <urn:CallOptions>
                <urn:client></urn:client>
                <urn:defaultNamespace></urn:defaultNamespace>
              </urn:CallOptions>
              <urn:SessionHeader>
                <urn:sessionId>{Auth Key}</urn:sessionId>
              </urn:SessionHeader>
            </soapenv:Header>
            <soapenv:Body>
              <urn:query>
                <urn:queryString>SELECT domain FROM Domain</urn:queryString>
              </urn:query>
            </soapenv:Body>
          </soapenv:Envelope>
        """
      })

    body
  end

  defp client(headers \\ []) do
    retry =
      {Tesla.Middleware.Retry,
       [
         delay: 1000,
         max_retries: 3,
         max_delay: 4_000,
         should_retry: fn
           {:ok, %{status: status}} when status in [400, 429, 500] -> false
           {:ok, _} -> false
           {:error, :timeout} -> true
           {:error, _} -> false
         end
       ]}

    headers =
      {Tesla.Middleware.Headers,
       headers ++
         [
           {
             "authorization",
             "Bearer " <> Fog.env(:merge_access_key)
           }
         ]}

    middleware = [
      {Tesla.Middleware.BaseUrl, @merge_url},
      headers,
      Tesla.Middleware.JSON,
      retry
    ]

    Tesla.client(middleware)
  end
end
