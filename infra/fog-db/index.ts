import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { resourceName } from "../lib/utils";

const config = new pulumi.Config();
const machineType = config.require("machineType");
const storageGB = config.requireNumber("storageGB");
const domain = config.require("domain");
const host = config.require("host");

const net = new pulumi.StackReference(config.require("netStack"));
const vpcId = net.requireOutput("vpcId");
const isolatedSubnetIds = net.requireOutput("isolatedSubnetIds");
const vpc = aws.ec2.getVpcOutput({ id: vpcId });

const dbUser = config.require("dbUser");
const dbPassword = config.requireSecret("dbPassword");

const dbAccessSg = new aws.ec2.SecurityGroup(resourceName("access-sg"), {
  vpcId: vpcId,
  description: "RDS client access",
  egress: [{ protocol: "TCP", fromPort: 5432, toPort: 5432, cidrBlocks: [vpc.cidrBlock] }],
});

const sg = new aws.ec2.SecurityGroup(resourceName("sg"), {
  vpcId: vpcId,
  description: "RDS access through 5432 port",
  egress: [{ protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] }],
});

const sgIngressRule = new aws.ec2.SecurityGroupRule(resourceName("sg-ingress"), {
  type: "ingress",
  protocol: "TCP",
  fromPort: 5432,
  toPort: 5432,
  sourceSecurityGroupId: dbAccessSg.id,
  securityGroupId: sg.id,
});

const subnets = new aws.rds.SubnetGroup(resourceName("subnets"), {
  subnetIds: isolatedSubnetIds,
});

const rds = new aws.rds.Instance(resourceName("rds"), {
  engine: "postgres",

  instanceClass: machineType,
  allocatedStorage: storageGB,

  name: dbUser,
  username: dbUser,
  password: dbPassword,

  dbSubnetGroupName: subnets.id,
  vpcSecurityGroupIds: [sg.id],

  skipFinalSnapshot: true,

  backupRetentionPeriod: 7,
  backupWindow: "07:00-09:00",
  storageEncrypted: true,
  multiAz: true,
  enabledCloudwatchLogsExports: ["postgresql", "upgrade"],

  applyImmediately: true,
});

const hostedZoneId = aws.route53
  .getZone(
    {
      name: domain,
      privateZone: true,
    },
    { async: true }
  )
  .then(zone => zone.zoneId);

const dns = new aws.route53.Record(
  resourceName("dns"),
  {
    name: host,
    type: aws.route53.RecordTypes.CNAME,
    records: [rds.address],
    zoneId: hostedZoneId,
    ttl: 300,
  },
  { aliases: [{ name: resourceName("dns") }] }
);

export const dbDomanin = dns.fqdn;
export const dbIp = rds.address;
export const dbAccessSecurityGroupId = dbAccessSg.id;
