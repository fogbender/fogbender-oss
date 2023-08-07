{config, modulesPath, ...}:
{
  imports = [
    "${modulesPath}/virtualisation/amazon-image.nix"
    ./nix-gc.nix
  ];
  ec2.hvm = true;
  system.stateVersion = "23.05";
  nix.settings.experimental-features = [ "nix-command" "flakes" ];
}
