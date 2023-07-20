{ env }:
let
  infra = (import ./aws-infra.nix)."${env}";
  apiPort = "8000";
  apiDomain = infra.api.domain;
  clientDomain = infra.client.domain;
  dbHost = infra.db.host;
  dbPort = infra.db.port;
  dbUser = infra.db.user;
  dbPass = infra.db.pass;
  googleClientId = infra.google.client_id;
  googleClientSecret = infra.google.client_secret;
  storefrontUrl = infra.storefront.url;
  sesSource = infra.ses_source;
  sesRegion = infra.ses_region;
  s3FileUploadBucket = infra.s3_file_upload_bucket;
  secretKeyBase64 = infra.secret_key_base64;
  grubDevice = infra.grubDevice;
  logLevel = infra.logLevel;
  mergeAccessKey = infra.merge.access_key;
in
{
  fog-api = { config, pkgs, lib, ... }:
    {
      imports = [ ./aws-ec2.nix ./aws-ec2-users.nix ./fogbender-service.nix];
      networking.firewall.allowedTCPPorts = [ 80 443 ];

      deployment.targetHost = apiDomain;
      deployment.hasFastConnection = true; #will copy closures from local machine
      services.fogbender = {
        enable = true;
        envFile = builtins.toFile "fogbender.env" ''
        FOG_ENV="prod"
        FOG_IP="0.0.0.0"
        FOG_PORT=${toString apiPort}
        FOG_STOREFRONT_URL="${storefrontUrl}"
        FOG_API_URL="https://${apiDomain}"
        FOG_CLIENT_URL="https://${clientDomain}"
        PG_PORT=${dbPort}
        PG_HOST="${dbHost}"
        PG_USER="${dbUser}"
        PG_DB="${dbUser}"
        PG_PASS="${dbPass}"
        GOOGLE_CLIENT_ID="${googleClientId}"
        GOOGLE_CLIENT_SECRET="${googleClientSecret}"
        SES_SOURCE="${sesSource}"
        SES_REGION="${sesRegion}"
        S3_FILE_UPLOAD_BUCKET="${s3FileUploadBucket}"
        COGNITO_REGION="${infra.cognito.region}"
        COGNITO_USER_POOL_ID="${infra.cognito.user_pool_id}"
        COGNITO_CLIENT_ID="${infra.cognito.client_id}"
        FOG_SECRET_KEY_BASE64="${secretKeyBase64}"
        FOG_LOG_LEVEL="${logLevel}"
        INBOX_SQS_URL="${infra.inbox_sqs_url}"
        INBOX_DOMAIN="${infra.inbox_domain}"
        FOG_EMAIL_DIGEST_JOB_SCHEDULE="${infra.email_digest_job_schedule}"
        FOG_EMAIL_DIGEST_JOB_BATCH=${infra.email_digest_job_batch}
        FOG_EMAIL_RECEIVE_JOB_SCHEDULE="${infra.email_receive_job_schedule}"
        MERGE_ACCESS_KEY="${mergeAccessKey}"
        HEIGHT_CLIENT_ID="${infra.height.client_id}"
        HEIGHT_CLIENT_SECRET="${infra.height.client_secret}"
        HEIGHT_REDIRECT_URI="https://${apiDomain}/oauth/height"
        SLACK_CLIENT_ID="${infra.slack.client_id}"
        SLACK_CLIENT_SECRET="${infra.slack.client_secret}"
        SLACK_VERIFICATION_TOKEN="${infra.slack.client_verification_token}"
        SLACK_REDIRECT_URI="https://${apiDomain}/oauth/slack"
        MSTEAMS_CLIENT_ID="${infra.msteams.client_id}"
        MSTEAMS_CLIENT_SECRET="${infra.msteams.client_secret}"
        MSTEAMS_NOTIFICATION_URL="https://${apiDomain}/hook/msteams"
        MSTEAMS_RENEW_SUBSCRIPTIONS_JOB_SCHEDULE="${infra.msteams.renew_subscription_job_schedule}"
        SLACK_CUST_CLIENT_ID="${infra.slack_cust.client_id}"
        SLACK_CUST_CLIENT_SECRET="${infra.slack_cust.client_secret}"
        SLACK_CUST_VERIFICATION_TOKEN="${infra.slack_cust.client_verification_token}"
        SLACK_CUST_REDIRECT_URI="https://${apiDomain}/oauth/slack-customer"
        CRM_NOTE_BUCKET_DURATION_SECONDS="${infra.crm.note_bucket_duration_seconds}"
        OPENAI_API_KEY="${infra.open_ai_api_key}"
        OPENAI_ORGANIZATION_ID="${infra.open_ai_org_id}"
        PAGERDUTY_CLIENT_ID="${infra.pagerduty_client_id}"
        PAGERDUTY_CLIENT_SECRET="${infra.pagerduty_client_secret}"
        PAGERDUTY_REDIRECT_URI="https://${apiDomain}/oauth/pagerduty"
        GITHUB_TOKENS="${infra.github_tokens}"
        TRELLO_API_KEY="${infra.trello_api_key}"
        '';
      };

      security.acme.email = "admin@fogbender.com";
      security.acme.acceptTerms = true;

      services.nginx = {
        enable = true;
        recommendedGzipSettings = true;
        recommendedOptimisation = true;
        recommendedProxySettings = true;
        recommendedTlsSettings = true;
        virtualHosts."${apiDomain}" = {
          forceSSL = true;
          enableACME = true;

          locations = {
            "/" = {
              proxyPass = "http://127.0.0.1:${apiPort}";
              proxyWebsockets = true;
            };
          };
        };

      };

      # Fix for https://github.com/NixOS/nixpkgs/issues/62824#issuecomment-516369379
      boot.loader.grub.device = pkgs.lib.mkForce grubDevice;

    };
}
