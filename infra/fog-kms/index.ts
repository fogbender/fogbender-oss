import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import { resourceName, assumeRolePolicy } from "../lib/utils";

const config = new pulumi.Config();
const stack = pulumi.getStack();
const accountId = config.require("accountId");

const keyPolicy = {
  Version: "2012-10-17",
  Id: "policy",
  Statement: [
    // This statement allows all users to view the key in the console
    {
      Sid: "Enable IAM User Permissions",
      Effect: "Allow",
      Action: ["kms:*"],
      Principal: {
        "AWS": [`arn:aws:iam::${accountId}:root`],
      },
      Resource: "*",
    },
  ],
};

const key = new aws.kms.Key(resourceName("key"), {
  deletionWindowInDays: 10,
  description: `KMS key for ${stack} env secrets`,
  policy: JSON.stringify(keyPolicy),
});

const alias = new aws.kms.Alias(`alias/${stack}-encryption-key`, {
  targetKeyId: key.keyId,
});

export const keyArn = key.arn;
export const aliasArn = alias.arn;
