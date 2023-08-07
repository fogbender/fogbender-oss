{ config, lib, pkgs, ... }:

{
  nix.gc = {
    automatic = true;
    options = "--delete-older-than 14d";
  };

  nix.settings.auto-optimise-store = true;
}
