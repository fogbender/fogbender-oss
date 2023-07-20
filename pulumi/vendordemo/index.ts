import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as cloud from "@pulumi/cloud";

/*
Domains:
  demo1.fogbender.com
  demo1.fogbender-test.com

No DNS:
  MR      - staging server - preview--fb-vendordemo.netlify.com
Route53:
  prod    - prod server    - demo1.fogbender.com      CNAME fb-vendordemo-prod.netlify.com
  staging - staging server - demo1.fogbender-test.com fb-vendordemo.netlify.com


Netlify settings:

fb-vendordemo:
  base directory: vendor-demo
  production branch: staging-vendordemo
  deploy MRs
  no other branches

fb-vendordemo-prod
  base directory: vendor-demo
  production branch: production-vendordemo
  no MRs
  no other branches

*/

const config = new pulumi.Config();

// set cname for netlify
const hostedZoneId = aws.route53
  .getZone({ name: config.require("domainName") })
  .then(zone => zone.zoneId);

const vendordemoNetlifyDomain = config.require("netlifyDomain");

const dnsRecordBeta = new aws.route53.Record("vendordemoNetlifyBeta", {
  name: "demo1",
  zoneId: hostedZoneId,
  type: "CNAME",
  records: [vendordemoNetlifyDomain],
  ttl: 300,
});

export const netlifyDomain = dnsRecordBeta.fqdn;
