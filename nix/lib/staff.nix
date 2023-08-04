{pkgs}:
let
  inherit (pkgs.lib) mapAttrs attrValues;
  inherit (builtins) readFile readDir;
in
rec {
  root = ../keys;
  files = mapAttrs
    (f: v:
      let fileName = root + ("/" + f); in
      readFile fileName)
    (readDir root);
  keys = attrValues files;
}
