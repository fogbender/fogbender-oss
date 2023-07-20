{ config, lib, pkgs, ... }:
let
  env = import ./env.nix;
in
{
  imports = [
    ../../modules/aws-ec2.nix
    ../../modules/aws-ec2-users.nix
    ../../modules/aws-ec2-open-telemetry.nix
    ../../modules/aws-fog-api.nix
  ];

  networking.hostName = "api-stage";
  networking.domain = "fogbender.net";
  aws-otel.env = "test";

  sops.secrets."otel.env" = {
    sopsFile = ../../secrets/stage/otel.env;
    format = "dotenv";
  };

  sops.secrets."fogbender.env" = {
    sopsFile = ../../secrets/stage/fogbender.env;
    format = "dotenv";
  };

  fog-api.secretsFile = config.sops.secrets."fogbender.env".path;
  fog-api.environment = env;
}
