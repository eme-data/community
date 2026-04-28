#!/usr/bin/env bash
# =====================================================================
# Community — installation Ubuntu 24.04 en une commande
#
# Usage :
#   sudo bash install.sh
#   sudo bash install.sh community.meoxa.app admin@meoxa.app
#   curl -fsSL https://raw.githubusercontent.com/<user>/community/main/install.sh \
#     | sudo bash -s -- community.meoxa.app admin@meoxa.app
#
# Le HTTPS est toujours activé :
#   - domaine public résolu en DNS  → certificat Let's Encrypt (auto via Caddy)
#   - sinon (IP, localhost, etc.)   → certificat interne Caddy (self-signed)
# =====================================================================
set -euo pipefail

[[ $EUID -eq 0 ]] || { echo "Lance ce script en root : sudo bash install.sh" >&2; exit 1; }
cd "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"

DOMAIN="${1:-${APP_DOMAIN:-}}"
EMAIL="${2:-${LETSENCRYPT_EMAIL:-}}"

# --- 1. Paquets système + Docker (script officiel get.docker.com) ----
echo "[1/4] Installation des paquets système et Docker..."
apt-get update -y
apt-get install -y ca-certificates curl ufw openssl dnsutils
command -v docker >/dev/null 2>&1 || curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
[[ -n "${SUDO_USER:-}" ]] && usermod -aG docker "$SUDO_USER" || true

# --- 2. Pare-feu ----------------------------------------------------
echo "[2/4] Configuration UFW (22/80/443)..."
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp  >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null

# --- 3. .env (secrets auto-générés, HTTPS forcé) --------------------
echo "[3/4] Préparation du .env..."
if [[ ! -f .env ]]; then
  cp .env.example .env
  PG=$(openssl rand -hex 24)
  JW=$(openssl rand -hex 48)
  TK=$(openssl rand -hex 32)

  # Domaine : argument > variable d'env > IP publique de la machine
  if [[ -z "$DOMAIN" ]]; then
    DOMAIN="$(curl -fsSL --max-time 4 https://api.ipify.org 2>/dev/null \
              || hostname -I | awk '{print $1}')"
    echo "[info] Aucun domaine fourni — utilisation de $DOMAIN avec un certificat HTTPS interne (self-signed)."
  fi
  EMAIL="${EMAIL:-admin@${DOMAIN}}"

  sed -i \
    -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${PG}|" \
    -e "s|^JWT_SECRET=.*|JWT_SECRET=${JW}|" \
    -e "s|^TOKEN_ENCRYPTION_KEY=.*|TOKEN_ENCRYPTION_KEY=${TK}|" \
    -e "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://community:${PG}@postgres:5432/community?schema=public|" \
    -e "s|^APP_DOMAIN=.*|APP_DOMAIN=${DOMAIN}|" \
    -e "s|^APP_URL=.*|APP_URL=https://${DOMAIN}|" \
    -e "s|^API_URL=.*|API_URL=https://${DOMAIN}/api|" \
    -e "s|^NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=https://${DOMAIN}/api|" \
    -e "s|^LETSENCRYPT_EMAIL=.*|LETSENCRYPT_EMAIL=${EMAIL}|" \
    -e "s|community\.meoxa\.app|${DOMAIN}|g" \
    .env
else
  echo "[info] .env existant conservé."
fi

# --- 4. Build + démarrage ------------------------------------------
echo "[4/4] Build et démarrage du stack..."
docker compose up -d --build

DOMAIN="$(grep -E '^APP_DOMAIN=' .env | cut -d= -f2)"
cat <<EOF

==============================================================
✓ Community est démarré sur : https://${DOMAIN}

  - Si ${DOMAIN} pointe (DNS A) sur ce serveur, Caddy obtient un
    certificat Let's Encrypt automatiquement (~30 s).
  - Sinon, Caddy sert un certificat interne (self-signed) — le
    navigateur affichera un avertissement à accepter une fois.

Commandes utiles :
  docker compose ps                     # statut
  docker compose logs -f api worker     # logs backend
  docker compose logs -f caddy          # logs TLS / reverse proxy
  docker compose down                   # arrêt

Pour activer un provider social, édite .env (LINKEDIN_*, META_*, …)
puis : docker compose up -d --force-recreate api worker
==============================================================
EOF
