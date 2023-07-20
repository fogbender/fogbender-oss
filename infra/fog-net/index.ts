import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import { resourceName, addPeerRoute, vpcFlowLog } from "../lib/utils";

const config = new pulumi.Config();
const project = pulumi.getProject();
const stack = pulumi.getStack();
const cidrBlock = config.require("cidrBlock");
const peerVpcStackName = config.get("peerVpcStack");
const privateZoneName = config.get("privateZone");

const vpcName = resourceName("vpc");
const vpc = new awsx.ec2.Vpc(vpcName, {
  tags: {
    Name: vpcName,
  },
  numberOfAvailabilityZones: 2,
  subnetSpecs: [{ type: "Public" }, { type: "Private" }, { type: "Isolated" }],
  enableDnsHostnames: true,
  enableDnsSupport: true,
  cidrBlock: cidrBlock,
});

vpcFlowLog(stack, vpc.vpcId);

if (peerVpcStackName !== undefined) {
  const peerStack = new pulumi.StackReference(peerVpcStackName);
  const peerVpcId = peerStack.requireOutput("vpcId");

  const peerVpc = aws.ec2.getVpcOutput({ id: peerVpcId });

  const peerConn = new aws.ec2.VpcPeeringConnection(resourceName("peering-conn"), {
    peerVpcId: peerVpcId,
    vpcId: vpc.vpcId,
    autoAccept: true,
  });

  addPeerRoute(
    resourceName("pub1-peer-route"),
    peerStack.requireOutput("publicSubnetIds").apply(t => t[0]),
    cidrBlock,
    peerConn
  );
  addPeerRoute(
    resourceName("prv1-peer-route"),
    peerStack.requireOutput("privateSubnetIds").apply(t => t[0]),
    cidrBlock,
    peerConn
  );
  addPeerRoute(
    resourceName("pub2-peer-route"),
    vpc.publicSubnetIds.apply(t => t[0]),
    peerVpc.cidrBlock,
    peerConn
  );
  addPeerRoute(
    resourceName("prv2-peer-route"),
    vpc.privateSubnetIds.apply(t => t[0]),
    peerVpc.cidrBlock,
    peerConn
  );
}

if (privateZoneName !== undefined) {
  const privateZoneId = aws.route53
    .getZone(
      {
        name: privateZoneName,
        privateZone: true,
      },
      { async: true }
    )
    .then(zone => zone.zoneId);

  new aws.route53.ZoneAssociation(resourceName("pivate-zone-assoc"), {
    zoneId: privateZoneId,
    vpcId: vpc.vpcId,
  });
}

export const vpcId = vpc.vpcId;
export const publicSubnetIds = vpc.publicSubnetIds;
export const privateSubnetIds = vpc.privateSubnetIds;
export const isolatedSubnetIds = vpc.isolatedSubnetIds;
