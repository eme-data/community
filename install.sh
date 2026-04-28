#!/usr/bin/env bash
# =====================================================================
# Community — Ubuntu 24.04 install script
# Installs Docker + Docker Compose, prepares the .env file and brings
# the stack up. Run as a user with sudo privileges.
#
# Usage:
#   sudo bash install.sh
#   sudo APP_DOMAIN=community.example.com LETSENCRYPT_EMAIL=admin@example.com bash install.sh
# =====================================================================
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Please run as root (sudo bash install.sh)" >&2
  exit 1
fi

# Detect the project directory (where this script lives)
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
cd "${SCRIPT_DIR}"

# --- 1. System checks -----------------------------------------------
. /etc/os-release
if [[ "${ID}" != "ubuntu" ]] || [[ "${VERSION_ID}" != "24.04" ]]; then
  echo "[warn] This script is tuned for Ubuntu 24.04 (detected: ${PRETTY_NAME}). Continuing anyway..."
fi

echo "[1/6] Updating apt and installing prerequisites..."
apt-get update -y
apt-get install -y \
  ca-certificates \
  curl \
  gnupg \
  lsb-release \
  ufw \
  openssl \
  make

# --- 2. Docker Engine + Compose plugin ------------------------------
if ! command -v docker >/dev/null 2>&1; then
  echo "[2/6] Installing Docker Engine..."
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "${VERSION_CODENAME}") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
else
  echo "[2/6] Docker already installed — skipping."
fi

# Add the calling user (if any) to the docker group so they can use docker without sudo
if [[ -n "${SUDO_USER:-}" ]] && id "${SUDO_USER}" >/dev/null 2>&1; then
  usermod -aG docker "${SUDO_USER}" || true
fi

# --- 3. Firewall ----------------------------------------------------
echo "[3/6] Configuring UFW (allowing 22, 80, 443)..."
ufw allow OpenSSH || true
ufw allow 80/tcp || true
ufw allow 443/tcp || true
ufw --force enable || true

# --- 4. .env preparation --------------------------------------------
echo "[4/6] Preparing .env..."
if [[ ! -f .env ]]; then
  cp .env.example .env

  # Generate strong secrets if the user hasn't customized .env yet
  POSTGRES_PASSWORD_GEN="$(openssl rand -hex 24)"
  JWT_SECRET_GEN="$(openssl rand -hex 48)"
  TOKEN_KEY_GEN="$(openssl rand -hex 32)"

  sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${POSTGRES_PASSWORD_GEN}|" .env
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET_GEN}|" .env
  sed -i "s|^TOKEN_ENCRYPTION_KEY=.*|TOKEN_ENCRYPTION_KEY=${TOKEN_KEY_GEN}|" .env
  # Refresh DATABASE_URL accordingly
  sed -i "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://community:${POSTGRES_PASSWORD_GEN}@postgres:5432/community?schema=public|" .env

  if [[ -n "${APP_DOMAIN:-}" ]]; then
    sed -i "s|^APP_DOMAIN=.*|APP_DOMAIN=${APP_DOMAIN}|" .env
    sed -i "s|^APP_URL=.*|APP_URL=https://${APP_DOMAIN}|" .env
    sed -i "s|^API_URL=.*|API_URL=https://${APP_DOMAIN}/api|" .env
    sed -i "s|^NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=https://${APP_DOMAIN}/api|" .env
  fi
  if [[ -n "${LETSENCRYPT_EMAIL:-}" ]]; then
    sed -i "s|^LETSENCRYPT_EMAIL=.*|LETSENCRYPT_EMAIL=${LETSENCRYPT_EMAIL}|" .env
  fi

  echo "[info] .env created with auto-generated secrets."
  echo "[info] You MUST still fill in your social provider credentials (LinkedIn, Meta, TikTok) before users can connect their accounts."
else
  echo "[info] .env already exists — leaving it untouched."
fi

# --- 5. Build and start ---------------------------------------------
echo "[5/6] Building Docker images (this may take a few minutes)..."
docker compose build

echo "[6/6] Starting the stack..."
docker compose up -d

# --- Done -----------------------------------------------------------
DOMAIN="$(grep -E '^APP_DOMAIN=' .env | cut -d= -f2)"
cat <<EOF

==============================================================
✓ Community is starting.

Once Caddy has issued the TLS certificate (a few seconds), open:

  https://${DOMAIN}

Useful commands:
  docker compose ps                # service status
  docker compose logs -f api       # backend logs
  docker compose logs -f worker    # publishing worker logs
  docker compose logs -f caddy     # reverse proxy / TLS logs
  docker compose down              # stop the stack

Next step: edit .env and fill in your social provider credentials,
then run:  docker compose up -d --force-recreate api worker
==============================================================
EOF
