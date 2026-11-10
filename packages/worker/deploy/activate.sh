#!/usr/bin/env bash
# Runs on the VPS as the monetio user after CI uploads a release:
# switches the `current` symlink, restarts the service, rolls back if it does not stay up.
# Usage: activate.sh <release-id>
set -euo pipefail

ROOT=/opt/monetio-worker
RELEASE="$ROOT/releases/$1"
KEEP=5

[ -f "$RELEASE/worker.mjs" ] || { echo "missing $RELEASE/worker.mjs" >&2; exit 1; }
previous=$(readlink -f "$ROOT/current" || true)

ln -sfn "$RELEASE" "$ROOT/current.tmp" && mv -T "$ROOT/current.tmp" "$ROOT/current"
sudo /usr/bin/systemctl restart monetio-worker
sleep 10

if ! systemctl is-active --quiet monetio-worker; then
  echo "worker failed to start, rolling back" >&2
  journalctl -u monetio-worker -n 30 --no-pager >&2 || true
  if [ -n "$previous" ] && [ -d "$previous" ]; then
    ln -sfn "$previous" "$ROOT/current.tmp" && mv -T "$ROOT/current.tmp" "$ROOT/current"
    sudo /usr/bin/systemctl restart monetio-worker
  fi
  exit 1
fi

# Keep the newest releases only.
ls -1dt "$ROOT"/releases/*/ | tail -n +$((KEEP + 1)) | xargs -r rm -rf
echo "release $1 active"
