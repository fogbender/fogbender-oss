{ pkgs ? import ../../nix {},
  env ? ../../config/test.nix }:

with pkgs;
let
  link-deps = writeScriptBin "link-deps.sh" ''
    mkdir -p _build/test/lib
    ${lib.concatMapStrings
      (dep: "${../elixir/mix-link-dep.sh} ${dep}\n")
      (builtins.attrValues fogbender.deps)}
  '';
in
pkgs.mkShell ({
  inputsFrom = [ fogbender.server ];

  buildInputs = [
    glibcLocales
    gnumake git postgresql
    libsodium
    link-deps
  ];

  MIX_REBAR = "${rebar}/bin/rebar";
  MIX_REBAR3 = "${rebar3}/bin/rebar3";
  NIX_PATH = "${pkgs.path}:nixpkgs=${pkgs.path}:.";
  LOCALE_ARCHIVE = "${glibcLocales}/lib/locale/locale-archive";
  LANG = "en_US.UTF-8";
  MIX_ENV = "test";
} // (import env))
