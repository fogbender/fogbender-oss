import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as cloud from "@pulumi/cloud";
import { createInstance, nixosAmi, nixosKey } from "../infra/src/ec2server";

const project = "fog";
const stack = pulumi.getStack();

const secrets = require(`../../secrets/api-${stack}.json`);
const config = new pulumi.Config();

const domainName = config.require("domainName");
const machineType = config.require("machineType");
const machineStorageGB = config.requireNumber("machineStorageGB");

const dbMachineType = config.require("dbMachineType");
const dbStorageGB = config.requireNumber("dbStorageGB");
const dbUser = config.require("dbUser");
const dbPassword = secrets.dbPassword;

const infra = new pulumi.StackReference(config.require("infraStackRef"));
const vpcId = infra.requireOutput("vpcId");
const publicSubnetIds = infra.requireOutput("publicSubnetIds");
const privateSubnetIds = infra.requireOutput("privateSubnetIds");
const isolatedSubnetIds = infra.requireOutput("isolatedSubnetIds");
const vpc = awsx.ec2.Vpc.fromExistingIds("fog-vpc", {
  vpcId: vpcId,
  // FIXME: doesn't work as expected:
  // publicSubnetIds: publicSubnetIds,
  // privateSubnetIds: privateSubnetIds,
  // isolatedSubnetIds: isolatedSubnetIds,
});

const apiSg = new awsx.ec2.SecurityGroup(`${project}-${stack}-api-sg`, {
  vpc: vpc,
  description: "Api server access (80,443,22)",
  ingress: [
    { protocol: "TCP", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] },
    { protocol: "TCP", fromPort: 443, toPort: 443, cidrBlocks: ["0.0.0.0/0"] },
    { protocol: "TCP", fromPort: 22, toPort: 22, cidrBlocks: ["0.0.0.0/0"] },
  ],
  egress: [{ protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] }],
});

const dbSg = new awsx.ec2.SecurityGroup(`${project}-${stack}-db-sg`, {
  vpc: vpc,
  description: "RDS access through 5432 port",
  ingress: [{ protocol: "TCP", fromPort: 5432, toPort: 5432, sourceSecurityGroupId: apiSg.id }],
  egress: [{ protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] }],
});

const dbSubnets = new aws.rds.SubnetGroup(`${project}-${stack}-db-subnets`, {
  subnetIds: isolatedSubnetIds,
});

const db = new aws.rds.Instance(`${project}-${stack}-db`, {
  engine: "postgres",

  instanceClass: dbMachineType,
  allocatedStorage: dbStorageGB,

  name: dbUser,
  username: dbUser,
  password: dbPassword,

  dbSubnetGroupName: dbSubnets.id,
  vpcSecurityGroupIds: [dbSg.id],

  skipFinalSnapshot: true,

  backupRetentionPeriod: 5,
  backupWindow: "07:00-09:00",
});

const s3FileUpload = new aws.s3.Bucket(`${project}-${stack}-file-upload`);

// Instead of creating custom aws key for our server let's add role to it
const apiRole = new aws.iam.Role(`${project}-${stack}-api-role`, {
  assumeRolePolicy: {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: { Service: "ec2.amazonaws.com" },
        Action: "sts:AssumeRole",
      },
    ],
  },
});

const requiredPolicy = new aws.iam.RolePolicy(`${project}-${stack}-api-role-policy`, {
  role: apiRole,
  policy: {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: ["ec2:Describe*", "iam:ListRoles", "sts:AssumeRole"],
        Resource: "*",
      },
    ],
  },
});

const emailPolicy = new aws.iam.RolePolicy(`${project}-${stack}-api-role-policy-ses`, {
  role: apiRole,
  policy: {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: ["ses:SendEmail", "ses:SendRawEmail"],
        Resource: "*",
        // TODO: setting `ses:FromAddress` might be good idea. See https://docs.aws.amazon.com/ses/latest/DeveloperGuide/control-user-access.html
      },
    ],
  },
});

const s3Policy = new aws.iam.RolePolicy(`${project}-${stack}-api-role-policy-s3`, {
  role: apiRole,
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

const apiProfile = new aws.iam.InstanceProfile(`${project}-${stack}-api-profile`, {
  // https://rtfm.co.ua/aws-iam-assumerole-opisanie-primery/
  // https://docs.aws.amazon.com/codedeploy/latest/userguide/getting-started-create-iam-instance-profile.html
  role: apiRole.name,
});

const api = createInstance(`${project}-${stack}-api`, machineType as any, {
  subnetId: publicSubnetIds.apply(l => l[0]),
  vpcSecurityGroupIds: [apiSg.id],
  rootBlockDevice: {
    volumeSize: machineStorageGB,
    volumeType: "gp2",
  },
  iamInstanceProfile: apiProfile,
});

const hostedZoneId = aws.route53
  .getZone({ name: domainName }, { async: true })
  .then(zone => zone.zoneId);

const apiDNS = new aws.route53.Record(
  `${project}-${stack}-dns`,
  {
    name: "api",
    type: aws.route53.RecordTypes.CNAME,
    records: [api.publicDns],
    zoneId: hostedZoneId,
    ttl: 300,
  },
  { aliases: [{ name: "${project}-${stack}-dns" }] }
);

export const dbIp = db.address;
export const dbPort = db.port;
export const apiIp = api.publicIp;
export const apiDns = api.publicDns;
export const apiUrl = apiDNS.fqdn.apply(x => `https://${x}`);
export const fileUploadBucket = s3FileUpload.bucket;
export const apiRoleId = apiRole.id;
export const apiDomain = domainName;
