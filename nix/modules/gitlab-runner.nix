{ config, lib, pkgs, ... }:
let
  home = "/var/lib/gitlab-runner";
in
{
  imports = [ ./decrypt-sops-service.nix ];

  environment.systemPackages = with pkgs; [git bash git-lfs];

  services.gitlab-runner = {
    enable = true;

    services.shell = {
      registrationConfigFile = config.sops.secrets."gitlab-runner-registration.env".path;
      executor = "shell";
    };
  };

  systemd.services.gitlab-runner = {
    after    = [ "decrypt-sops.service" ];
    requires = [ "decrypt-sops.service" ];
    serviceConfig = {
      DynamicUser = lib.mkForce false;
      User = "gitlab-runner";
      Group = "gitlab-runner";
    };
  };

  users.users = {
    gitlab-runner = {
      group = "gitlab-runner";
      extraGroups = [ "users" "docker" "keys"];
      uid = config.ids.uids.gitlab-runner;
      home = home;
    };
  };

  users.groups.gitlab-runner.gid = config.ids.gids.gitlab-runner;

  systemd.tmpfiles.rules =
    [
      "d ${home} 755 gitlab-runner gitlab-runner"
      "d ${home}/.ssh 700 gitlab-runner - -"
    ];

  programs.ssh.knownHosts={
    gitlab = {
      hostNames = ["gitlab.com" "172.65.251.78"];
      publicKey = "ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBFSMqzJeV9rUzU4kWitGjeR4PWSa29SPqJ1fVkhtj3Hw9xjLVXVYrU9QlYWrOLXBpQ6KWjbjTDTdDkoohFzgbEY=";
    };
  };
}
