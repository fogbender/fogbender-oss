import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as cloud from "@pulumi/cloud";

// Get the id for the latest Amazon Linux AMI
export const nixosAmi = aws
  .getAmi(
    {
      filters: [
        {
          name: "name",
          values: ["NixOS-21.05.740.aa576357673-x86_64-linux"],
        },
      ],
      owners: ["080433136561"], // NixOS
      mostRecent: true,
    },
    {
      async: true,
    }
  )
  .then(result => result.id);

export const nixosKey = new aws.ec2.KeyPair("nixos key", {
  publicKey:
    "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDhhMzW9xGfRUloKKSJdO0H4LKIGf/sY76pMwyu7u143HOMl7svwL0/seJmX7r0ewp9vS7JDjvvlfX3PhFndOTpKqxLXqkNrgA/e8hhxbe/LMunworHQmFgFcME2m5jButGR6axRvWY6ekEjOSSZh3JLmm1j7f5tdrVge5PLPniDvvHqUfJK3ljhxJCb5nJFrWvSGlHxUFqDiXIS2kOPhQ+eCKJNc3Wm3ma/b0oSl2w2ExdjBusnD3C+pa+Cv84YcWD4ArwBAZD8kGjZyM8cmcxtd3eY1YqNYREKHnRRaBwMVKeL361Q46tVsbUwH5HPoTGS7M59zgbu6P1nKq3EN/rOcBK0RtXpp0KIOHOftzMn0Z3O7ByDIOTvOgMNWUru8vPpslHCymwbewzWcI+THTqdFhR+vqJOR2EfhQVq4WGq8OTTJumo7+9pIM11OCfvTcQJgLjfcEF+hPJmvnIttw3awzEOcxcmTJ9gpSiaIFqk45h6LaZILWhKCF2YmlvO5Ae+XlNo20Jhs8BsIhhezcvhDOMIzXugduGjuLbjJ1l6Nt0oRYMcJqHvbmvBT8OxU951OymdzKugeKClKM+ENC9z2MyRBZn80lrUId+Tet0CyGj5UcK70YWKM/pYTZDTT6AM0TfaCPpC7Zg9DBozI5YsYK9mPMuZjcTrIK/zV+Zfw== jlarky@jlarky-XPS-15-9560",
});

export const createInstance = (
  name: string,
  size: aws.ec2.InstanceType,
  opts?: Partial<aws.ec2.InstanceArgs>
) => {
  return new aws.ec2.Instance(name, {
    tags: {
      Name: name,
    },
    keyName: nixosKey.keyName,
    instanceType: size,
    ami: nixosAmi,
    ...opts,
  });
};
