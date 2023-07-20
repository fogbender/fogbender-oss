let
  nixos = import <nixpkgs/nixos> {
    configuration = import ./aws-configuration.nix;
  };
in
  nixos.system
