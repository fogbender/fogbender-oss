let
  pkgs = import ../default.nix {};
  fogbender = pkgs.fogbender;
  staff = import ./staff.nix {inherit pkgs;};
  fog_bin = "${fogbender.server}/bin";
  fog_user = "fogbender";
  environment = rec {
    HOME = "/home/${fog_user}";
    RUN_DIR = "/run/fog";
    RELEASE_TMP = RUN_DIR;

    FOG_ENV = "prod";
    FOG_IP  = "0.0.0.0";
    FOG_PORT = "8000";

    PG_PORT = "5432";
    PG_HOST = "127.0.0.1";
    PG_USER = "${fog_user}";
    PG_DB = "${fog_user}";
    PG_PASS = "";
  };
  fogbender_packages = [
    fogbender.server
  ];
  backend =
    { resources, pkgs, lib, nodes, ...}:
    {
      networking.firewall.allowedTCPPorts = [ 22 80 443 8000 ];
      environment.systemPackages = [ pkgs.htop ] ++ fogbender_packages;
      systemd.services.fogbender-server = {
        description = "fogbender-server";
        after = [ "network.target" "postgresql.service" ];
        wantedBy = [ "multi-user.target" ];
        serviceConfig = {
          User = fog_user;
          WorkingDirectory = environment.RUN_DIR;
          ExecStartPre = "${fog_bin}/fog-ctl migrate";
          ExecStart = "${fog_bin}/fog start";
          ExecStop = "${fog_bin}/fog stop";
          Restart = "always";
        };
        inherit environment;
      };
      systemd.tmpfiles.rules = [ "d ${environment.RUN_DIR} 0700 fogbender users -" ];
      services.nginx = {
        enable = true;
      };
      services.postgresql = {
          enable = true;
          package = pkgs.postgresql;
          extraPlugins = with pkgs.postgresql.pkgs; [
            pg_bigm
          ];
          ensureDatabases = [environment.PG_DB];
          ensureUsers = [
            {name = fog_user;
             ensurePermissions = {
               "DATABASE ${environment.PG_DB}" = "ALL PRIVILEGES";
             };
            }
          ];
          authentication = lib.mkForce ''
            # Generated file; do not edit!
            # TYPE  DATABASE        USER            ADDRESS                 METHOD
            local   all             all                                     trust
            host    all             all             127.0.0.1/32            trust
            host    all             all             ::1/128                 trust
         '';
      };
      users.users = {
        "${fog_user}" = {
          isNormalUser = true;
          home = environment.HOME;
          description = "Fogbender user";
          extraGroups = [ "wheel" "networkmanager" ];
          openssh.authorizedKeys.keys = staff.keys;
        };
      };
      users.users.root.openssh.authorizedKeys.keys = staff.keys;
    };
in
{
  inherit backend;
}
