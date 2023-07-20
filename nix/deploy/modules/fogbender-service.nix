{ config, pkgs, lib, ... }:
with lib;
let
  fogbender = pkgs.fogbender;
  cfg = config.services.fogbender;
  cookie = cfg.workDir + "/.cookie";
in
  {
    options.services.fogbender = {
      enable = lib.mkEnableOption "Fogbender service";

      environmentFiles = lib.mkOption {
        description = "List of environment files.";
        type = with lib.types; listOf path;
        default = [];
      };

      environment = lib.mkOption {
        description = "Additional environment vars";
        type = with types; attrsOf str;
        default = {};
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
        type = with types; listOf package;
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
          EnvironmentFile = cfg.environmentFiles;
          ExecStart = "${cfg.package}/bin/fog start";
          ExecStop = "${cfg.package}/bin/fog stop";
          Restart = "always";
          ExecStartPre = let preScript = pkgs.writers.writeBashBin "fogStartPre" ''
            if [ ! -f ${cookie} ] || [ ! -s ${cookie} ]
            then
              echo "Creating cookie file"
              dd if=/dev/urandom bs=1 count=16 | ${pkgs.hexdump}/bin/hexdump -e '16/1 "%02x"' > ${cookie}
            fi
          '';
          in
            [ "${preScript}/bin/fogStartPre" ]
            ++ optional (cfg.migrateDb) "${cfg.package}/bin/fog-ctl migrate";
        };
        environment = {
          RELEASE_TMP = cfg.workDir + "/tmp";
          RELEASE_COOKIE = cookie;
        } // cfg.environment;
      };
      systemd.tmpfiles.rules = [ "d ${cfg.workDir} 0700 ${cfg.user} - -" ];
      # Make the fogbender commands available
      environment.systemPackages = [ cfg.package ];
    };
  }
