#!/bin/bash

# This script is meant to be run locally, to push a locally-made build to a Scalingo machine.

set -e

# only available in npm versions > 16
version=$(npm pkg get version | sed 's/"//g')
#version=$(grep '"version"' package.json | cut -d '"' -f 4 | head -n 1)

yarn clean
VERSION=$version yarn build

# FIXME use a dedicated config
cp config.sample.json webapp/config.json
# Conflict with default nginx.conf.erb
echo "root /app;

location / {
    index index.html;
}
" > webapp/nginx.conf.erb

mkdir -p dist
cp -r webapp element-$version

$(dirname $0)/normalize-version.sh ${version} > element-$version/version

tar chvzf dist/element-$version.tar.gz element-$version
rm -r element-$version

echo
echo "Packaged dist/element-$version.tar.gz"

scalingo --app tchap-dev --region osc-secnum-fr1 deploy "dist/element-$version.tar.gz"
