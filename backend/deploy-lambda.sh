#!/bin/bash
set -e

pnpm build

if [ -z "$1" ]; then
  echo "❌ Error: Lambda function name is required."
  echo "Usage: ./deploy-lambda.sh <lambda-name>"
  exit 1
fi

LAMBDA_NAME="$1"
DIST_DIR="./dist/lambda/$LAMBDA_NAME"
LAMBDA_FILE="index.js"
ZIP_FILE="$LAMBDA_NAME.zip"
TMP_DIR="$DIST_DIR/.$LAMBDA_NAME-tmp"

if [ ! -f "$DIST_DIR/$LAMBDA_FILE" ]; then
  echo "❌ Error: Source file '$LAMBDA_FILE' not found."
  exit 1
fi

echo "📦 Creating zip file for $LAMBDA_NAME..."
mkdir -p "$TMP_DIR"

cp -r package.json node_modules "$DIST_DIR/$LAMBDA_FILE" "$DIST_DIR/$LAMBDA_FILE.map" "$TMP_DIR/"

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
