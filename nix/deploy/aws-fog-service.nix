let
  infra = import ./aws-infra.nix;
  home = "/var/lib/gitlab-runner";
in
{
  fog-service = { config, pkgs, lib, ... }:
    let
      gitlabRunnerHome = config.users.users.gitlab-runner.home;

    in
    {
      imports = [ ./aws-ec2.nix ./aws-ec2-users.nix ./aws-ec2-user-deploy.nix ];
      deployment.targetHost = infra.service.domain;

      environment.systemPackages = with pkgs; [git bash git-lfs];

      services.gitlab-runner = {
        enable = true;

        services.shell = {
          registrationConfigFile = pkgs.writeText "gitlab-runner-shell-registration" ''
            CI_SERVER_URL=https://gitlab.com/
            REGISTRATION_TOKEN=jYCLuip-tKTQ7M3etBU7
          '';
          executor = "shell";
        };
      };

      systemd.services.gitlab-runner.serviceConfig = {
        DynamicUser = lib.mkForce false;
        User = "gitlab-runner";
        Group = "gitlab-runner";
      };

      users.users = {
        gitlab-runner = {
          group = "gitlab-runner";
          extraGroups = [ "users" "docker" ];
          uid = config.ids.uids.gitlab-runner;
          home = home;
          createHome = true;
        };
      };

      users.groups.gitlab-runner.gid = config.ids.gids.gitlab-runner;

      systemd.tmpfiles.rules =
        [
          "d ${home}/.ssh 700 gitlab-runner - -"
        ];

      deployment.keys.id_rsa = {
        keyFile = ../../secrets/gitlab-runner.key;
        destDir = "${home}/.ssh";
        user = "gitlab-runner";
        group = "users";
        permissions = "0600";
      };

      deployment.keys."id_rsa.pub" = {
        keyFile = ../../secrets/gitlab-runner.pub;
        destDir = "${home}/.ssh";
        user = "gitlab-runner";
        group = "users";
        permissions = "0644";
      };

      programs.ssh.knownHosts={
        gitlab = {
          hostNames = ["gitlab.com" "172.65.251.78"];
          publicKey = "ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBFSMqzJeV9rUzU4kWitGjeR4PWSa29SPqJ1fVkhtj3Hw9xjLVXVYrU9QlYWrOLXBpQ6KWjbjTDTdDkoohFzgbEY=";
        };
      };
    };
}
