{ resources, pkgs, lib, node, ...}:
let
ec2 = {
  deployment.targetEnv = "ec2";
  deployment.ec2.region = "us-east-1";
  deployment.ec2.instanceType = "t2.nano";
  deployment.ec2.accessKeyId = "fogbener";
};

in
{
  network.description = "fogbender";
  network.enableRollback = true;
  resources.ec2KeyPairs.fogbender.region = "us-east-1";

  #hosts
  backend = ec2;
}
