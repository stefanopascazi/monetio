#!/usr/bin/env bash
# Installs a pinned upstream rclone into /usr/local/bin (run as root). Used by provision.sh and CI.
# Ubuntu's packaged rclone (1.60) is rejected by Cloudflare R2 with "501 NotImplemented".
set -euo pipefail

VERSION=v1.76.0
declare -A SHA256=(
  [amd64]=b00f00b3266c3764413afe599d3ec316f6f43b3e0ea8a0bc1d186d2133e46df7
  [arm64]=ee169016675e23a69d77240565133ff7dbc9b33d16fa8f7053d4af39f1eaeb78
)

if /usr/local/bin/rclone version 2>/dev/null | grep -q "^rclone $VERSION\$"; then
  echo "rclone $VERSION already installed"
  exit 0
fi

case "$(uname -m)" in x86_64) arch=amd64 ;; aarch64) arch=arm64 ;; *) echo "unsupported arch" >&2; exit 1 ;; esac
name="rclone-$VERSION-linux-$arch"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

curl -fsSL "https://downloads.rclone.org/$VERSION/$name.zip" -o "$tmp/$name.zip"
echo "${SHA256[$arch]}  $tmp/$name.zip" | sha256sum -c -
python3 -m zipfile -e "$tmp/$name.zip" "$tmp"
install -m 755 "$tmp/$name/rclone" /usr/local/bin/rclone
/usr/local/bin/rclone version | head -1
