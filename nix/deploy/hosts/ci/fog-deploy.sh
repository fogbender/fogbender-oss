log() {
    echo -e "$@" >&2
}

if [ -z "$1" ]; then
    log "Usage: fog-deploy REPO_PATH TAG TARGET\n" \
        "  REPO_PATH: path to local git repo\n" \
        "  TAG: tag to deploy\n" \
        "  TARGET: test | stage | prod"
    exit 1
fi

# configuration
repo_dir=$1
repo_tag=$2
target=$3
host="api-$target"

if [ ! -d "$repo_dir" ]; then
    log "repo: $repo_dir is not a directory. aborting"
    exit 1
fi

if [ -z "$repo_tag" ]; then
    log "tag: $repo_tag is empty. aborting"
    exit 1
fi

if [ -z "$target" ]; then
    log "target: $target is empty. aborting"
    exit 1
fi

if [[ ! ("$target" == "prod" || "$target" == "test" || "$target" == "stage") ]]; then
    log "target: $target is not valid. aborting"
    exit 1
fi

#set -x
set -euo pipefail

log "Deploying from $repo_dir tag $repo_tag to $target"

tmp_dir=$(mktemp -d -p $HOME/build)
git clone -s -b $repo_tag $repo_dir $tmp_dir
cd $tmp_dir

deploy ".#$host"

rm -rf $tmp_dir
