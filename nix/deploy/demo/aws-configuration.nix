let
  pkgs = import ../default.nix {};
  staff = import ./staff.nix {inherit pkgs;};
in
{
  imports = [ <nixpkgs/nixos/modules/virtualisation/amazon-image.nix> ];
  ec2.hvm = true;
  networking.dhcpcd.enable = false;
  systemd.network.enable = true;
  systemd.network.networks = { internet0 = { matchConfig = { Name = "eth0"; };
                                             networkConfig = { DHCP = "ipv4"; };
                                           };
                             };
  services.openssh.passwordAuthentication = false;
  users.users = {
    "fogbender" = {
      isNormalUser = true;
      home = "/home/fogbender";
      description = "Fogbender user";
      extraGroups = [ "wheel" "networkmanager" ];
      openssh.authorizedKeys.keys = staff.keys;
    };
  };
  users.users.root.openssh.authorizedKeys.keys = staff.keys;
}
