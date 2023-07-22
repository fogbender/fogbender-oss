let
  inherit (builtins) fromJSON readFile;
  secrets = {
    test = fromJSON (readFile ../../secrets/api-test.json);
    stage = fromJSON (readFile ../../secrets/api-stage.json);
    prod = fromJSON (readFile ../../secrets/api-prod.json);
  };
in

{
  service.domain = "service.fogbender-test.com";

  test.api.domain = "api.fogbender-test.com";
  test.storefront.url = "https://fogbender-test.com";
  test.client.domain = "main--fb-client.netlify.app";
  test.db = {
    host = secrets.test.dbHost;
    port = "5432";
    user = "fogbender";
    pass = secrets.test.dbPassword;
  };
  test.google.client_id = secrets.test.googleClientId;
  test.google.client_secret = secrets.test.googleClientSecret;
  test.ses_source = "Fogbender (Staging) <noreply@email.fogbender-test.com>";
  test.ses_region = "us-east-1";
  test.s3_file_upload_bucket = "fog-test-file-upload-fd9c78b";
  test.secret_key_base64 = secrets.test.secretKeyBase64;
  test.grubDevice = "/dev/xvda";
  test.logLevel = "debug";
  test.cognito = {
    region = "us-east-1";
    user_pool_id = "us-east-1_Mkgm43eko";
    client_id = "4j1d420ld73hnoeu8oc186daa6";
  };
  test.inbox_sqs_url = "https://sqs.us-east-1.amazonaws.com/863191199317/api-inbox-test-queue-a199ff8";
  test.inbox_domain = "mail.fogbender-test.com";
  test.email_digest_job_schedule = "*/5"; #every 5 seconds
  test.email_digest_job_batch = "1000";
  test.email_receive_job_schedule = "*/10"; #every 10 secs
  test.merge.access_key = secrets.test.mergeAccessKey;
  test.height.client_id = secrets.test.heightClientId;
  test.height.client_secret = secrets.test.heightClientSecret;
  test.slack.client_id = secrets.test.slackClientId;
  test.slack.client_secret = secrets.test.slackClientSecret;
  test.slack.client_verification_token = secrets.test.slackClientVerificationToken;
  test.msteams.client_id = secrets.test.msteamsClientId;
  test.msteams.client_secret = secrets.test.msteamsClientSecret;
  test.msteams.renew_subscription_job_schedule = "0 */30"; # every 30 minutes
  test.slack_cust.client_id = secrets.test.slackCustClientId;
  test.slack_cust.client_secret = secrets.test.slackCustClientSecret;
  test.slack_cust.client_verification_token = secrets.test.slackCustClientVerificationToken;
  test.crm.note_bucket_duration_seconds = "3600";
  test.open_ai_api_key = secrets.test.openAiApiKey;
  test.open_ai_org_id = secrets.test.openAiOrgId;
  test.pagerduty_client_id = secrets.test.pagerdutyClientId;
  test.pagerduty_client_secret = secrets.test.pagerdutyClientSecret;
  test.github_tokens = secrets.test.gitHubTokens;

  stage.api.domain = "api.fogbender-stage.com";
  stage.storefront.url = "https://fogbender-stage.com";
  stage.client.domain = "client.fogbender-stage.com";
  stage.db = {
    host = secrets.stage.dbHost;
    port = "5432";
    user = "fogbender";
    pass = secrets.stage.dbPassword;
  };
  stage.google.client_id = secrets.stage.googleClientId;
  stage.google.client_secret = secrets.stage.googleClientSecret;
  stage.ses_source = "Fogbender (Staging) <noreply@email.fogbender-stage.com>";
  stage.ses_region = "us-east-1";
  stage.s3_file_upload_bucket = "fog-stage-file-upload-ee80023";
  stage.secret_key_base64 = secrets.stage.secretKeyBase64;
  stage.grubDevice = "/dev/xvda";
  stage.logLevel = "debug";
  stage.cognito = {
    region = "us-east-1";
    user_pool_id = "us-east-1_Mkgm43eko";
    client_id = "4j1d420ld73hnoeu8oc186daa6";
  };
  stage.inbox_sqs_url = "https://sqs.us-east-1.amazonaws.com/863191199317/api-inbox-stage-queue-14b4fd9";
  stage.inbox_domain = "mail.fogbender-stage.com";
  stage.email_digest_job_schedule = "0"; #every minute
  stage.email_digest_job_batch = "1000";
  stage.email_receive_job_schedule = "0";
  stage.merge.access_key = secrets.stage.mergeAccessKey;
  stage.height.client_id = secrets.stage.heightClientId;
  stage.height.client_secret = secrets.stage.heightClientSecret;
  stage.slack.client_id = secrets.stage.slackClientId;
  stage.slack.client_secret = secrets.stage.slackClientSecret;
  stage.slack.client_verification_token = secrets.stage.slackClientVerificationToken;
  stage.msteams.client_id = secrets.stage.msteamsClientId;
  stage.msteams.client_secret = secrets.stage.msteamsClientSecret;
  stage.msteams.renew_subscription_job_schedule = "0 */30"; # every 30 minutes
  stage.slack_cust.client_id = secrets.stage.slackCustClientId;
  stage.slack_cust.client_secret = secrets.stage.slackCustClientSecret;
  stage.slack_cust.client_verification_token = secrets.stage.slackCustClientVerificationToken;
  stage.crm.note_bucket_duration_seconds = "3600";
  stage.open_ai_api_key = secrets.stage.openAiApiKey;
  stage.open_ai_org_id = secrets.stage.openAiOrgId;
  stage.pagerduty_client_id = secrets.stage.pagerdutyClientId;
  stage.pagerduty_client_secret = secrets.stage.pagerdutyClientSecret;
  stage.github_tokens = secrets.stage.gitHubTokens;

  prod.api.domain = "api.fogbender.com";
  prod.storefront.url = "https://fogbender.com";
  prod.client.domain = "client.fogbender.com";
  prod.db = {
    host = secrets.prod.dbHost;
    port = "5432";
    user = "fogbender";
    pass = secrets.prod.dbPassword;
  };
  prod.google.client_id = secrets.prod.googleClientId;
  prod.google.client_secret = secrets.prod.googleClientSecret;
  prod.ses_source = "Fogbender <noreply@email.fogbender.com>";
  prod.ses_region = "us-east-1";
  prod.s3_file_upload_bucket = "fog-prod-file-upload-ec496e6";
  prod.secret_key_base64 = secrets.prod.secretKeyBase64;
  prod.grubDevice = "/dev/nvme0n1";
  prod.logLevel = "info";
  prod.cognito = {
    region = "us-west-1";
    user_pool_id = "us-west-1_qZyr62u9e";
    client_id = "3a681nuu5reah56mn0dahl94i1";
  };
  prod.inbox_sqs_url = "https://sqs.us-east-1.amazonaws.com/863191199317/api-inbox-prod-queue-984b50e";
  prod.inbox_domain = "mail.fogbender.com";
  prod.email_digest_job_schedule = "0";
  prod.email_digest_job_batch = "1000";
  prod.email_receive_job_schedule = "0";
  prod.merge.access_key = secrets.prod.mergeAccessKey;
  prod.height.client_id = secrets.prod.heightClientId;
  prod.height.client_secret = secrets.prod.heightClientSecret;
  prod.slack.client_id = secrets.prod.slackClientId;
  prod.slack.client_secret = secrets.prod.slackClientSecret;
  prod.slack.client_verification_token = secrets.prod.slackClientVerificationToken;
  prod.msteams.client_id = secrets.prod.msteamsClientId;
  prod.msteams.client_secret = secrets.prod.msteamsClientSecret;
  prod.msteams.renew_subscription_job_schedule = "0 */30"; # every 30 minutes
  prod.slack_cust.client_id = secrets.prod.slackCustClientId;
  prod.slack_cust.client_secret = secrets.prod.slackCustClientSecret;
  prod.slack_cust.client_verification_token = secrets.prod.slackCustClientVerificationToken;
  prod.crm.note_bucket_duration_seconds = "3600";
  prod.open_ai_api_key = secrets.prod.openAiApiKey;
  prod.open_ai_org_id = secrets.prod.openAiOrgId;
  prod.pagerduty_client_id = secrets.prod.pagerdutyClientId;
  prod.pagerduty_client_secret = secrets.prod.pagerdutyClientSecret;
  prod.github_tokens = secrets.prod.gitHubTokens;
}
