{ config, pkgs, lib, ... }:

with lib;
let
  cfg = config.fog-api;
  env = cfg.environment;
in
{
  imports = [
    ./fogbender-service.nix
  ];

  options.fog-api = {
    environment = mkOption {
      type = with types; attrsOf str;
      description = lib.mdDoc "Environment";
      default = {};
    };

    secretsFile = mkOption {
      type = types.path;
      description = "Environment file with secrets";
    };
  };

  config = {

    networking.firewall.allowedTCPPorts = [ 80 443 ];

    services.fogbender = {
      enable = true;
      environmentFiles = [ cfg.secretsFile ];
      environment = env;
    };

    security.acme.defaults.email = "admin@fogbender.com";
    security.acme.acceptTerms = true;

    services.nginx = {
      enable = true;
      recommendedGzipSettings = true;
      recommendedOptimisation = true;
      recommendedProxySettings = true;
      recommendedTlsSettings = true;
      virtualHosts."${env.FOG_API_DOMAIN}" = {
        forceSSL = true;
        enableACME = true;

        locations = {
          "/" = {
            proxyPass = "http://127.0.0.1:${env.FOG_PORT}";
            proxyWebsockets = true;
          };
        };
      };
    };
  };
}
