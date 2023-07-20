{ config, pkgs, lib, ...}:
with lib;
let
  pkgs = import ../default.nix {};
  fogbender = pkgs.fogbender;
  cfg = config.services.fogbender;
in
  {
    options.services.fogbender = {
      enable = lib.mkEnableOption "Fogbender service";
      envFile = lib.mkOption {
        description = ''
          Configuration file used by Fogbender server on run;
          It is a list of environment variables.

          Example:

          FOG_ENV = "prod"
          FOG_IP  = "0.0.0.0"
          FOG_PORT = "8000"

          PG_PORT = "5432"
          PG_HOST = "127.0.0.1"
          PG_USER = "fogbender"
          PG_DB = "fogbender"
          PG_PASS = ""
        '';
        type = lib.types.path;
      };

      migrateDb = mkOption {
        default = true;
        type = types.bool;
        description = ''
          Set to true if database migration should be performed on start of Fogbender service.
        '';
      };

      workDir = mkOption {
        default = "/run/fogbender";
        type = types.path;
        description = "The working directory used. If not exists it will be created with 0700 access for user.";
      };

      package = mkOption {
        description = "Fogbender package to use";
        default = fogbender.server;
        defaultText = "fogbender.server";
        type = types.package;
        example = literalExample "fogbender.server";
      };

      packages = mkOption {
        default = [ pkgs.bash pkgs.imagemagick ];
        defaultText = "[ pkgs.bash pkgs.imagemagick ]";
        type = types.listOf types.package;
        description = ''
          Packages to add to PATH for the Fogbender process.
        '';
      };

      user = mkOption {
        description = "User to run Fogbender process";
        default = "fogbender";
        type = types.str;
      };
    };

    ###### Implementation

    config = mkIf cfg.enable {
      systemd.services.fogbender = {
        path = cfg.packages;
        description = "Fogbender service";
        after = [ "network.target" ];
        wantedBy = [ "multi-user.target" ];
        serviceConfig = {
          WorkingDirectory = cfg.workDir;
          User = cfg.user;
          EnvironmentFile = "${cfg.envFile}";
          ExecStart = "${cfg.package}/bin/fog start";
          ExecStop = "${cfg.package}/bin/fog stop";
          Restart = "always";
        } //  optionalAttrs (cfg.migrateDb) {
          ExecStartPre = "${cfg.package}/bin/fog-ctl migrate";
        };
        environment.RELEASE_TMP = cfg.workDir + "/tmp";
      };
      systemd.tmpfiles.rules = [ "d ${cfg.workDir} 0700 ${cfg.user} - -" ];
      # Make the fogbender commands available
      environment.systemPackages = [ cfg.package ];
    };
  }
