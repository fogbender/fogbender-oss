{ pkgs ? import ../. {} }:

with pkgs;
let
  nixShellDir = toString ../../.nix-shell;
  nixopsStateFile = nixShellDir + "/state.nixops";
  nixDeployDir = toString ./.;
  localEnvFile = toString ../../local.env;
in
pkgs.mkShell {
  buildInputs = [
    gnumake
    git
    which
    nixops
    nodejs yarn
    pulumi
  ];

  shellHook = ''
  mkdir -p ${nixShellDir}
  export NIX_PATH=${pkgs.path}:nixpkgs=${pkgs.path}:.
  if [ -f "${localEnvFile}" ]; then
  echo Sourcing local.env..
  . ${localEnvFile}
  fi
  export PS1='\n\[\033[1;32m\][nix-deploy:\w]\$\[\033[0m\] '

  export NIXOPS_STATE="${nixopsStateFile}"
  function check-deployment () {
      if [ `nixops list | grep -c $1` -eq 0 ]
      then
       (set -x; nixops create --deployment $1 "${nixDeployDir}/$1.nix")
      fi
  }

  check-deployment aws-fog-service
  check-deployment aws-fog-test
  check-deployment aws-fog-stage
  check-deployment aws-fog-prod
  '';
}
