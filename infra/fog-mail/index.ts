import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as cloud from "@pulumi/cloud";
import { resourceName, resourceTags } from "../lib/utils";

const accountId = aws.getCallerIdentity({}).then(current => current.accountId);

const config = new pulumi.Config();
const s3LogBucket = config.require("s3LogBucket");
const domain = config.require("domain");
const host = config.require("host");
export const mailDomain = `${host}.${domain}`;
const receiptRuleSetName = "general"; //only one rule set could be active
const setupIdentity = config.get("setupIdentity");

const region = pulumi.output(aws.getRegion());

const hostedZoneId = aws.route53
  .getZone(
    {
      name: domain,
      privateZone: false,
    },
    { async: true }
  )
  .then(zone => zone.zoneId);

const mailDNS = new aws.route53.Record(resourceName("mail-dns"), {
  name: mailDomain,
  type: "MX",
  records: [region.apply(region => `10 inbound-smtp.${region.name}.amazonaws.com`)],
  zoneId: hostedZoneId,
  ttl: 300,
});

const s3Messages = new aws.s3.Bucket(resourceName("s3-messages"), {
  loggings: [
    {
      targetBucket: s3LogBucket,
      targetPrefix: resourceName("s3-messages/"),
    },
  ],
  versioning: {
    enabled: true,
  },
  tags: resourceTags(),
});

const queue = new aws.sqs.Queue(resourceName("sqs"), {
  contentBasedDeduplication: false,
  fifoQueue: false,
  tags: resourceTags(),
});

const snsTopic = new aws.sns.Topic(resourceName("sns"), {
  tags: resourceTags(),
});

// see https://docs.aws.amazon.com/ses/latest/dg/receiving-email-permissions.html
const allowSESBucketPolicy = new aws.s3.BucketPolicy(resourceName("ses-s3-policy"), {
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

const inboxRule = new aws.ses.ReceiptRule(resourceName("ses-inbox-rule"), {
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

const sqsSubscription = new aws.sns.TopicSubscription(resourceName("sqs-sub"), {
  endpoint: queue.arn,
  protocol: "sqs",
  topic: snsTopic.arn,
});

const sqsPolicySNS = new aws.sqs.QueuePolicy(resourceName("sqs-sub-policy"), {
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

let domainIdentity;

if (setupIdentity) {
  domainIdentity = new aws.ses.DomainIdentity(resourceName("domain-identity"), {
    domain: mailDomain,
  });
  const dkim = new aws.ses.DomainDkim(resourceName("domain-dkim"), {
    domain: domainIdentity.domain,
  });
  const dkimRecord: aws.route53.Record[] = [];
  for (const range = { value: 0 }; range.value < 3; range.value++) {
    dkimRecord.push(
      new aws.route53.Record(resourceName(`dkim-record--${range.value}`), {
        zoneId: hostedZoneId,
        name: pulumi.interpolate`${dkim.dkimTokens[range.value]}._domainkey`,
        type: "CNAME",
        ttl: 600,
        records: [pulumi.interpolate`${dkim.dkimTokens[range.value]}.dkim.amazonses.com`],
      })
    );
  }
} else {
  domainIdentity = aws.ses.getDomainIdentityOutput({
    domain: mailDomain,
  });
}

export const sqsUrl = queue.id;
export const sqsArn = queue.arn;
export const s3Bucket = s3Messages.bucket;
export const s3Arn = s3Messages.arn;
export const regionId = region.id;
export const domainIdentityArn = domainIdentity.arn;
