import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as cloud from "@pulumi/cloud";

import { createInstance } from "./src/ec2server";

const vpc = new awsx.ec2.Vpc("fog-vpc", {
  tags: {
    Name: "fog-vpc",
  },
  subnets: [{ type: "public" }, { type: "private" }, { type: "isolated" }],
});

const fogServiceSg = new awsx.ec2.SecurityGroup("fog-service-sg", {
  vpc: vpc,
  description: "Fog service access (22)",
  ingress: [{ protocol: "TCP", fromPort: 22, toPort: 22, cidrBlocks: ["0.0.0.0/0"] }],
  egress: [{ protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] }],
});

const subnetId = pulumi.output(vpc.publicSubnetIds).apply(x => x[0]);
const fogService = createInstance("fog-service", aws.ec2.InstanceTypes.T2_Small, {
  subnetId: subnetId,
  vpcSecurityGroupIds: [fogServiceSg.id],
  rootBlockDevice: {
    volumeSize: 30,
    volumeType: "gp2",
  },
});

export const fogServiceDns = fogService.publicDns;
export const fogServiceIp = fogService.publicIp;
export const vpcId = vpc.id;
export const publicSubnetIds = vpc.publicSubnetIds;
export const privateSubnetIds = vpc.privateSubnetIds;
export const isolatedSubnetIds = vpc.isolatedSubnetIds;
