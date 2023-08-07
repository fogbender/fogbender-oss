{ config, lib, pkgs, ... }:

{
  imports = [
    ../../modules/aws-ec2.nix
    ../../modules/aws-ec2-users.nix
    ../../modules/aws-ec2-open-telemetry.nix
    ../../modules/gitlab-runner.nix
    ./deploy.nix
  ];

  networking.hostName = "ci";
  networking.domain = "fogbender.net";
  aws-otel.env = "admin";

  sops.secrets."otel.env" = {
    sopsFile = ../../secrets/admin/otel.env;
    format = "dotenv";
  };

  sops.secrets."gitlab-runner-registration.env" = {
    sopsFile = ../../secrets/admin/gitlab-runner-registration.env;
    format = "dotenv";
  };

  # on build will run gc if free disk space less than 5gb
  nix.extraOptions = ''
    min-free = ${toString (5 * 1025 * 1024 * 1024)}
    max-free = ${toString (15 * 1024 * 1024 * 1024)}
  '';

}
