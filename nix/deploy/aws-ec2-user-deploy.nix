{config, lib, pkgs, ...}:
let
  staff = import ./staff.nix {inherit pkgs;};
  home = "/home/deploy";
  fog-deploy = pkgs.writeShellScriptBin "fog-deploy" (builtins.readFile ./fog-deploy.sh);
in
{
  config = {
    users.users = {
      deploy = {
        isNormalUser = true;
        home = home;
        description = "Deploy user";
        extraGroups = [ "wheel" "networkmanager" ];
        openssh.authorizedKeys.keys = staff.keys;
      };
    };

    environment.systemPackages = with pkgs; [
      gnupg
      git-crypt
      fog-deploy
    ];

    systemd.tmpfiles.rules =
      [
        "d ${home}/.ssh 700 deploy - -"
        "d ${home}/.gnupg 700 deploy - -"
        "d ${home}/build 700 deploy - -"
      ];

    deployment.keys."deploy.key" = {
      keyFile = ../../secrets/deploy.key;
      destDir = "${home}/.ssh";
      user = "deploy";
      group = "users";
      permissions = "0600";
    };

    deployment.keys."deploy.pub" = {
      keyFile = ../../secrets/deploy.pub;
      destDir = "${home}/.ssh";
      user = "deploy";
      group = "users";
      permissions = "0644";
    };

    deployment.keys."deploy-gpg.key" = {
      keyFile = ../../secrets/deploy-gpg.key;
      destDir = "${home}/.gnupg";
      user = "deploy";
      group = "users";
      permissions = "0600";
    };

    systemd.services.deploy-ssh-setup = {
      enable = true;
      description = "Configure deploy ssh";
      wantedBy = [ "multi-user.target" ];
      script = "echo 'IdentityFile ${home}/.ssh/deploy.key' > ${home}/.ssh/config";
      serviceConfig = {
        Type = "oneshot";
        User = "deploy";
      };
    };

    systemd.services.deploy-gpg-setup = {
      enable = true;
      description = "Configure deploy gpg";
      after = [ "deploy-gpg.key-key.service" ];
      wants = [ "deploy-gpg.key-key.service" ];
      wantedBy = [ "multi-user.target" ];
      path = [ pkgs.gnupg ];
      script = ''
        gpg --import ${home}/.gnupg/deploy-gpg.key
      '';
      serviceConfig = {
        Type = "oneshot";
        User = "deploy";
      };
    };

    security.sudo.extraRules = [
      { groups = [ "users" ];
        runAs = "deploy";
        commands = [  { command = "${fog-deploy}/bin/fog-deploy"; options = [ "NOPASSWD" ]; } ]; }
    ];

  };
}
