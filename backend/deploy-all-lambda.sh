#!/bin/bash
set -e

# For all directories in the dist/lambda directory, call ./deploy-lambda.sh $DIRECTORY
for dir in ./dist/lambda/*/; do
  dir_name=$(basename "$dir")
  ./deploy-lambda.sh "$dir_name"
done
