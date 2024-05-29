---
title: "SSL for Postgrex and Supabase in Elixir"
description: "Configuring Postgrex to work with SSL-protected Supabase Postgres database"
publishDate: "May 28, 2024"
authors:
  - andrei
thumbnailImage: "./assets/postgrex-ssl-with-supabase/thumb.png"
socialImage: "./assets/postgrex-ssl-with-supabase/social.png"
coverImage: "./assets/postgrex-ssl-with-supabase/cover.png"
coverImageAspectRatio: "20:2"
lang: "en"
---

This was a bit of a pain to sort out, so I thought I’d write it down here&mdash;just for you!

To find your connection parameters in Supabase, look for Project Settings / Configuration / Database / Connection Paramters.

As a separate minor challenge, I had to get my my Supabase certificate from an application configuration variable (fed in via [Doppler](https://www.doppler.com/)) to a file. To do this, I used the `Application.put_env` approach:

```
    # application.ex
    case MyApp.env(:db_ssl_crt) do
      nil ->
        :ok

      pem ->
        {:ok, path} = Briefly.create()
        File.write!(path, pem)
        Application.put_env(:my_app, :cacertfile_path, path)
    end
```

The certificate is written to a temporary file with [Briefly](https://github.com/CargoSense/briefly). Note that Briefly will close the temporary file as soon as the temp file creator process exits&mdash;in our case it’s the application process, which means the path to the certificate will remain available as long as the application is running.

```
  def db() do
    ssl = case MyApp.env(:cacertfile_path) do
      nil ->
        []

      path ->
        [ssl: true,
          ssl_opts: [
            verify: :verify_peer,
            cacertfile: path,
            server_name_indication: String.to_charlist(MyApp.env(:db_host)),
            customize_hostname_check: [
              match_fun: :public_key.pkix_verify_hostname_match_fun(:https)
            ]
          ]
        ]
    end

    opts = [
      hostname: MyApp.env(:db_host),
      port: MyApp.env(:db_port),
      username: MyApp.env(:db_user),
      database: MyApp.env(:db_name),
      password: MyApp.env(:db_pass)
    ] ++ ssl

    Postgrex.start_link(opts)
  end
```
