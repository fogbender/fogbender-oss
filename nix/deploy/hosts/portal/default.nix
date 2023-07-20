{ config, lib, pkgs, ... }:

{
  imports = [
    ../../modules/aws-ec2.nix
    ../../modules/aws-ec2-users.nix
    ../../modules/aws-ec2-open-telemetry.nix
  ];

  networking.hostName = "portal";
  networking.domain = "fogbender.com";
  aws-otel.env = "admin";
  sops.secrets."otel.env" = {
    sopsFile = ../../secrets/admin/otel.env;
    format = "dotenv";
  };
}
