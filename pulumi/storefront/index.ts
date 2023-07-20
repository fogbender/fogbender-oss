import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as cloud from "@pulumi/cloud";

/*
Domains:
  fogbender.com
  fogbender-test.com

No DNS:
  MR      - staging server - preview--fb-storefront.netlify.com
Route53:
  prod    - prod server    - (www.)fogbender.com      CNAME fb-storefront-prod.netlify.com
  staging - staging server - (www.)fogbender-test.com CNAME fb-storefront.netlify.com
  beta    - prod server    - beta.fogbender.com       CNAME fb-storefront-beta.netlify.com
  beta-2  - staging server - beta.fogbender-test.com  CNAME fb-storefront-beta.netlify.com


Netlify settings:

fb-storefront:
  production branch: staging-storefront
  deploy MRs
  no other branches

fb-storefront-beta:
  production branch: master
  no MRs
  no other branches

fb-storefront-prod
  production branch: production-storefront
  no MRs
  no other branches

*/

const config = new pulumi.Config();

// set cname for netlify
const hostedZoneId = aws.route53
  .getZone({ name: config.require("domainName") }, { async: true })
  .then(zone => zone.zoneId);

const storeFrontNetlifyDomain = config.require("fixedDomain");
const storeFrontNetlifyBetaDomain = config.require("betaDomain");

const dnsRecordRoot = new aws.route53.Record("storefrontNetlifyRoot", {
  name: "", // root domain
  zoneId: hostedZoneId,
  type: aws.route53.RecordTypes.A,
  records: ["75.2.60.5"],
  ttl: 300,
});

const dnsRecordWWW = new aws.route53.Record("storefrontNetlifyWWW", {
  name: "www",
  zoneId: hostedZoneId,
  type: "CNAME",
  records: [storeFrontNetlifyDomain],
  ttl: 300,
});

const dnsRecordBeta = new aws.route53.Record("storefrontNetlifyBeta", {
  name: "beta",
  zoneId: hostedZoneId,
  type: "CNAME",
  records: [storeFrontNetlifyBetaDomain],
  ttl: 300,
});

export const domain = dnsRecordRoot.fqdn;
export const betaDomain = dnsRecordBeta.fqdn;
