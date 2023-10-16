import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as cloud from "@pulumi/cloud";

/*
Domains:
  demo1.fogbender.com
  demo1.fogbender-test.com

No DNS:
  MR      - staging server - preview--fb-client.netlify.app
Route53:
  prod    - prod server    - client.fogbender.com           CNAME fb-client.netlify.app
  staging - staging server - client.fogbender-test.com      CNAME staging-client--fb-client.netlify.app
  beta    - prod server    - beta-client.fogbender.com      CNAME master--fb-client.netlify.app
  beta2   - staging server - beta-client.fogbender-test.com CNAME master--fb-client.netlify.app


Netlify settings:

fb-client:
  base directory: client
  production branch: production-client
  deploy MRs
  branch deploy: master, staging-client

*/

const config = new pulumi.Config();

// set cname for netlify
const hostedZoneId = aws.route53
  .getZone({ name: config.require("domainName") })
  .then(zone => zone.zoneId);

const clientNetlifyDomain = config.require("netlifyDomain");
const clientBetaDomain = config.require("betaDomain");

const dnsRecordClient = new aws.route53.Record("clientNetlify", {
  name: "client",
  zoneId: hostedZoneId,
  type: "CNAME",
  records: [clientNetlifyDomain],
  ttl: 300,
});

const dnsRecordBeta = new aws.route53.Record("clientNetlifyBeta", {
  name: "beta-client",
  zoneId: hostedZoneId,
  type: "CNAME",
  records: [clientBetaDomain],
  ttl: 300,
});

export const domain = dnsRecordClient.fqdn;
export const betaDomain = dnsRecordBeta.fqdn;
