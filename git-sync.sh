#!/bin/bash

set -e

export GIT_SSL_NO_VERIFY=true

MONGODB_DUMP_FILE_NAME=$1

MONGODB_DUMP_FOLDER="cam-archive-repo"
if [ ! -d "$MONGODB_DUMP_FOLDER/.git" ]; then
    echo "Cloning repository to $MONGODB_DUMP_FOLDER..."
    git clone $MONGODB_DUMP_CLOUD_LOCATION $MONGODB_DUMP_FOLDER
    git config user.email "mongosync@radiolabs.com"
    git config user.name "Mongo Sync"
fi

cd $MONGODB_DUMP_FOLDER
echo "Pulling latest change(s)..."
git pull --depth=2

git checkout ${MONGODB_DUMP_CLOUD_BRANCH:-main}

echo "Moving $MONGODB_DUMP_FILE_NAME dump file to repository folder..."
mv ../${MONGODB_DUMP_PATH:-dumps}/$MONGODB_DUMP_FILE_NAME ./
git add .

git commit -m "New archive for $MONGODB_DUMP_FILE_NAME"

git push
echo "Pushed latest dump!"

exit 0