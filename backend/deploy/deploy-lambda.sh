#!/bin/bash
set -e

pnpm build

if [ -z "$1" ]; then
  echo "❌ Error: Lambda function name is required."
  echo "Usage: ./deploy-lambda.sh <lambda-name>"
  exit 1
fi

LAMBDA_NAME="$1"
SOURCE_DIR="./dist/backend/src/api"
SOURCE_FILE="$1.js"
ZIP_FILE="$1.zip"
TMP_DIR="$SOURCE_DIR/.$1-tmp"

if [ ! -f "$SOURCE_DIR/$SOURCE_FILE" ]; then
  echo "❌ Error: Source file '$SOURCE_FILE' not found."
  exit 1
fi

echo "📦 Creating zip file for $LAMBDA_NAME..."
mkdir -p "$TMP_DIR"

cp -r package.json node_modules "$SOURCE_DIR/$SOURCE_FILE" "$TMP_DIR/"
mv "$TMP_DIR/$SOURCE_FILE" "$TMP_DIR/index.js"

pushd "$TMP_DIR" > /dev/null
zip -r "$ZIP_FILE" . > /dev/null
popd > /dev/null

echo "🚀 Deploying $LAMBDA_NAME to AWS Lambda..."
aws lambda update-function-code \
  --function-name "$LAMBDA_NAME" \
  --zip-file "fileb://$TMP_DIR/$ZIP_FILE"

echo "✅ Deployment of $LAMBDA_NAME complete."

# Clean up the zip file
rm -rf "$TMP_DIR"
