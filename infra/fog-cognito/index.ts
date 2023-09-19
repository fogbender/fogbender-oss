import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as cloud from "@pulumi/cloud";
import type { CognitoUserPoolTriggerEvent } from "aws-lambda";
import { resourceName } from "../lib/utils";

const config = new pulumi.Config();

const sourceDomain = config.require("sourceDomain");
const sourceEmail = config.require("sourceEmail");
const sesDomainIdentity = aws.ses.getDomainIdentityOutput({
    domain: sourceDomain,
});

// identity pool is needed to keep track of anonymous accounts (no email/password)
// const identityPool = new aws.cognito.IdentityPool(`${project}-${stack}-identity-pool`, {
//   identityPoolName: `${project} ${stack} identity pool`,
// });

const customMessageLambda = new aws.lambda.CallbackFunction(
  resourceName("customMessage-lambda"),
  {
    // policies: [iam.AWSLambdaFullAccess], by default
    callback: async (event: CognitoUserPoolTriggerEvent) => {
      console.log(event);
      //
      if (event.userPoolId === "theSpecialUserPool" || true) {
        // Identify why was this function invoked
        if (event.triggerSource === "CustomMessage_SignUp") {
          // Ensure that your message contains event.request.codeParameter. This is the placeholder for code that will be sent
          event.response.smsMessage =
            "Welcome to fogbender. Your confirmation code is " + event.request.codeParameter;
          // event.response.emailSubject = "Please verify your email addresss";
          // // TODO: html template https://www.mihaiblaga.dev/aws-cognito-custom-email-verification-template
          // // TODO: add `preheader` https://sendgrid.com/blog/perfecting-your-email-preview-text/ see email with twitch code
          // event.response.emailMessage = `<!DOCTYPE html><html></html>`;
          event.response.emailSubject = "Welcome to Fogbender!";
          event.response.emailMessage =
            "Thank you for signing up. " +
            event.request.codeParameter +
            " is your verification code.";
        }
        // Create custom message for other events
      }
      // Customize messages for other user pools

      // Return to Amazon Cognito
      return event;
    },
  }
);
