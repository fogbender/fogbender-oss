import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

import { encryptedInstance } from "../lib/ec2server";
import { resourceName, assumeRolePolicy, cloudWatchPolicy } from "../lib/utils";

const config = new pulumi.Config();
const machineType = config.require("machineType");
const volumeSizeGB = config.requireNumber("volumeSizeGB");
const privateDomain = config.require("privateDomain");
const privateHost = config.require("privateHost");
const publicDomain = config.require("publicDomain");
const publicHost = config.require("publicHost");
const s3LogBucket = config.require("s3LogBucket");

const net = new pulumi.StackReference(config.require("netStack"));
const vpcId = net.requireOutput("vpcId");
const publicSubnetIds = net.requireOutput("publicSubnetIds");
const vpc = aws.ec2.getVpcOutput({ id: vpcId });

const kms = new pulumi.StackReference(config.require("kmsStack"));
const keyArn = kms.requireOutput("keyArn");

const mail = new pulumi.StackReference(config.require("mailStack"));
const s3Arn = mail.requireOutput("s3Arn");
const sqsArn = mail.requireOutput("sqsArn");
const domainIdentityArn = mail.requireOutput("domainIdentityArn");

const db = new pulumi.StackReference(config.require("dbStack"));
const dbAccessSgId = db.requireOutput("dbAccessSecurityGroupId");

const sg = new aws.ec2.SecurityGroup(resourceName("sg"), {
  vpcId: vpcId,
  description: "Api server access (80,443,local 22)",
  ingress: [
    { protocol: "TCP", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] },
    { protocol: "TCP", fromPort: 443, toPort: 443, cidrBlocks: ["0.0.0.0/0"] },
    { protocol: "TCP", fromPort: 22, toPort: 22, cidrBlocks: ["10.0.0.0/8"] },
  ],
  egress: [{ protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] }],
});

const role = new aws.iam.Role(resourceName("role"), {
  assumeRolePolicy: assumeRolePolicy,
});

new aws.iam.RolePolicy(resourceName("cloudwatch-policy"), {
  role: role,
  policy: cloudWatchPolicy,
});

new aws.iam.RolePolicy(resourceName("key-access-policy"), {
  role: role,
  policy: {
    Version: "2012-10-17",
    Id: "policy",
    Statement: [
      {
        Effect: "Allow",
        Action: ["kms:*"],
        Resource: keyArn,
      },
    ],
  },
});

const s3Policy = new aws.iam.RolePolicy(resourceName("mail-s3-access"), {
  role: role,
  policy: {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: "s3:*",
        Resource: [
          // bucket
          s3Arn,
          // objects in bucket
          s3Arn.apply(x => `${x}/*`),
        ],
      },
    ],
  },
});

const sqsPolicy = new aws.iam.RolePolicy(resourceName("mail-sqs-access"), {
  role: role,
  policy: {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: "sqs:*",
        Resource: [sqsArn],
      },
    ],
  },
});

const emailPolicy = new aws.iam.RolePolicy(resourceName("ses-send-email"), {
  role: role,
  policy: {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: ["ses:SendEmail", "ses:SendRawEmail"],
        Resource: domainIdentityArn,
      },
    ],
  },
});

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
});

const s3FileUploadPolicy = new aws.iam.RolePolicy(resourceName("s3-file-upload-policy"), {
  role: role,
  policy: {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: "s3:*",
        Resource: [
          // bucket
          s3FileUpload.arn,
          // objects in bucket
          s3FileUpload.arn.apply(x => `${x}/*`),
        ],
      },
    ],
  },
});

const profile = new aws.iam.InstanceProfile(resourceName("profile"), {
  // https://rtfm.co.ua/aws-iam-assumerole-opisanie-primery/
  // https://docs.aws.amazon.com/codedeploy/latest/userguide/getting-started-create-iam-instance-profile.html
  role: role,
});

const api = encryptedInstance(resourceName("host"), machineType as any, volumeSizeGB, {
  subnetId: publicSubnetIds.apply(l => l[0]),
  vpcSecurityGroupIds: [dbAccessSgId, sg.id],
  iamInstanceProfile: profile,
});

const publicHostedZoneId = aws.route53
  .getZone(
    {
      name: publicDomain,
      privateZone: false,
    },
    { async: true }
  )
  .then(zone => zone.zoneId);

const pubDns = new aws.route53.Record(
  resourceName("public-dns"),
  {
    name: publicHost,
    type: aws.route53.RecordTypes.CNAME,
    records: [api.publicDns],
    zoneId: publicHostedZoneId,
    ttl: 300,
  },
  { aliases: [{ name: resourceName("public-dns") }] }
);

const privateHostedZoneId = aws.route53
  .getZone(
    {
      name: privateDomain,
      privateZone: true,
    },
    { async: true }
  )
  .then(zone => zone.zoneId);

const privDns = new aws.route53.Record(
  resourceName("private-dns"),
  {
    name: privateHost,
    type: aws.route53.RecordTypes.CNAME,
    records: [api.privateDns],
    zoneId: privateHostedZoneId,
    ttl: 300,
  },
  { aliases: [{ name: resourceName("private-dns") }] }
);

export const ip = api.publicIp;
export const publicDns = pubDns.fqdn;
export const privateDns = privDns.fqdn;
export const url = pubDns.fqdn.apply(x => `https://${x}`);
export const roleId = role.id;
export const fileUploadBucket = s3FileUpload.bucket;
export const fileUploadRegion = s3FileUpload.region;
