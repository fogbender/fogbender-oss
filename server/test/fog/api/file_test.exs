defmodule Test.Api.FileTest do
  use Fog.RepoCase, async: true
  use Fog.ApiCase
  use Plug.Test

  alias Fog.Web.PublicRouter

  setup do
    Kernel.binding()
  end

  describe "public files" do
    test "valid token redirect" do
      token = Fog.Token.for_public_file("123", "/some/path")
      token = URI.encode_www_form(token)

      conn =
        :get
        |> conn("/file/#{token}", "")
        |> PublicRouter.call([])

      assert conn.status == 302
      assert [_] = Plug.Conn.get_resp_header(conn, "location")
    end

    test "invalid token error" do
      conn =
        :get
        |> conn("/file/123", "")
        |> PublicRouter.call([])

      assert conn.status == 404
      assert conn.resp_body == "File not found"
    end
  end

  @tag :wip
  describe "file upload" do
    # TODO implement file upload tests with S3 mocks
  end
end
