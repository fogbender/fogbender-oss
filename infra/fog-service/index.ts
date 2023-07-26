import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

import { encryptedInstance } from "../lib/ec2server";
import { resourceName, resourceTags, assumeRolePolicy, cloudWatchPolicy } from "../lib/utils";

const config = new pulumi.Config();

const net = new pulumi.StackReference(config.require("netStack"));
const vpcId = net.requireOutput("vpcId");

const kms = new pulumi.StackReference(config.require("kmsStack"));
const keyArn = kms.requireOutput("keyArn");

// --- PORTAL ---
const portalDomain = config.require("portalDomain");
const portalHost = config.require("portalHost");

const portalMachineType = "t3.small";
const portalVolumeSize = 20;
const portalSubnetId = net.requireOutput("publicSubnetIds").apply(l => l[0]);

const portalSg = new aws.ec2.SecurityGroup(resourceName("portal-sg"), {
  vpcId: vpcId,
  description: "Portal ssh access (22)",
  ingress: [{ protocol: "TCP", fromPort: 22, toPort: 22, cidrBlocks: ["0.0.0.0/0"] }],
  egress: [{ protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] }],
});

const portalRole = new aws.iam.Role(resourceName("portal-role"), {
  assumeRolePolicy: assumeRolePolicy,
});

new aws.iam.RolePolicy(resourceName("portal-cloudwatch-policy"), {
  role: portalRole,
  policy: cloudWatchPolicy,
});

new aws.iam.RolePolicy(resourceName("portal-key-access-policy"), {
  role: portalRole,
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

const portalProfile = new aws.iam.InstanceProfile(resourceName("portal-profile"), {
  role: portalRole.name,
});

const portal = encryptedInstance(resourceName("portal-host"), portalMachineType, portalVolumeSize, {
  subnetId: portalSubnetId,
  vpcSecurityGroupIds: [portalSg.id],
  iamInstanceProfile: portalProfile,
  tags: resourceTags("portal-host")
});

const portalEip = new aws.ec2.Eip(resourceName("portal-eip"), {
  instance: portal.id,
  vpc: true,
  tags: { Name: resourceName("portal-eip") },
});

const portalHostedZoneId = aws.route53
  .getZone({ name: portalDomain }, { async: true })
  .then(zone => zone.zoneId);

const portalDns = new aws.route53.Record(
  resourceName("portal-dns"),
  {
    name: portalHost,
    type: aws.route53.RecordTypes.CNAME,
    records: [portalEip.publicDns],
    zoneId: portalHostedZoneId,
    ttl: 300,
  },
  { aliases: [{ name: resourceName("portal-dns") }] }
);

//--- CI ---

const ciDomain = config.require("ciDomain");
const ciHost = config.require("ciHost");

const ciMachineType = "t2.medium";
const ciVolumeSize = 40;

const ciSubnetId = net.requireOutput("privateSubnetIds").apply(l => l[0]);

const ciSg = new aws.ec2.SecurityGroup(resourceName("ci-sg"), {
  vpcId: vpcId,
  description: "CI ssh access (22)",
  ingress: [{ protocol: "TCP", fromPort: 22, toPort: 22, cidrBlocks: ["10.0.0.0/8"] }],
  egress: [{ protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] }],
});

const ciRole = new aws.iam.Role(resourceName("ci-role"), {
  assumeRolePolicy: assumeRolePolicy,
});

new aws.iam.RolePolicy(resourceName("ci-cloudwatch-policy"), {
  role: ciRole,
  policy: cloudWatchPolicy,
});

new aws.iam.RolePolicy(resourceName("ci-key-access-policy"), {
  role: ciRole,
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

const ciProfile = new aws.iam.InstanceProfile(resourceName("ci-profile"), {
  role: ciRole.name,
});

const ci = encryptedInstance(resourceName("ci-host"), ciMachineType, ciVolumeSize, {
  subnetId: ciSubnetId,
  vpcSecurityGroupIds: [ciSg.id],
  iamInstanceProfile: ciProfile,
  tags: resourceTags("ci-host")
});

const ciHostedZoneId = aws.route53
  .getZone(
    {
      name: ciDomain,
      privateZone: true,
    },
    { async: true }
  )
  .then(zone => zone.zoneId);

const ciDns = new aws.route53.Record(
  resourceName("ci-dns"),
  {
    name: ciHost,
    type: aws.route53.RecordTypes.CNAME,
    records: [ci.privateDns],
    zoneId: ciHostedZoneId,
    ttl: 300,
  },
  { aliases: [{ name: resourceName("ci-dns") }] }
);

const pgDomain = config.require("playgroundDomain");
const pgHost = config.require("playgroundHost");
const pg = encryptedInstance(resourceName("pg-host"), ciMachineType, ciVolumeSize, {
  subnetId: ciSubnetId,
  vpcSecurityGroupIds: [ciSg.id],
  iamInstanceProfile: ciProfile,
  tags: resourceTags("pg-host")
});

const pgHostedZoneId = aws.route53
  .getZone(
    {
      name: pgDomain,
      privateZone: true,
    },
    { async: true }
  )
  .then(zone => zone.zoneId);

const pgDns = new aws.route53.Record(
  resourceName("pg-dns"),
  {
    name: pgHost,
    type: aws.route53.RecordTypes.CNAME,
    records: [pg.privateDns],
    zoneId: pgHostedZoneId,
    ttl: 300,
  },
  { aliases: [{ name: resourceName("pg-dns") }] }
);

export const portalPrivateIp = portal.privateIp;
export const portalPublicIp = portalEip.publicIp;
export const portalDNS = `${portalHost}.${portalDomain}`;

export const ciPrivateIp = ci.privateIp;
export const ciDNS = `${ciHost}.${ciDomain}`;

export const pgPrivateIp = pg.privateIp;
export const pgDNS = `${pgHost}.${pgDomain}`;
