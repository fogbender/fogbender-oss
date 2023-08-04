{ pkgs, unstable, ... }:

with pkgs; mkShell {
  buildInputs = [
    unstable.pulumi-bin
    unstable.nodejs
    unstable.yarn
    python3
    deploy-rs
    sops
    awscli2
  ];

  shellHook = ''
    if [ -f "./local.env" ]; then
    . local.env
    fi
    set -a
    echo Sourcing dev.env..
    . ./config/dev.env
    echo Sourcing dev.secrets.env..
    eval "$(sops -d ./config/dev.secrets.env)"
    set +a
    if [ -f "./local.env" ]; then
    echo Sourcing local.env..
    . local.env
    fi
  '';
}
