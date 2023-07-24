import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

import { resourceName, resourceTags } from "../lib/utils";

const config = new pulumi.Config();
const s3LogBucket = config.require("s3LogBucket");

const kms = new pulumi.StackReference(config.require("kmsStack"));
const keyArn = kms.requireOutput("keyArn");
const keyAliasArn = kms.requireOutput("aliasArn");

const mail = new pulumi.StackReference(config.require("mailStack"));
const sqsS3Arn = mail.requireOutput("s3Arn");
const sqsArn = mail.requireOutput("sqsArn");
const sqsUrl = mail.requireOutput("sqsUrl");

const s3FileUpload = new aws.s3.Bucket(resourceName("s3-file-upload"), {
  loggings: [
    {
      targetBucket: s3LogBucket,
      targetPrefix: resourceName("s3-file-upload/"),
    },
  ],
  versioning: {
    enabled: true,
  },
  tags: resourceTags()
});

const accessPolicy = new aws.iam.Policy(resourceName("access-policy"), {
  path: "/",
  description: "Access to devenv resources",
  policy: {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: "kms:*",
        Resource: keyArn,
      },
      {
        Effect: "Allow",
        Action: "s3:*",
        Resource: [
          s3FileUpload.arn,
          s3FileUpload.arn.apply(x => `${x}/*`),
          sqsS3Arn,
          sqsS3Arn.apply(x => `${x}/*`),
        ],
      },
      {
        Effect: "Allow",
        Action: "sqs:*",
        Resource: sqsArn,
      },
    ],
  },
});

export const fileUploadBucket = s3FileUpload.bucket;
export const fileUploadRegion = s3FileUpload.region;
export const accessPolicyArn = accessPolicy.arn;
export const kmsKeyArn = keyArn;
export const kmsAliasArn = keyAliasArn;
export const mailSqsUrl = sqsUrl;
export const mailS3Bucket = mail.requireOutput("s3Bucket");
export const mailDomain = mail.requireOutput("mailDomain");
