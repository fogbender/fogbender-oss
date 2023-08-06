{ config, lib, pkgs, ... }:

# Configuration for AWS otel service
with lib;
let

  cfg = config.aws-otel;
  hostName = config.networking.hostName;
  fileStorage = "/var/lib/otelcol";

in
{
  imports = [ ./open-telemetry.nix ];

  options.aws-otel = {
    env = mkOption {
      type = types.str;
      description = lib.mdDoc "Env used as prefix for log groups";
      default = "test";
    };
  };

  config = {
    services.otel-contrib.enable = true;

    services.otel-contrib.environmentFiles = [ config.sops.secrets."otel.env".path ];

    services.otel-contrib.settings = {
      extensions = {
        file_storage.directory = fileStorage;
      };

      receivers = {
        otlp = {
          protocols.grpc.endpoint = "localhost:4317";
          protocols.http.endpoint = "localhost:4318";
        };

        hostmetrics.scrapers = {
          cpu  = {};
          disk = {};
          load = {};
          filesystem = {};
          memory = {};
          network = {};
          paging  = {};
          processes = {};
        };

        journald = {
          priority = "info";
          storage = "file_storage";
          operators = [
            {
              type = "move";
              from = "body.MESSAGE";
              to = "body.message";
            }
            {
              type = "copy";
              from = "body._SYSTEMD_UNIT";
              to = "body.service";
            }
          ];
        };
      };

      processors = {
        batch.timeout = "60s";
        "resourcedetection/ec2".detectors = [ "ec2" ];
      };

      exporters.awsemf = {
        log_group_name = "${cfg.env}/metrics";
        log_stream_name = hostName;
        namespace = "${cfg.env}/metrics";
        dimension_rollup_option = 1;
        log_retention = 1;
        resource_to_telemetry_conversion.enabled = true;
      };

      exporters.awscloudwatchlogs = {
        log_group_name = "${cfg.env}/logs";
        log_stream_name = hostName;
        log_retention = 60;
      };

      exporters."otlphttp/hdx" = {
        endpoint = "\${env:HYPER_DX_API_URL}";
        headers = {
          authorization = "\${env:HYPER_DX_API_KEY}";
          compression =  "gzip";
        };
      };

      service = {
        extensions = [ "file_storage" ];

        pipelines.metrics.receivers = [ "otlp" "hostmetrics" ];
        pipelines.metrics.processors = [ "resourcedetection/ec2" "batch" ];
        pipelines.metrics.exporters =  [ "awsemf" "otlphttp/hdx"];

        pipelines.logs.receivers = [ "journald" ];
        pipelines.logs.processors = [ "batch" ];
        pipelines.logs.exporters =  [ "awscloudwatchlogs" "otlphttp/hdx"];
      };
    };
  };
}
