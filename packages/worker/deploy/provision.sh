#!/usr/bin/env bash
# One-time, idempotent VPS setup for the worker (Ubuntu). Run as root from this folder:
#   sudo bash provision.sh
# Requires Tailscale already installed and logged in (`tailscale up`): the firewall
# only allows SSH through the tailnet.
set -euo pipefail
cd "$(dirname "$0")"

echo "== packages"
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y unattended-upgrades fail2ban ufw curl ca-certificates
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "== node 24"
if ! node --version 2>/dev/null | grep -q '^v24\.'; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
fi

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

echo "== ssh: keys only"
if [ -s /root/.ssh/authorized_keys ] || { [ -n "${SUDO_USER:-}" ] && [ -s "/home/${SUDO_USER}/.ssh/authorized_keys" ]; }; then
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
  ufw --force enable
else
  echo "SKIPPED: Tailscale not up, firewall not enabled (would lock SSH out)" >&2
fi

systemctl enable --now fail2ban
echo "Done. Next: fill /etc/monetio-worker.env and add the CI public key to /home/monetio/.ssh/authorized_keys."
