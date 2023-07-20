## Overview

Currently we use two products for deployment. Pulumi for infrastrucure provisioning and nixops for code deployment to NixOs servers.
Also for static web files we use Netlify automatic deployment.
Pulumi is used from local dev machines by hands, and NixOps could be run both automatically by gitlab-runner or manually from dev machines.
We use special node fog-service for gitlab-runner and automatic deployment.

## Setup

Create `local.env` file in root of repository and put your credential information there. Get key/secrets out of `.aws/credentials` from AWS profile you want to use:

```local.env
export AWS_ACCESS_KEY_ID=XXXXXXXXXXXXXXXXXXXX
export AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxexample
export PULUMI_ACCESS_TOKEN=...
```

Run `nix-shell nix/deploy` command in root of the project. It will download dependencies and open shell with `pulumi` and `nixops` commands accessible.

## Provision with pulumi

Pulumi uses projects and stacks (environments) as main deployment targets.
All projects are placed in `pulumi/` directory.

- `pulumi/infra` - setup network infrastructure and fog-service instance
- `pulumi/api` - test and production NixOs servers with databases
- `pulumi/api-inbox` - processing incoming emails setup
- `pulumi/server` - test and production docker servers
- `pulumi/ssl` - setup SSL for docker servers
- `pulumi/storefront` - netlify server integration

All commands should be run from project directory or with `-C project_dir option`:

- `pulumi -C pulumi/infra stack ls` - will show avaiable environments for project pulumi/infra
- `pulumi -C pulumi/infra stack select` - switch to another environment for project
- `pulumi -C pulumi/infra stack output` - show outputs for current stack
- `pulumi -C pulumi/infra preview` - will show diff for current stack
- `pulumi -C pulumi/infra up` - do actual deploy of infrastructure

## Using nixops

After opening shell it will create 3 nixops deployments: `aws-fog-service`, `aws-fog-test`, `aws-fog-prod`.
For most commands you need to set `-d some-deployment` flag. Information about actual servers places in `nix/deply/aws-infra.nix` file.
Currently it filled from pulumi outputs manually after infrastructure deploy.
Main nixops commands are:

- `nixops list` - list available deployments
- `nixops info -d aws-fog-test` - show servers info for deployment
- `nixops deploy -d aws-fog-test` - do actual deploy
- `nixops ssh -d aws-fog-test fog-api` - ssh to fog-api host from aws-fog-test deployment

Note that for fog-service deployment you need access to secrets (see Secrets file). Also ssh command available only after first deploy.
First deploy should be done manually, then gitlab-runner should be able to deploy from fog-service host.

## Deploy to local virtualbox

- Install VirtualBox
- Check if you have `vboxnet0` interface with `vboxmanage list hostonlyifs` or create it by running `vboxmanage hostonlyif create`
- Add your public ssh key to `nix/deploy/keys` directory
- Run `nix-shell nix/deploy` from fogbender directory.
- Create nixops deployment: `nixops create -d fogbender-vbox nix/deploy/{backend,vbox}.nix`
- First time run deployment with --force-reboot flag and -j flag for parallel build:

  `nixops deploy -d fogbender-vbox --force-reboot -j 20`

First run could take some time. To speedup it is possible to increase workers count for parallel build with `-j 20` option.

- Check deployment `nixops info -d fogbender-vbox`
- Check services are up:
  - <backend-ip>:8000 - client with elixir backend
  - <backend-ip>:8080 - storefront web app
  - <backend-ip>:8081 - vendor web app
- Ssh to host: `nixops ssh -d fogbender-vbox backend`
  All services run from systemd. From ssh shell:
  `systemctl status fogbender-server` - will show status of fog server
  `journalctl -u fogbender-server` - will show logs

To physically destroy Virtualbox node run `nixops destroy -d fogbender-vbox`. Next deploy will recreate node.
To remove nixops deployment from database run `nixops delete -d fogbender-vbox`.
To list all deployments run `nixops list`.
