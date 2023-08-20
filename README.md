### Get it running locally

1. Install prerequisites

- [Nixpkgs install](https://nixos.org/nix/download.html)

  curl -L https://nixos.org/nix/install | sh

2. Clone repo

   git clone https://github.com/fogbender/fogbender.git

3. Generate token/session secrets (it will automatically store it in the `local.env` file, it's not tracked by git, you only need to do it once)

   ./scripts/oss-make.sh fog-secrets

4. Start backend application

   ./scripts/oss-make.sh

You can check that it works by opening http://localhost:8000/admin

5. Start frontend application (in a separate terminal)

   ./scripts/oss-make.sh web-start

It will start 3 apps on different ports:

- http://localhost:3100 - local version of https://fogbender.com
- http://localhost:3200 - local version of https://demo1.fogbender.com/
- http://localhost:3300 - local version of https://client.fogbender.com (embeddedable widget)

6. Now you can use the app like you would use it on https://fogbender.com except that some of the features are going to be turned off or mocked.

   - Intergrations with 3rd party services (like Stripe, Slack, GitHub, etc), Google login, AWS Cognito are turned off (you need to configure secrets in the `local.env` file to enable them)
   - File upload is mocked (it will upload files to the local filesystem instead of S3 inside `.nix-shell/files`)
   - You can't receive or send emails (you can use http://localhost:8000/public/emails to debug locally sent emails)

7. Optional. To get access to Fogbender root organization you can add very first agent to that organization. By running this command:

    ./scripts/oss-make.sh fog-agent-boot


### Working with the Database

When you start the backend server it will automatically create and start a local PostgreSQL database. To get access to it you can run:

    ./scripts/oss-make.sh db-repl

To stop the database run:

    ./scripts/oss-make.sh db-stop

To reset (it will wipe all data) the database run:

    ./scripts/oss-make.sh db-clean
