# Community

Plateforme **multi-tenant** de publication automatisée sur les réseaux sociaux : LinkedIn, Facebook, Instagram, TikTok (extensible). Cette application gère plusieurs organisations (tenants) via une seule installation, chaque tenant disposant de ses propres utilisateurs, comptes sociaux et calendrier de publications.

🌐 **Production** : https://community.meoxa.app

---

## Architecture

```
┌──────────┐  HTTPS  ┌──────────┐
│  Caddy   │────────▶│  Next.js │  (web UI — port 3000)
│ (auto    │         └──────────┘
│  Let's   │   /api   ┌──────────┐
│  Encrypt)│─────────▶│  NestJS  │  (REST API — port 3001)
└──────────┘          └─────┬────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
         PostgreSQL       Redis        Worker
         (data)         (queues)    (BullMQ — publishing)
```

| Composant       | Rôle                                                     |
|-----------------|----------------------------------------------------------|
| `apps/web`      | Next.js 14 (App Router) — interface utilisateur          |
| `apps/api`      | NestJS — REST API, OAuth, multi-tenant, scheduler        |
| Worker          | Même image que `api` (`ROLE=worker`) — exécute la queue  |
| PostgreSQL 16   | Persistance (Prisma)                                     |
| Redis 7         | File d'attente BullMQ + cache                            |
| Caddy 2         | Reverse proxy + HTTPS automatique                        |

---

## Démarrage rapide (Ubuntu 24.04)

Une seule commande suffit — Docker, UFW, secrets, build et HTTPS sont tous configurés automatiquement :

```bash
git clone <ton-repo> community && cd community
sudo bash install.sh community.meoxa.app admin@meoxa.app
```

Ou en remote, sans cloner manuellement :

```bash
curl -fsSL https://raw.githubusercontent.com/<user>/community/main/install.sh \
  | sudo bash -s -- community.meoxa.app admin@meoxa.app
```

Le script :
1. installe Docker Engine + plugin Compose (via `get.docker.com`),
2. ouvre les ports 22/80/443 sur UFW,
3. génère un `.env` avec des secrets aléatoires et y substitue ton domaine,
4. construit les images et lance le stack avec **HTTPS activé par défaut**.

### HTTPS toujours activé

Caddy gère le TLS automatiquement et choisit la stratégie selon ce qui est passé à `install.sh` :

| Cas                                                      | Certificat utilisé          |
|----------------------------------------------------------|-----------------------------|
| Domaine public dont le DNS A pointe sur le serveur       | **Let's Encrypt** (auto)    |
| IP, `localhost` ou domaine non résolu                    | **CA interne Caddy** (self-signed — avertissement navigateur à accepter une fois) |

### Sans domaine (test local ou IP brute)

```bash
sudo bash install.sh
```

Sans argument, le script utilise l'IP publique du serveur comme `APP_DOMAIN` et sert un certificat self-signed via Caddy.

---

## Configuration des providers sociaux

Chaque réseau social nécessite que **tu** crées une application développeur et fournisses son client ID / secret dans `.env`. Sans ces credentials, le bouton « Connecter » s'affichera mais l'OAuth échouera.

### LinkedIn — Marketing Developer Platform
1. Crée une app sur https://www.linkedin.com/developers/apps
2. Active le produit **Sign In with LinkedIn using OpenID Connect** + **Share on LinkedIn**
3. Pour publier des posts company il faut demander l'accès au produit **Marketing Developer Platform** (review LinkedIn — quelques jours)
4. URL de redirection : `https://<ton-domaine>/api/social/linkedin/callback`
5. Renseigne `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI`

### Meta (Facebook + Instagram) — Graph API
1. Crée une app sur https://developers.facebook.com/apps (type *Business*)
2. Ajoute les produits **Facebook Login** et **Instagram Graph API**
3. Permissions à demander : `pages_show_list`, `pages_manage_posts`, `pages_read_engagement`, et pour IG `instagram_basic`, `instagram_content_publish`, `business_management`
4. URL OAuth de redirection : `https://<ton-domaine>/api/social/meta/callback` (utilisée par les routes `/facebook/callback` et `/instagram/callback`)
5. Pour Instagram, le compte cible doit être un **compte business** lié à une **Page Facebook**
6. Renseigne `META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI`
7. Avant la mise en production : **App Review** (validation Meta).

