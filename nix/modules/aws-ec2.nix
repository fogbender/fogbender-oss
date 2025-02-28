{config, modulesPath, lib, ...}:
{
  imports = [
    "${modulesPath}/virtualisation/amazon-image.nix"
    ./nix-gc.nix
  ];
  ec2.hvm = true;
  system.stateVersion = "23.05";
  nix.settings.experimental-features = [ "nix-command" "flakes" ];

  # workaround for default GRUB device issue https://github.com/NixOS/nixpkgs/issues/62824
  boot.loader.grub.device = lib.mkForce "/dev/nvme0n1";
}
