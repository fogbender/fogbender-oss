{config, lib, pkgs, ...}:
let
  staff = import ../lib/staff.nix {inherit pkgs;};
in
{
  config = {
    services.openssh.settings.PasswordAuthentication = false;

    users.users = {
      fogbender = {
        isNormalUser = true;
        home = "/home/fogbender";
        description = "Fogbender user";
        extraGroups = [ "wheel" "networkmanager" ];
        openssh.authorizedKeys.keys = staff.keys;
      };
    };

    users.users.root.openssh.authorizedKeys.keys = staff.keys;
  };
}
