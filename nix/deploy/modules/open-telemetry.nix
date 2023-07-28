{ config, lib, pkgs, ... }:
with lib;
let
  cfg = config.services.otel-contrib;
  settingsFormat = pkgs.formats.yaml { };
  configFile = settingsFormat.generate "otel-contrib.yaml" cfg.settings;
in
{
  imports = [ ./decrypt-sops-service.nix ];

  options.services.otel-contrib = {
    enable = mkEnableOption (lib.mdDoc "Open Telemetry collector");

    package = mkOption {
      type = types.path;
      description = lib.mdDoc "The Open Telemetry package to use";
      default = pkgs.opentelemetry-collector-contrib;
      defaultText = literalExpression "pkgs.opentelemetry-collector-contrib";
    };


    environmentFiles = mkOption {
      type = types.listOf types.path;
      default = [ ];
      description = lib.mdDoc ''
        List of environment files set in the otel systemd service.
        For example API secrets should be set in one of these files.
      '';
    };

    settings = mkOption {
      description = lib.mdDoc ''
        Configuration for `otel-contrib`.

        See https://opentelemetry.io/docs/collector/configuration/
      '';

      type = types.submodule {
        freeformType = settingsFormat.type;
      };

      default = {};
      example = {
        receivers = {
          otlp = {
            protocols.grpc.endpoint = "localhost:4317";
            protocols.http.endpoint = "localhost:4318";
          };
        };

        processors.batch.timeout = "60s";

        exporters.awsemf = {};

        service = {
          pipelines.metrics.receivers = [ "otlp" ];
          pipelines.metrics.processors = [ "batch" ];
          pipelines.metrics.exporters =  [ "awsemf" ];
        };

      };
    };
  };

  config = mkIf cfg.enable {
    services.otel-contrib.settings = {};

    systemd.services.otel-contrib = {
      inherit (cfg.package.meta) description;
      after    = [ "network.target" "decrypt-sops.service" ];
      requires = [ "decrypt-sops.service" ];
      wantedBy = [ "multi-user.target" ];
      script = ''
        set -euo pipefail
        shopt -u nullglob

        exec ${cfg.package}/bin/otelcontribcol --config=${configFile}
      '';
      serviceConfig = {
        KillMode = "mixed";
        Restart = "always";
        RestartSec = 2;
        DynamicUser = true;
        SupplementaryGroups = [
          # allow to read the systemd journal for log forwarding
          "systemd-journal"
        ];
        Type = "simple";
        StateDirectory = [ "otelcol" ];
        EnvironmentFile = cfg.environmentFiles;
      };
    };
  };
}
