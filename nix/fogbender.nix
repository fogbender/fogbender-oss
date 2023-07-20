{ lib, beamPackages, mkMixDeps, gitignoreSource, libsodium, gawk}:

let
  inherit (mkMixDeps ../server/deps.json) deps;
  inherit (beamPackages) mixRelease erlang elixir;

  pname = "fog";
  version = lib.fileContents ../server/VERSION;
  src = gitignoreSource ../server;
  mixEnv = "prod";

  server = mixRelease {
    inherit src pname version mixEnv;
    mixNixDeps = deps;
    postInstall = ''
      # new release script uses awk
      for f in $out/bin/*[^.bat]; do
       b=$(basename $f)
       wrapProgram $f --prefix PATH ":" "${lib.makeBinPath [ gawk erlang elixir ]}"
      done
    '';
  };

in { inherit server deps; }
