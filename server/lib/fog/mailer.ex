defmodule Fog.Mailer do
  use Bamboo.Mailer, otp_app: :fog
  @test_email ~r/.*@(example.com|.*\.test)$/

  def source() do
    s = Fog.env(:ses_source)

    case String.split(s, ["<", ">"], trim: true) do
      [name, email] -> {String.trim(name), String.trim(email)}
      _ -> s
    end
  end

  def source(name) do
    s = Fog.env(:ses_source)

    case String.split(s, ["<", ">"], trim: true) do
      [_, email] -> {String.trim(name), String.trim(email)}
      _ -> s
    end
  end

  def send(email_data) do
    case test_email?(email_data.to) do
      true -> :ok
      false -> deliver_now!(email_data)
    end
  end

  defp test_email?({_, email}), do: test_email?(email)
  defp test_email?(email), do: Regex.match?(@test_email, email)
end
