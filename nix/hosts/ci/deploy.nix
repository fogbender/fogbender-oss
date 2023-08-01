{ config, lib, pkgs, ... }:

let
  staff = import ../../lib/staff.nix {inherit pkgs;};
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
        extraGroups = [ "wheel" "networkmanager" "gitlab-runner"];
        openssh.authorizedKeys.keys = staff.keys;
      };
    };

    environment.systemPackages = with pkgs; [
      deploy-rs
      fog-deploy
    ];

    systemd.tmpfiles.rules =
      [
        "d ${home}/.ssh 700 deploy - -"
        "d ${home}/build 700 deploy - -"
      ];

    security.sudo.extraRules = [
      { groups = [ "users" ];
        runAs = "deploy";
        commands = [  { command = "${fog-deploy}/bin/fog-deploy"; options = [ "NOPASSWD" ]; } ]; }
    ];

  };
}
