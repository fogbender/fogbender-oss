{
  description = "Fogbender flake";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-23.05";
    unstable.url = "github:nixos/nixpkgs/nixos-23.05";

    utils.url = "github:numtide/flake-utils";

    deploy-rs.url = "github:serokell/deploy-rs";
    deploy-rs.inputs.nixpkgs.follows = "nixpkgs";

    gitignore.url = "github:hercules-ci/gitignore.nix";
    gitignore.inputs.nixpkgs.follows = "nixpkgs";

    sops-nix.url = "github:Mic92/sops-nix";
    sops-nix.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs = { self, nixpkgs, utils, unstable, deploy-rs, gitignore, sops-nix }:
    let
      inherit (nixpkgs.lib) nixosSystem filterAttrs const;
      inherit (builtins) readDir mapAttrs attrNames;

      overlay = final: prev: {
        inherit (gitignore.lib) gitignoreSource;
        unstable = unstable.legacyPackages.${final.system};
        beamPackages = final.unstable.beam_nox.packages.erlang;
        mkMixDeps = final.callPackage ./nix/mk-mix-deps.nix { };
        fogbender = final.callPackage ./nix/fogbender.nix {  };
      };

      overlay_module = ({ pkgs, ... }: {
        nixpkgs = {
          overlays = [ overlay ];
        };
      });

      sysPkgs = (system :
        import nixpkgs {
          inherit system;
          overlays = [ overlay ];
        }
      );

      devShell = (system:
        let pkgs = sysPkgs system;
        in pkgs.callPackage ./nix/dev_shell.nix { }
      );

      deployShell = (system:
        let pkgs = sysPkgs system;
        in pkgs.callPackage ./nix/deploy_shell.nix { }
      );

      testShell = (system:
        let pkgs = sysPkgs system;
        in pkgs.callPackage ./nix/test_shell { }
      );

      pkgFogbender = (system:
        let pkgs = sysPkgs system;
        in pkgs.fogbender.server
      );

      hosts = mapAttrs (path: _: import (./nix/deploy/hosts + "/${path}"))
        (filterAttrs (_: t: t == "directory") (readDir ./nix/deploy/hosts));

      shells = (system:
        let s = mapAttrs
          (path: _: (let pkgs = sysPkgs system; in pkgs.callPackage (./nix/shells + "/${path}") {  }))
          (filterAttrs (_: t: t == "directory") (readDir ./nix/shells));
        in s // { default = s.dev; } );

      system = "x86_64-linux";

      # use precompiled deploy-rs package
      deployPkgs =
        let
          pkgs = import nixpkgs { inherit system; };
        in import nixpkgs {
          inherit system;
          overlays = [
            deploy-rs.overlay
            (self: super: { deploy-rs = { inherit (pkgs) deploy-rs; lib = super.deploy-rs.lib; }; })
          ];
        };

      mkSystem = config:
        nixosSystem {
          inherit system;
          modules = [
            config
            sops-nix.nixosModules.sops
            overlay_module
          ];
        };

      deploy =
        {
          sshUser = "root";
          nodes = mapAttrs (_: nixosConfig: {
            hostname = nixosConfig.config.networking.fqdn;
            profiles.system.user = "root";
            profiles.system.path = deployPkgs.deploy-rs.lib.activate.nixos nixosConfig;
          }) self.nixosConfigurations;
        };
    in
    {
      devShells.x86_64-linux = shells "x86_64-linux";
      devShells.x86_64-darwin = shells "x86_64-darwin";
      devShells.aarch64-darwin = shells "aarch64-darwin";

      packages.x86_64-linux.default = self.packages.x86_64-linux.fogbender;
      packages.x86_64-linux.fogbender = pkgFogbender "x86_64-linux";
      packages.x86_64-darwin.fogbender = pkgFogbender "x86_64-darwin";
      packages.aarch64-darwin.fogbender = pkgFogbender "aarch64-darwin";

      overlays.default = overlay;

      nixosConfigurations = mapAttrs (const mkSystem) hosts;
      deploy = deploy;

      # TODO checks don't work with deployPkgs approach
      #checks = mapAttrs (system: deployLib: deployLib.deployChecks self.deploy) deploy-rs.lib;
      #checks = deployPkgs.deploy-rs.lib.deployChecks self.deploy;
    };
}
