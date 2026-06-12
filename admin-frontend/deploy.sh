#!/bin/bash
set -e

pnpm build
aws s3 sync dist/ s3://coffee-card-web-frontend --delete
