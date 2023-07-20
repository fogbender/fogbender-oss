## Overview

All secrets are kept in `secrets` directory. Encryption/decryption is done automatically with git-crypt [1] package.

[1] https://www.agwa.name/projects/git-crypt/

## Setup

1. Install git-crypt in your OS, e.g. with nix-env:

   `nix-env -iA nixpkgs.git-crypt`

2. If needed generate GPG key:

   `gpg --generate-key`

3. Export your key

   `gpg --armor --export --output path/to/export/<user>.gpg <KEYID>`

4. Send to someone with access to secrets to add you as collaborator:

   `gpg --import /tmp/test-user.gpg`

   `gpg --edit-key <KEYID>`

   This will open gpg shell, you need to set ultimate trust for this key :

   - `fpr` - will show KEYID, just to check
   - `trust` - will ask for trust level, set to ultimate, as git-crypt works only with ultimate keys
   - `save`

   From project directory add new collaborator:

   `git-crypt add-gpg-user <KEYID>`

   You may need to unlock secrets before this command: `git-crypt unlock`.

## Usage

Normally git-crypt will crypt files on push and decrypt on pull.
You can use explicit commands if needed:

- `git-crypt unlock` - decipher secret files with your gpg key

- `git-crypt lock` - cipher secret files
