import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as cloud from "@pulumi/cloud";
import { execSync } from "child_process";

const config = new pulumi.Config();
const dbUser = "fogbender";
const dbPassword = config.requireSecret("dbPassword");
const googleClientId = config.require("googleClientId");
const googleClientSecret = config.requireSecret("googleClientSecret");
const storefrontUrl = config.requireSecret("storefrontUrl");

// see https://github.com/pulumi/examples/blob/master/aws-ts-airflow/index.ts
// and https://github.com/andyfurnival/iac-typescript/blob/master/src/iac/infrastructure.ts
const vpc = awsx.ec2.Vpc.getDefault();

const dbSubnets = new aws.rds.SubnetGroup("dbsubnets", {
  subnetIds: vpc.publicSubnetIds,
});

const group = new awsx.ec2.SecurityGroup("rds-group", {
  vpc: vpc,
  description: "incoming all; outgoing all",
});

group.createIngressRule("allow everyhing incoming", {
  ports: { protocol: "-1", fromPort: 0 },
  location: { cidrBlocks: ["0.0.0.0/0"] },
});
group.createEgressRule("allow everyhing outgoing", {
  ports: { protocol: "-1", fromPort: 0 },
  location: { cidrBlocks: ["0.0.0.0/0"] },
});

const db = new aws.rds.Instance("rds", {
  engine: "postgres",

  instanceClass: aws.rds.InstanceTypes.T2_Micro,
  allocatedStorage: 20,

  name: dbUser,
  username: dbUser,
  password: dbPassword,

  dbSubnetGroupName: dbSubnets.id,
  vpcSecurityGroupIds: [group.id],

  skipFinalSnapshot: true,

  backupRetentionPeriod: 5,
  backupWindow: "07:00-09:00",
});

execSync("rsync --delete-excluded --exclude=_build --exclude=deps -r ../../server/ app/fog/");

let sshService = new cloud.Service(
  "ssh-service",
  {
    containers: {
      ssh_debug: {
        // image: awsx.ecs.Image.fromPath("name", ".../path"),
        image: "linuxserver/openssh-server",
        ports: [{ port: 2222, targetPort: 2222, protocol: "tcp" }],
        environment: {
          SUDO_ACCESS: "true",
          USER_NAME: "jlarky",
          PUBLIC_KEY:
            "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFzDazheDy3oi2X2LLoEbJnwsiAkcxjNbMONuPkZqE0v jlarky@jlarky-XPS-15-9560",
        },
        memory: 128,
      },
    },
    replicas: 1,
  },
  {}
);

export const sshHost = sshService.defaultEndpoint.apply(e => `${e.hostname}`);

let service = new cloud.Service("elixir-server", {
  containers: {
    elixir_fog: {
      image: "elixir-fog-server",
      build: "./app",
      memory: 128,
      ports: [{ port: 443, protocol: "https", targetPort: 8000, external: true }],
      environment: {
        RELEASE_TMP: "/tmp/fog",
        LANG: "C.UTF-8",
        FOG_ENV: "prod",
        FOG_PORT: "8000",
        FOG_IP: "0.0.0.0",
        FOG_STOREFRONT_URL: storefrontUrl,
        PG_HOST: db.endpoint.apply(e => e.split(":")[0]),
        PG_PORT: "5432",
        PG_DB: dbUser,
        PG_USER: dbUser,
        PG_PASS: dbPassword,
        GOOGLE_CLIENT_ID: googleClientId,
        GOOGLE_CLIENT_SECRET: googleClientSecret,
      },
    },
  },
  replicas: 1,
});

export const url = service.defaultEndpoint.apply(e => `https://${e.hostname}`);

const hostedZoneId = aws.route53
  .getZone({ name: config.require("domainName") }, { async: true })
  .then(zone => zone.zoneId);

const serverDNS = new aws.route53.Record("server", {
  name: "server",
  type: aws.route53.RecordTypes.CNAME,
  records: [service.defaultEndpoint.hostname],
  zoneId: hostedZoneId,
  ttl: 300,
});

export const serverUrl = serverDNS.fqdn.apply(x => `https://${x}`);
