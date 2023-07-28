## Overview

We use Mozilla SOPS[1] project for managin secrets in project.

[1] https://github.com/getsops/sops

It allows to encrypt data with different types of keys (PGP, Age, AWS KMS, Google KMS, etc.).
Currently we use AWS KMS approach with several keys for different environments.

## Environments

### Admin

Used for additional services - portal, CI.
Files placed in `nix/deploy/secrets/admin`.
and `config/test.env`.

### Stage,Test,Prod

Several envs for main Fogbender servers.
Files are in `nix/deploy/secrets/{stage,test,prod}`.

### Dev

Developers resources.
Files are in `config/dev.env`.

## Usage

First you need to provide valid AWS IAM credentials that allows to use KMS from environment.
All commands should be run from nix shell - use `nix develop` for defaul dev shell.

### Encrypting new file

> cd nix/deploy/secrets/test
> sops -i -e new-file.env

With `-i` option sops will write result under the same file name.
SOPS understands several file formats - YAML, JSON, ENV and binary.
On first encryption it will use nearest sops.yaml file for encryption instructions.
See `nix/deploy/secrets/sops.yaml`

### Updating encrypted file

After encryption SOPS keeps information about encryption inside file, so moving files will
not automatically apply sops.yaml rules. Like if you try to copy file form test to prod environment
it will be encrypted with test keys.

In that case or if you've changed sops.yaml config you need to update encrypted file:

> cd nix/deploy/secrets/prod
> cp ../test/new-file.env ./
> sops updatekeys new-file.env

It will show removed/added keys for file and ask for confirmation.

### Decryption

To simple decrypt file and print it to stdout:

> sops -d new-file.env

### Editing

Sops understands file formats and encrypts only values, so it's possible to see field/vars names even in encrypted file.
To edit you need to call sops with encrypted file - it will create temporal decrypted file and open in default editor.
After finishing editing, sops will encrypt file with new content and remove temporal ones.
To use different editor provie EDITOR variable:

> EDITOR=emacsclient sops new-file.env