### TikTok — Content Posting API
1. Crée une app sur https://developers.tiktok.com/apps
2. Ajoute le produit **Login Kit** + **Content Posting API**
3. Scopes : `user.info.basic`, `video.publish`, `video.upload`
4. URL de redirection : `https://<ton-domaine>/api/social/tiktok/callback`
5. Renseigne `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_REDIRECT_URI`
6. ⚠️ TikTok n'autorise **pas** les posts texte seuls — il faut joindre une vidéo. Le pipeline d'upload média n'est pas encore implémenté (voir « Roadmap »).

Après avoir mis à jour `.env` :
```bash
docker compose up -d --force-recreate api worker
```

---

## Site vitrine & onboarding autonome

### Vitrine (routes publiques)

Les pages marketing vivent dans `apps/web/app/(marketing)/` (route group, transparent dans l'URL) :

| URL              | Page                                |
|------------------|-------------------------------------|
| `/`              | Landing — hero, fonctionnalités, CTA |
| `/features`      | Détail des fonctionnalités          |
| `/pricing`       | Plans tarifaires (Free / Starter / Pro) |
| `/legal/terms`   | CGU (gabarit à compléter)           |
| `/legal/privacy` | Politique de confidentialité        |

Toutes utilisent `MarketingHeader` + `MarketingFooter`. Le header détecte un JWT en localStorage pour afficher « Tableau de bord » à la place de « Connexion ».

### Onboarding client autonome

Après inscription, l'utilisateur est dirigé vers `/onboarding`, qui le route automatiquement vers la première étape non terminée. Le backend persiste l'état (`Tenant.onboardingStep`, `User.emailVerifiedAt`) — un client peut quitter et reprendre.

Étapes :

1. **Vérification email** (`/onboarding/verify`)
   - Si SMTP configuré (`SMTP_HOST` non vide) → envoi d'un mail avec lien tokenisé.
   - Si SMTP absent → l'email est auto-validé (mode dev/preview, log dans la console API).
   - Le lien dans l'email pointe sur `/onboarding/verify?token=…` et fonctionne sans être connecté.
2. **Connexion d'un premier réseau** (`/onboarding/connect`) — boutons OAuth pour LinkedIn, Facebook, Instagram, TikTok ; détecte les comptes déjà reliés.
3. **Fin** (`/onboarding/done`) — propose « créer mon premier post » ou « aller au tableau de bord ».

À chaque login, la page de connexion vérifie `/onboarding/status` et redirige vers `/onboarding` si l'utilisateur n'a pas terminé — pas de support à contacter, le client se débloque seul.

### Configuration SMTP (optionnel mais recommandé en prod)

Renseigne dans `.env` :

```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-key
SMTP_FROM=Community <no-reply@tondomaine.com>
```

Sans SMTP, l'onboarding fonctionne en mode auto-vérification (utile pour tests locaux).

---

## Modèle multi-tenant

- Chaque utilisateur peut appartenir à plusieurs **tenants** via la table `Membership`.
- Toutes les données métier (comptes sociaux, posts, médias) portent un `tenantId` et sont filtrées dans chaque service par le tenant courant du JWT.
- Le JWT contient `{ sub: userId, tenantId }`. Pour basculer entre tenants, il faut ré-émettre un token (à ajouter — endpoint `/auth/switch-tenant`).
- Rôles disponibles : `OWNER`, `ADMIN`, `EDITOR`, `VIEWER` (les guards par rôle sont à compléter selon tes besoins).

---

## Sécurité

- **Tokens OAuth** stockés chiffrés en base (AES-256-GCM, clé `TOKEN_ENCRYPTION_KEY`).
- **Mots de passe** hashés avec bcrypt (cost 12).
- **JWT** signés avec `JWT_SECRET` (durée par défaut : 7 jours).
- **Headers de sécurité** via Helmet (HSTS, X-Frame-Options, etc.).
- **Rate limiting** via `@nestjs/throttler` :
  - global : 60 requêtes / minute / IP
  - bucket strict sur `/auth/login`, `/auth/register`, `/auth/password/forgot|reset`, `/onboarding/email/send`
- **RBAC** : décorateur `@Roles('OWNER','ADMIN','EDITOR','VIEWER')` + `RolesGuard` appliqué aux opérations sensibles (suppression de comptes sociaux, création/publication de posts).
- **Refresh OAuth automatique** : un cron horaire dans le worker rafraîchit les tokens LinkedIn et TikTok proches de l'expiration.
- **Reset password** auto-service via lien email tokenisé (1h TTL, hash sha256, à usage unique).
- **2FA TOTP** : activable depuis `/settings/security` (QR code + secret chiffré AES-256-GCM en base). Au login, un challenge JWT de 5 min est échangé contre un access token via `/auth/2fa/verify`.
- **Audit log** : chaque tenant peut consulter ses 200 derniers événements depuis `/settings/audit` (publications, comptes connectés, invitations…).
- Caddy gère le TLS automatiquement.
- Le worker tourne sur la même image que l'API mais sans port exposé.

---

## Développement local

```bash
# Backend (hot reload)
cd apps/api
npm install
cp ../../.env.example .env  # ou exporte les variables
DATABASE_URL=postgresql://localhost:5432/community npm run prisma:migrate:dev
npm run start:dev

# Frontend
cd apps/web
npm install
NEXT_PUBLIC_API_URL=http://localhost:3001/api npm run dev
```

---

## Commandes utiles

```bash
docker compose ps                        # statut
docker compose logs -f api worker        # logs backend
docker compose exec api npx prisma studio  # explorateur DB (port à mapper)
docker compose exec postgres psql -U community community
docker compose down                      # arrêt
docker compose down -v                   # arrêt + suppression des volumes (⚠️ détruit la DB)
```

---

## Observabilité

- **Logs structurés** via [nestjs-pino](https://github.com/iamolegga/nestjs-pino) — JSON en prod, pretty en dev. Niveau via `LOG_LEVEL`. Le `Authorization` et le `Cookie` sont redacted automatiquement.
- **Sentry** : renseigne `SENTRY_DSN` pour activer le reporting des erreurs 5xx et exceptions non-HTTP. Les 4xx (validation, auth) ne sont pas envoyés.

## Tests

```bash
cd e2e
npm install
npx playwright install chromium
E2E_BASE_URL=http://localhost:3000 npm test
```

Le test golden path couvre : landing → register → onboarding (auto-vérification email en dev) → skip connexion → dashboard.

## CI

`.github/workflows/ci.yml` lance sur chaque push/PR :
- build de l'API (NestJS + Prisma)
- build du web (Next.js)
- e2e Playwright contre Postgres + Redis dans des `services:` GitHub

## Workflow de publication

| Étape | Acteur | Statut du Post |
|-------|--------|----------------|
| Création par éditeur (avec `requireApproval=true`) | EDITOR | `PENDING_APPROVAL` |
| Approbation | OWNER / ADMIN (≠ auteur) | `SCHEDULED` ou `DRAFT` |
| Rejet | OWNER / ADMIN | `REJECTED` (motif optionnel) |
| Création directe (OWNER/ADMIN, ou approval désactivé) | tous | `DRAFT` ou `SCHEDULED` |
| File d'attente atteint l'heure programmée | worker BullMQ | `PUBLISHING` puis `PUBLISHED`/`FAILED` |
| Publication immédiate | EDITOR+ | `SCHEDULED` (delay=0) |

La pré-validation est **désactivée par défaut** — un OWNER peut l'activer dans `/settings/general`. Elle ne s'applique qu'aux EDITOR : OWNER et ADMIN gardent la possibilité de publier directement.

Chaque échec d'une cible est isolé : si LinkedIn passe mais Instagram échoue, le post est marqué `FAILED` au global mais avec le détail par target ; le retry exponentiel (5 tentatives, base 60s) est appliqué.

## Assistant IA (Claude)

Si `ANTHROPIC_API_KEY` est défini, le composer expose deux fonctions :

- **Suggérer des hashtags** — Claude Opus 4.7 propose 5-8 hashtags adaptés au contenu et aux réseaux ciblés (LinkedIn → professionnel, Instagram → discovery, etc.).
- **Reformuler** — adapte le post au format/ton d'un réseau précis (LinkedIn, Instagram, X, Thread X), avec choix du ton (professional, casual, enthusiastic, informative, witty).

Le system prompt est mis en cache (`cache_control: ephemeral`) → la 2ème requête et les suivantes utilisent la version cachée (~10× moins cher en input tokens). Récupère ta clé sur https://console.anthropic.com/.

Sans clé, les boutons IA ne s'affichent pas.

## Templates

Bibliothèque réutilisable de trames de posts. Page `/templates` (création / suppression). Le composer affiche un sélecteur "Charger un template" qui pré-remplit le contenu et le thread. Tu peux utiliser des placeholders comme `{{brand}}` ou `{{date}}` à éditer après chargement.

## Import CSV bulk

Page `/posts/import`. Format attendu :

```csv
content,scheduled_at,account_ids,thread
"Hello world",,acc_id_1;acc_id_2,
"Big launch",2026-05-01T09:00:00Z,acc_id_1,
"X thread",,acc_twitter_id,"Tweet 2|Tweet 3"
```

- `content` et `account_ids` obligatoires
- `account_ids` séparés par `;`
- `thread` séparé par `|` (X uniquement)
- `scheduled_at` vide → DRAFT, sinon ISO 8601 → SCHEDULED
- Le rapport renvoie le nombre de succès et la liste des lignes en échec avec leur erreur

## API publique

L'API REST est accessible aux outils tiers (Zapier, n8n, Make, CMS, scripts) via des clés API par tenant.

**Génération** : `/settings/api-keys` (OWNER/ADMIN). La clé brute (`apk_…`) n'est affichée qu'une seule fois — sha256 stocké en base, jamais le clair.

**Utilisation** : envoyez `Authorization: Bearer apk_…` sur les endpoints publics.

**Endpoints exposés à l'API** :
- `GET/POST /api/posts` (créer, lister, programmer, publier)
- `POST /api/posts/:id/publish`, `DELETE /api/posts/:id/schedule`, `POST /api/posts/:id/approve|reject`
- `POST /api/posts/bulk-import` (multipart CSV)
- `GET/POST/DELETE /api/media`, `GET /api/media/:id/raw`
- `GET/POST/DELETE /api/templates`

Les endpoints sensibles (auth, billing, invitations, audit) restent strictement JWT (utilisateur connecté). Les rôles `OWNER`/`ADMIN`/`EDITOR`/`VIEWER` s'appliquent comme à un utilisateur normal — la clé hérite des droits de son créateur.

**Exemple :**
```bash
curl -X POST https://community.meoxa.app/api/posts \
  -H "Authorization: Bearer apk_xxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello from Zapier", "accountIds": ["acc_id"], "scheduledAt": "2026-05-01T09:00:00Z"}'
```

**Révocation** : un clic sur `/settings/api-keys` — effet immédiat (toute requête ultérieure est rejetée avec 401).

## Brand voice

Configurable depuis `/settings/brand-voice` : ton, charte rédactionnelle, mots/marques à ne jamais mentionner, exemples de posts représentatifs. Ces consignes sont injectées dans tous les appels IA (hashtags, reformulation), donc les contenus générés respectent automatiquement l'identité de la marque sans avoir à le redonner à chaque requête.

## OpenAPI / Swagger

L'API publique est documentée automatiquement à partir des décorateurs NestJS. Une fois le stack démarré, ouvre :

```
https://community.meoxa.app/api/docs
```

Tu peux y essayer chaque endpoint en ajoutant un JWT ou une clé API dans le bouton **Authorize**. La spec brute est exposée à `/api/docs-json` et peut être importée dans Postman, Insomnia, ou regénérer un client typé via `openapi-generator`.

## White-label

Chaque tenant peut personnaliser : nom affiché (brandName), couleur primaire, logo. Édition via `/settings/branding`.

- Le logo est uploadé via le pipeline Media existant (donc multi-tenant, sécurisé).
- La couleur primaire est injectée en CSS variables (`--brand-rgb`, `--brand-dark-rgb`) — toutes les classes Tailwind `bg-brand`, `text-brand`, `bg-brand/15`, etc., suivent automatiquement.
- Le `ThemeInjector` ne tourne que dans le dashboard : la vitrine publique garde l'identité Community.

Pour aller plus loin (couleurs personnalisées dans les emails, sous-domaine custom par tenant, page d'invitation white-labellée) — extensions naturelles à partir des champs déjà en place sur `Tenant`.

## Internationalisation (fr / en)

Infrastructure i18n basée sur cookie + provider React :

- Cookie `community.locale` (TTL 1 an), valeurs `fr` (défaut) | `en`.
- Sélecteur dans le header marketing (FR / EN dropdown).
- Le dictionnaire vit dans [`apps/web/lib/i18n.ts`](apps/web/lib/i18n.ts) — un objet par locale, autocomplétion typée.
- Couvert dans cette première itération : header marketing + landing page complète.
- À traduire dans les itérations suivantes : pages features/pricing/legal, login/register/onboarding, dashboard. Le dictionnaire est extensible — il suffit d'ajouter les clés et de remplacer les chaînes en dur par `t.section.cle`.

## Roadmap restante

- [ ] Webhooks pour récupérer les statistiques de publication (engagement par post)
- [ ] Best-time-to-post analytics (dépend des stats ci-dessus)
- [ ] A/B testing de variantes
- [ ] Dashboard d'observabilité (Grafana/Loki) — opt-in via `docker-compose.observability.yml`
- [ ] Étendre l'i18n au dashboard et aux pages onboarding/login
- [ ] Sous-domaine custom par tenant (`agence-x.community.meoxa.app`)
- [ ] Webhooks sortants (notifier ton CMS quand un post est publié)

---

## Licence

À définir selon tes besoins (MIT, AGPL, propriétaire…).
