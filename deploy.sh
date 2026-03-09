#!/bin/bash
# SSH deploy to own server (rsync + pm2)
# Usage: ./deploy.sh
# Defaults from your AWS setup (override with env):
PEM="${PEM:-$HOME/Downloads/test.pem}"
SERVER="${SERVER:-ubuntu@35.94.33.137}"
REMOTE_DIR="${REMOTE_DIR:-~/qualiprobe}"
PORT="${PORT:-3222}"

set -e
echo "Pushing to git..."
git push origin main

echo "Syncing to $SERVER ..."
rsync -avz --exclude node_modules --exclude .next --exclude .git -e "ssh -i $PEM -o StrictHostKeyChecking=no" . "$SERVER:$REMOTE_DIR/"

echo "Building and restarting on server..."
ssh -i "$PEM" -o StrictHostKeyChecking=no "$SERVER" "
  set -e
  cd $REMOTE_DIR
  npm ci
  npx prisma generate
  npm run build
  if pm2 describe qualiprobe >/dev/null 2>&1; then
    PORT=$PORT pm2 restart qualiprobe --update-env
  else
    PORT=$PORT pm2 start npm --name qualiprobe -- start
  fi
"
echo "Done. URL: http://35.94.33.137:$PORT"
