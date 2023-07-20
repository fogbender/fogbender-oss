import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as cloud from "@pulumi/cloud";

const config = new pulumi.Config();
const domainName = config.require("domainName"); // fogbender-test.com
const serverDomain = config.require("serverDomain"); // server.fogbender-test.com
const server2Domain = config.require("server2Domain"); // server2.fogbender-test.com

const certCertificate = new aws.acm.Certificate("cert", {
  domainName: serverDomain,
  subjectAlternativeNames: [server2Domain],
  validationMethod: "DNS",
});
const zone = pulumi.output(
  aws.route53.getZone(
    {
      name: domainName,
      privateZone: false,
    },
    { async: true }
  )
);
const certValidation = new aws.route53.Record("certValidation", {
  name: certCertificate.domainValidationOptions[0].resourceRecordName,
  records: [certCertificate.domainValidationOptions[0].resourceRecordValue],
  ttl: 60,
  type: certCertificate.domainValidationOptions[0].resourceRecordType,
  zoneId: zone.id,
});
const certValidationAlt1 = new aws.route53.Record("certValidationAlt1", {
  name: certCertificate.domainValidationOptions[1].resourceRecordName,
  records: [certCertificate.domainValidationOptions[1].resourceRecordValue],
  ttl: 60,
  type: certCertificate.domainValidationOptions[1].resourceRecordType,
  zoneId: zone.id,
});
const certCertificateValidation = new aws.acm.CertificateValidation("cert", {
  certificateArn: certCertificate.arn,
  validationRecordFqdns: [certValidation.fqdn, certValidationAlt1.fqdn],
});

export const acmCertForServer = certCertificateValidation.certificateArn; // to use in server stack
