let
  vbox =
    { config, pkgs, ... }:
    {
      deployment.targetEnv = "virtualbox";
      deployment.virtualbox.memorySize = 2048;
      deployment.virtualbox.vcpu = 2;
      deployment.virtualbox.headless = true;
    };
in
{
  network.description = "fogbender-vbox";
  network.enableRollback = true;
  backend = vbox;
}
