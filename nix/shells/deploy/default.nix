{ pkgs, ... }:

with pkgs; mkShell {
  buildInputs = [
    pulumi-bin
    nodejs
    yarn
    python3
    deploy-rs
    sops
    awscli2
    azure-cli azure-storage-azcopy
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
