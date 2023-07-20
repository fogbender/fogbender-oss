{config, lib, pkgs, ...}:
{
  imports = [ <nixpkgs/nixos/modules/virtualisation/amazon-image.nix> ];
  config.ec2.hvm = true;
}
