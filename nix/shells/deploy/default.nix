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

    echo Sourcing nix/secrets/dev/dev.env..
    eval "$(sops -d nix/secrets/dev/dev.env)"

    set +a

    if [ -f "./local.env" ]; then
    echo Sourcing local.env..
    . local.env
    fi
  '';
}
