import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as cloud from "@pulumi/cloud";

const project = "api-inbox";
const stack = pulumi.getStack();

const current = aws.getCallerIdentity({});
const accountId = current.then(current => current.accountId);

const config = new pulumi.Config();

const mailDomain = config.require("mailDomain");
const receiptRuleSetName = "general"; //only one rule set could be active

const apiRef = new pulumi.StackReference(config.require("apiStackRef"));
const apiRoleId = apiRef.requireOutput("apiRoleId");
const apiDomain = apiRef.requireOutput("apiDomain");
const region = pulumi.output(aws.getRegion());

const hostedZoneId = apiDomain.apply(domain =>
  aws.route53.getZone({ name: domain }, { async: true }).then(zone => zone.zoneId)
);

const mailDNS = new aws.route53.Record(`${project}-${stack}-mail-dns`, {
  name: mailDomain,
  type: "MX",
  records: [region.apply(region => `10 inbound-smtp.${region.name}.amazonaws.com`)],
  zoneId: hostedZoneId,
  ttl: 300,
});

const s3Messages = new aws.s3.Bucket(`${project}-${stack}-messages`);

const queue = new aws.sqs.Queue(`${project}-${stack}-queue`, {
  contentBasedDeduplication: false,
  fifoQueue: false,
});

const snsTopic = new aws.sns.Topic(`${project}-${stack}-events`, {});

// see https://docs.aws.amazon.com/ses/latest/dg/receiving-email-permissions.html
const allowSESBucketPolicy = new aws.s3.BucketPolicy("allowSESBucketPolicy", {
  bucket: s3Messages.bucket,
  policy: {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "AllowSESPuts",
        "Effect": "Allow",
        "Principal": {
          "Service": "ses.amazonaws.com",
        },
        "Action": "s3:PutObject",
        "Resource": pulumi.concat(s3Messages.arn, "/*"),
        "Condition": {
          "StringEquals": {
            "AWS:SourceAccount": accountId,
          },
        },
      },
    ],
  },
});

const inboxRule = new aws.ses.ReceiptRule(`${project}-${stack}-rule`, {
  enabled: true,
  recipients: [mailDomain],
  ruleSetName: receiptRuleSetName,
  s3Actions: [
    {
      bucketName: allowSESBucketPolicy.bucket,
      position: 1,
      topicArn: snsTopic.arn,
    },
  ],
  scanEnabled: true,
});

const sqsSubscription = new aws.sns.TopicSubscription(`${project}-${stack}-sqs-sub`, {
  endpoint: queue.arn,
  protocol: "sqs",
  topic: snsTopic.arn,
});

const sqsPolicySNS = new aws.sqs.QueuePolicy(`${project}-${stack}-sqs-sns-policy`, {
  queueUrl: queue.id,
  policy: pulumi.interpolate`{
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Principal": {
            "AWS": "*"
          },
          "Action": "SQS:SendMessage",
          "Resource": "${queue.arn}",
          "Condition": {
            "ArnEquals": {
              "aws:SourceArn": "${snsTopic.arn}"
            }
          }
        }
      ]
    }`,
});

const s3Policy = new aws.iam.RolePolicy(`${project}-${stack}-policy-s3`, {
  role: apiRoleId,
  policy: {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: "s3:*",
        Resource: [
          // bucket
          s3Messages.arn,
          // objects in bucket
          s3Messages.arn.apply(x => `${x}/*`),
        ],
      },
    ],
  },
});

const sqsPolicy = new aws.iam.RolePolicy(`${project}-${stack}-policy-sqs`, {
  role: apiRoleId,
  policy: {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: "sqs:*",
        Resource: [queue.arn],
      },
    ],
  },
});

export const sqsUrl = queue.id;
export const domain = mailDomain;
export const bucket = s3Messages.bucket;
