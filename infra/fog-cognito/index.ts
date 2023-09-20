// Exported from fogbender pulumi project

import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as cloud from "@pulumi/cloud";
import type { CognitoUserPoolTriggerEvent } from "aws-lambda";
import { resourceName } from "../lib/utils";

const project = "fog";
const stack = pulumi.getStack();

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
  `${project}-${stack}-customMessage-lambda`,
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

const preSignUpLambda = new aws.lambda.CallbackFunction(`${project}-${stack}-preSignUp-lambda`, {
  // policies: [iam.AWSLambdaFullAccess], by default
  callback: async (event: CognitoUserPoolTriggerEvent, context) => {
    // SEE https://franzwong.medium.com/howto-integrate-google-recaptcha-with-aws-cognito-e47466e908bb and https://stackoverflow.com/questions/45545267/aws-cognito-bot-prevention-with-google-recaptcha
    console.log(event);
    try {
      if (!event.request.validationData) {
        throw new Error("Missing validation data");
      }
      const recaptchaToken: string = event.request.validationData.recaptchaToken;
      if (recaptchaToken && recaptchaToken !== "example token") {
        throw new Error("wrong recaptchaToken");
      }
      return event;
    } catch (e) {
      console.error(e);
      const myErrorObj = {
        errorType: "InternalServerError",
        httpStatus: 500,
        requestId: context.awsRequestId,
        message: "An unknown error has occurred. Please try again.",
      };
      throw new Error(JSON.stringify(myErrorObj));
    }
  },
});

// user pool is needed to store users (email/password)
const userPool = new aws.cognito.UserPool(`${project}-${stack}-user-pool`, {
  // see https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_CreateUserPool.html
  // and https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html#user-pool-settings-aliases
  // and https://github.com/aws-samples/amazon-cognito-passwordless-email-auth/blob/caf2de4d286f626230d91670dbf5b09d232f340d/cognito/template.yaml#L112
  // and https://docs.aws.amazon.com/cognito/latest/developerguide/signing-up-users-in-your-app.html

  schemas: [
    {
      name: "name",
      attributeDataType: "String",
      mutable: true,
      required: true,
      stringAttributeConstraints: { minLength: "0", maxLength: "2048" },
    },
    {
      name: "email",
      attributeDataType: "String",
      mutable: true,
      required: true,
      stringAttributeConstraints: { minLength: "0", maxLength: "2048" },
    },
  ],

  usernameConfiguration: { caseSensitive: false },
  //
  usernameAttributes: ["email"], // sign in with email and uses UUID as immutable username // required by https://aws.amazon.com/blogs/mobile/implementing-passwordless-email-authentication-with-amazon-cognito/
  // aliasAttributes: ["email"], // alternatively sign in with immutable username OR (mutable) email
  mfaConfiguration: "OFF",
  // mfaConfiguration: "ON",
  // smsAuthenticationMessage: "Your code is {####}",
  // smsConfiguration: {
  //     externalId: "example",
  //     snsCallerArn: aws_iam_role.example.arn,
  // },
  // softwareTokenMfaConfiguration: {
  //   enabled: true,
  // },
  passwordPolicy: {
    minimumLength: 10,
    requireLowercase: true,
    requireUppercase: false,
    requireNumbers: true,
    requireSymbols: false,
    temporaryPasswordValidityDays: 7,
  },
  lambdaConfig: pulumi.all([customMessageLambda.arn, preSignUpLambda.arn]).apply(
    // https://github.com/pulumi/pulumi-aws/issues/678
    ([customMessageArn, preSignUpArn]): aws.types.input.cognito.UserPoolLambdaConfig => ({
      customMessage: customMessageArn,
      preSignUp: preSignUpArn,
    })
  ),
  // lambdaConfig: {
  //   createAuthChallenge: "",
  //   defineAuthChallenge: "",
  //   preSignUp: "",
  //   verifyAuthChallengeResponse: "",
  //   postAuthentication: "",
  // },
  // accountRecoverySetting: {
  //   recoveryMechanisms: [
  //     {
  //       name: "verified_email",
  //       priority: 1,
  //     },
  //     {
  //       name: "verified_phone_number",
  //       priority: 2,
  //     },
  //   ],
  // },
  autoVerifiedAttributes: ["email"], // `Which attributes do you want to verify?` in UI
  deviceConfiguration: { challengeRequiredOnNewDevice: true },
  emailConfiguration: {
    fromEmailAddress: sourceEmail,
    replyToEmailAddress: sourceEmail,
    //configurationSet: "", // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-cognito-userpool-emailconfiguration.html#cfn-cognito-userpool-emailconfiguration-configurationset
    emailSendingAccount: "DEVELOPER",
    sourceArn: sesDomainIdentity.arn, // https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_EmailConfigurationType.html#CognitoUserPools-Type-EmailConfigurationType-SourceArn
  },
});

// this is to test magic link login later
const passwordlessAuthClient = new aws.cognito.UserPoolClient(
  `${project}-${stack}-user-pool-passwordless-client`,
  {
    generateSecret: false,
    userPoolId: userPool.id,
    explicitAuthFlows: ["CUSTOM_AUTH_FLOW_ONLY"], // required by https://aws.amazon.com/blogs/mobile/implementing-passwordless-email-authentication-with-amazon-cognito/
  }
);

// this is to test login
const defaultAuthClient = new aws.cognito.UserPoolClient(
  `${project}-${stack}-user-pool-default-client`,
  {
    // https://youtu.be/KK8FfF3yaok?t=883
    generateSecret: false,
    userPoolId: userPool.id,
    callbackUrls: ["http://localhost:3100/login/?cognito=1"],
    logoutUrls: ["http://localhost:3100/logout/?cognito=1"],
    allowedOauthFlowsUserPoolClient: true,
    allowedOauthFlows: ["code"],
    allowedOauthScopes: ["email", "openid", "profile"],
    supportedIdentityProviders: ["COGNITO"], // got it from chrome dev tools, thanks AWS
  }
);

// FIXME: WAIT FOR https://github.com/hashicorp/terraform-provider-aws/issues/16479 to be fixed first
// const userPoolDomain = new aws.cognito.UserPoolDomain(`${project}-${stack}-user-pool-domain`, {
//   domain: `${project}-${stack}-dpc3`,
//   userPoolId: userPool.id,
// });

const allowCognito = new aws.lambda.Permission(`${project}-${stack}-allow-custom-message`, {
  action: "lambda:InvokeFunction",
  "function": customMessageLambda.name,
  principal: "cognito-idp.amazonaws.com",
  sourceArn: userPool.arn,
  // qualifier: testAlias.name, // I don't know if we need that
});

const allowPreSignup = new aws.lambda.Permission(`${project}-${stack}-allow-pre-signup`, {
  action: "lambda:InvokeFunction",
  "function": preSignUpLambda.name,
  principal: "cognito-idp.amazonaws.com",
  sourceArn: userPool.arn,
});

export const cognitoClientId = defaultAuthClient.id;
export const cognitoUserPoolId = userPool.id;
// export const userPoolDomainName = userPoolDomain.domain;

// for login with google through cognito
// const exampleProvider = new aws.cognito.IdentityProvider("exampleProvider", {
//   userPoolId: userPool.id,
//   providerName: "Google",
//   providerType: "Google",
//   providerDetails: {
//     authorize_scopes: "email",
//     client_id: "your client_id",
//     client_secret: "your client_secret",
//   },
//   attributeMapping: {
//     email: "email",
//     username: "sub",
//   },
// });
