#!/usr/bin/env bash
# One-time, idempotent VPS setup for the worker (Ubuntu). Run as root from this folder:
#   sudo bash provision.sh
# Requires Tailscale already installed and logged in (`tailscale up`).
# Options (environment variables, re-run the script to change them):
#   PUBLIC_SSH=1          keep SSH reachable on the public IP (rate limited), not only via Tailscale
#   KEEP_PASSWORD_AUTH=1  keep SSH password login (key-only otherwise)
#   e.g. sudo PUBLIC_SSH=1 bash provision.sh
set -euo pipefail
cd "$(dirname "$0")"

echo "== packages"
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y unattended-upgrades fail2ban ufw curl ca-certificates xz-utils
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "== node 24 (private to the worker, system node and pm2 apps untouched)"
NODE_DIR=/opt/node24
if ! "$NODE_DIR/bin/node" --version 2>/dev/null | grep -q '^v24\.'; then
  case "$(uname -m)" in x86_64) arch=x64 ;; aarch64) arch=arm64 ;; *) echo "unsupported arch" >&2; exit 1 ;; esac
  base=https://nodejs.org/dist/latest-v24.x
  tmp=$(mktemp -d)
  curl -fsSL "$base/SHASUMS256.txt" -o "$tmp/SHASUMS256.txt"
  tarball=$(grep -o "node-v24[^ ]*-linux-$arch\.tar\.xz" "$tmp/SHASUMS256.txt" | head -1)
  curl -fsSL "$base/$tarball" -o "$tmp/$tarball"
  (cd "$tmp" && grep " $tarball\$" SHASUMS256.txt | sha256sum -c -)
  rm -rf "$NODE_DIR" && mkdir -p "$NODE_DIR"
  tar -xJf "$tmp/$tarball" -C "$NODE_DIR" --strip-components=1
  rm -rf "$tmp"
fi
"$NODE_DIR/bin/node" --version

echo "== swap (1 GB safety net)"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 1G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo 'vm.swappiness=10' > /etc/sysctl.d/99-monetio.conf
  sysctl --system >/dev/null
fi

echo "== user and folders"
id monetio >/dev/null 2>&1 || useradd --system --create-home --shell /bin/bash monetio
install -d -o monetio -g monetio /opt/monetio-worker /opt/monetio-worker/releases
install -d -o monetio -g monetio -m 700 /home/monetio/.ssh
touch /home/monetio/.ssh/authorized_keys
chown monetio:monetio /home/monetio/.ssh/authorized_keys
chmod 600 /home/monetio/.ssh/authorized_keys
# CI deploys as monetio and may only restart the worker.
echo 'monetio ALL=(root) NOPASSWD: /usr/bin/systemctl restart monetio-worker' > /etc/sudoers.d/monetio-worker
chmod 440 /etc/sudoers.d/monetio-worker
visudo -cf /etc/sudoers.d/monetio-worker

echo "== systemd and journald"
[ -f /etc/monetio-worker.env ] || install -m 600 worker.env.example /etc/monetio-worker.env
install -d /etc/systemd/journald.conf.d
install -m 644 journald-monetio.conf /etc/systemd/journald.conf.d/monetio.conf
install -m 644 monetio-worker.service /etc/systemd/system/monetio-worker.service
systemctl restart systemd-journald
systemctl daemon-reload
systemctl enable monetio-worker

echo "== ssh"
SSH_HARDENING=/etc/ssh/sshd_config.d/10-monetio.conf
if [ "${KEEP_PASSWORD_AUTH:-}" = 1 ]; then
  if [ -f "$SSH_HARDENING" ]; then rm "$SSH_HARDENING" && systemctl reload ssh; fi
  echo "password login kept (KEEP_PASSWORD_AUTH=1)"
elif [ -s /root/.ssh/authorized_keys ] || { [ -n "${SUDO_USER:-}" ] && [ -s "/home/${SUDO_USER}/.ssh/authorized_keys" ]; }; then
  printf 'PasswordAuthentication no\nKbdInteractiveAuthentication no\nPermitRootLogin prohibit-password\n' > /etc/ssh/sshd_config.d/10-monetio.conf
  systemctl reload ssh
else
  echo "SKIPPED: no authorized_keys found, password login left enabled" >&2
fi

echo "== firewall"
if tailscale status >/dev/null 2>&1; then
  ufw default deny incoming
  ufw default allow outgoing
  ufw allow in on tailscale0
  ssh_port=$(sshd -T 2>/dev/null | awk '/^port /{print $2; exit}')
  if [ "${PUBLIC_SSH:-}" = 1 ]; then
    ufw limit "${ssh_port:-22}/tcp"
    echo "public SSH kept on port ${ssh_port:-22} (PUBLIC_SSH=1)"
  else
    ufw delete limit "${ssh_port:-22}/tcp" >/dev/null 2>&1 || true
  fi
  ufw --force enable
else
  echo "SKIPPED: Tailscale not up, firewall not enabled (would lock SSH out)" >&2
fi

systemctl enable --now fail2ban
echo "Done. Next: fill /etc/monetio-worker.env and add the CI public key to /home/monetio/.ssh/authorized_keys."
