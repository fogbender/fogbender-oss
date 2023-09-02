# What

Some packages are shared between [fogbender](https://github.com/fogbender/fogbender) and [fogbender-oss](https://github.com/fogbender/fogbender-oss). And changes to those packages need to be propagated to both repos.

# Why

Having a local copy of fogbender, fogbender-proto and fogbender-react in `fogbender` project allows us to develop and test changes to those packages easier. And having a version of those packages in `fogbender-oss` allows us to publish them to NPM using [changesets](https://github.com/changesets/changesets).

# How

Easy way of thinking about this is that we are cherry-picking all changes from separate repos to create a copy of those changes in both repos. Once synchcronized, we can check that both repos have exactly the same state.

# Let's do it

## Initial setup

For best results, create a new folder (sync-fogbender-oss) specifically designed for doing sync operations.

    git clone git@github.com:fogbender/fogbender-oss.git sync-fogbender-oss

Now add upstream remote into it

    git remote add upstream git@github.com:fogbender/fogbender.git

Install dependencies (for `yarn changeset` to be available)

    yarn

## Check if repos are synced

    git fetch --all
    git diff origin/main upstream/main --stat packages/{fogbender,fogbender-react,fogbender-proto}

If you see empty output, then repos are in sync. If you see list of files then your repos are not in sync.

## fogbender -> fogbender-oss

That's going to be changes that were made internally at fogbender and now need to be publised to NPM. Your main goal here to add some context for the changes so that people can make sense of them in the context of `fogbender-oss`.

Dense version (explained below):

```bash
GIT_FB=efba6d388d7db7d150db6f81b35d9f57fed3565d
git fetch --all
git switch -c feature--sync-with-fogbender origin/main
git reset --hard origin/main
tig upstream/main...${GIT_FB} ./packages/{fogbender,fogbender-react,fogbender-proto}
# cherry pick
# create PR
```

### Find last sync checkpoint

Find the latest pull request https://github.com/fogbender/fogbender-oss/pulls?q=is%3Apr+sync+with+fogbender and copy it's SHA (the one from the title). And save it to make comands below easier to copy/paste.

    GIT_FB=efba6d388d7db7d150db6f81b35d9f57fed3565d

### Create sync branch

Create a new branch in `fogbender-oss` (origin) to sync with `fogbender` (upstream)

    git fetch --all
    git switch -c feature--sync-with-fogbender origin/main

Or reset it if you already had one

    git fetch --all
    git switch feature--sync-with-fogbender
    git reset --hard origin/main

### Find changes to sync

This command will list all the changes that happened in `fogbender` since last sync checkpoint.

    tig upstream/main...${GIT_FB} ./packages/{fogbender,fogbender-react,fogbender-proto}

### Time consuming part

Look at that tig command output and try to cherry-pick each commit one by one (select a commit and press `shift+c` to cherry pick it from `tig` interface). Make sure to skip `[ci] release` commits.

Cherry-picking will end up in two outcomes, it's either going to go smoothly (without merge conflicts), then you just need to add `changeset` to the commit (you might also need to edit the message if you think it needs clarification for `fogbender-oss` users).

```bash
# option 1
yarn changeset; git add .changeset/; git commit --amend --no-edit # just changelog
```

It might also cause merge conflicts, main culprit here is that changes to files that are not a part of `fogbender-oss` packages. For example change to schema in `fogbender-proto` happned in the same commit as this change was implemented on the server (`server` folder). So to fix that, make sure that you removed all extra stuff; add `changeset` to the commit; and finally commit it.

```bash
# option 2
git rm -fr server; git rm -fr packages/client-shared; git rm -rf storefront; git rm -fr vendor-demo; git rm -rf client; git rm -rf config; git rm -rf nix; git rm -rf secrets; git rm -rf mobile; yarn changeset; git add .changeset/; git commit --no-edit # resolve merge
```

### Push changes

    git push -u origin feature--sync-with-fogbender

Create pull request and make sure to name it as "sync with fogbender xxxxxxx" where you get sha from

    git log -1 upstream/main

## fogbender-oss -> fogbender

These are going to be the changes that are already published to NPM and now need to be propagated to `fogbender`. This process is more mechanical and main goal is just to clean up commits from changes to packages that don't exist in `fogbender` (like `fogbender-vue`) and remove changes to `.changeset`.

### Find last sync checkpoint

Find the latest pull request https://gitlab.com/fogbender/fogbender/-/merge_requests?scope=all&state=merged&search=sync+with+fogbender-oss and copy it's SHA (the one from the title). And save it to make comands below easier to copy/paste.
    
        GIT_OSS=bb6b077a8d62cd66a41a2246d3f4b1286dbd3298

### Create sync branch

Create a new branch in `fogbender` (upstream) to sync with `fogbender-oss` (origin)

    git fetch --all
    git switch -c feature--sync-with-fogbender-oss upstream/main

Or reset it if you already had one

    git fetch --all
    git switch feature--sync-with-fogbender-oss
    git reset --hard upstream/main

### Find changes to sync

This command will list all the changes that happened in `fogbender-oss` since last sync checkpoint.

    tig origin/main...${GIT_OSS} ./packages/{fogbender,fogbender-react,fogbender-proto}

### Let's just store all the changes to a file

Instead of manually cherry-picking every commit we can actually use `git rebase` format to copy commits from one branch to the other and if we use `--rebase-merges` we can even keep merge commits in it.

Let's switch temporarily to `main` branch in `fogbender-oss` (and make sure it's up to date)

    git switch main
    git pull --rebase origin main

Now let's open the rebase view

    git rebase --rebase-merges -i $GIT_OSS

We can save this to a file with a bit of vi magic:

    :w /tmp/oss_to_fog
    dG
    :wq

Now switch back to `feature--sync-with-fogbender-oss` branch and apply the changes

    git switch feature--sync-with-fogbender-oss
    git rebase --rebase-merges -i upstream/main

Let's load the file we saved earlier

    dd
    :r /tmp/oss_to_fog
    :wq

### Merge conflicts

The first issue you are going to see is going to be merge conflicts. For examples changes to `README.md` from `fogbender-oss` are not going to work out for `fogbender`, or changes to packages that do not exist in `fogbender` (like `fogbender-vue`).

So you have to remove everything that doesn't make sense or skip the commit entirely.

    rm -rf packages/{fogbender-vue,fogbender-element,qgp} examples .changeset/ .github/ scripts/version-update.py
    git add .
    # or git rebase --skip

### Clean up

Now that you've done with applying those commit, a lot of them could end up being wrong.

First check what got changed:

    git diff upstream/main --stat

Stuff that you don't want to see there is `.changeset`, `.github`, `examples`, `packages/fogbender-vue`, etc.

You could remove them as a separate commit, but if you have time please try to clean them up from the commit history.

    git rebase --rebase-merges -i upstream/main

Once you are happy with what you see in the diff:

    git diff upstream/main --stat

You can push your changes with

    git push -u upstream feature--sync-with-fogbender-oss

Create pull request and make sure to name it as "sync with fogbender-oss xxxxxxx" where you get sha from

    git log -1 origin/main

# Secret environment variables for GitHub Actions

GitHub Actions require github token to be able to create `[ci] release` pull requests, and they require NPM token to be able to publish packages to NPM. If token is not set or expired 
you will see actions failing in the following commands:

- `/usr/bin/git push origin HEAD:changeset-release/main --force` (github token)
- `/home/runner/work/fogbender-oss/fogbender-oss/node_modules/.bin/changeset publish` (npm token)

## Create NPM token

https://www.npmjs.com/settings/fogbender/tokens/granular-access-tokens/new 

- `fogbender-oss` - name of the token
- `7 days` - expiration
- `read and write - permissions for packages and scopes
- `no access` - organizations permissions
- `generate token`

Copy the token and save it as `NPM_TOKEN` in https://github.com/fogbender/fogbender-oss/settings/secrets/actions

## Create GitHub token

Run this command to generate a token (valid for 1 day):

    ./scripts/fogbender-oss-token/github-app-token.mjs

You might need to run it twice (once to install dependancies, and second time to actually run it).

Copy the token and save it as `FOG_OSS_GITHUB_TOKEN` in https://github.com/fogbender/fogbender-oss/settings/secrets/actions

> We are using approach described in this article https://wesbos.com/scoped-github-access-token and `github-app-token.mjs` exchanges `appId`, `installationId` and `privateKey` for a token that has read-write access to git, but scoped only to `fogbender-oss` repo. Secret value `privateKey` is stored through SOPS in the `nix/secrets/admin/github.env` file. The script has checks that allow you to run it from either inside Nix shell or outside of it.
