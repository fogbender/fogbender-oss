{
  description = "Development environment";

  inputs.flake-utils.url = "github:numtide/flake-utils";
  inputs.nixpkgs.url = "github:nixos/nixpkgs/nixos-24.05";

  outputs = { self, flake-utils, nixpkgs }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        isMacOS = pkgs.stdenv.isDarwin;
      in
      {
        devShell = pkgs.mkShell {
          packages = with pkgs; [
            # See https://github.com/NixOS/nixpkgs/issues/59209.
            bashInteractive
            corepack_22
            nodejs_22
          ];

          shellHook = ''
            set -a

            if [ -f "./local.env" ]; then
              echo Sourcing local.env..
              . ./local.env
            fi
          '';
        };
      }
    );
}
