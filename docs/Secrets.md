## Overview

We uset [Mozilla SOPS](https://github.com/getsops/sops) to manage secrets in this project.

SOPS allows us to encrypt data with different types of keys (PGP, Age, AWS KMS, Google KMS, etc.). Currently, we use the AWS KMS approach, with several keys for different environments.

## Environments

### Admin

Used for additional services - portal, CI.

Files are in `nix/deploy/secrets/admin` and `config/test.env`.

### Stage,Test,Prod

Several envs for main Fogbender servers.

Files are in `nix/deploy/secrets/{stage,test,prod}`.

### Dev

Developer resources.

Files are in `config/dev.env`.

## Usage

First, you need to provide valid AWS IAM credentials that allow to use KMS from your environment.

All commands should be run from a Nix shell - use `nix develop` for defaul dev shell. Use `nix develop -c $SHELL` to pull in your regular (non-Nix) shell settings.

### Encrypting a new file

> cd nix/deploy/secrets/test
> sops -i -e new-file.env

The `-i` option tells SOPS to write the result to the same file.

SOPS understands several file formats - YAML, JSON, ENV and binary.

On first encryption, SOPS will use the nearest sops.yaml file for encryption instructions.

See `nix/deploy/secrets/sops.yaml`

### Updating encrypted file

After encryption, SOPS keeps information about encryption inside the encrypted file, so moving files will
not automatically apply sops.yaml rules. For example, if you try to copy a file form test to prod environment,
it will be encrypted with test keys.

In this case, or if you've changed the sops.yaml config, you need to update the encrypted file:

> cd nix/deploy/secrets/prod
> cp ../test/new-file.env ./
> sops updatekeys new-file.env

It will show removed/added keys for the file, and ask for confirmation.

### Decryption

To decrypt a file and print it to stdout:

> sops -d new-file.env

### Editing

SOPS understands file formats and encrypts only values, so it's possible to see field/vars names even in an encrypted file.
To edit, you need to call `sops` with encrypted file - this will create a temporary decrypted file and open it in the default editor.
After finishing editing, SOPS will encrypt the file with new content and remove the temporary one.
To use a different editor, set the `EDITOR` environment variable:

> EDITOR=emacsclient sops new-file.env
