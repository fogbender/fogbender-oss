let
  pkgs = import ../../default.nix {};
  fogbender = pkgs.fogbender;
in
{
  nixos-demo = { config, pkgs, ... }:
    {
      imports = [ ../aws-ec2.nix ../aws-ec2-users.nix ];
      deployment.targetEnv = "none";
      deployment.targetHost = "52.91.29.234";
    };
}
