#!/bin/bash
set -e

# For all files in the src/api directory, call ./deploy-lambda.sh $fileNameWithoutExtension
SOURCE_DIR="./dist/api"
FILES=$(find "$SOURCE_DIR" -type f -name "*.js")
for FILE in $FILES; do
  # Get the file name without the extension
  FILE_NAME=$(basename "$FILE" .js)
  ./deploy-lambda.sh "$FILE_NAME"
done
