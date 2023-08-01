{ pkgs, unstable, fogbender, beamPackages, writeScriptBin, lib, ... }:
let
  pg = pkgs.postgresql_14.withPackages (p: [ p.pg_bigm ]);

  js_libs = with unstable; [
    nodejs
    yarn
  ];

  link-deps = writeScriptBin "link-deps.sh" ''
    mkdir -p _build/test/lib
    ${lib.concatMapStrings
      (dep: "${./mix-link-dep.sh} ${dep}\n")
      (builtins.attrValues fogbender.deps)}
  '';
in with pkgs; mkShell {
  inputsFrom = [ fogbender.server ];

  buildInputs = [
    glibcLocales
    gnumake git
    pg
    imagemagick
    libsodium
    link-deps
    js_libs
    sops
  ];

  MIX_REBAR = "${rebar}/bin/rebar";
  MIX_REBAR3 = "${rebar3}/bin/rebar3";
  MIX_ENV = "test";
  LOCALE_ARCHIVE = if stdenv.isLinux then "${glibcLocales}/lib/locale/locale-archive" else "";
  LANG = "en_US.UTF-8";

  shellHook = ''
  set -a
  eval "$(sops -d ./nix/secrets/admin/ci.env)"
  set +a
  '';
}
