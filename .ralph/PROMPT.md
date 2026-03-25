# Task: af-portal Provisioning Service

## Repo
~/Projects/af-provisioning-service

## Vad ska byggas
Node.js/Express-server som tar emot webhook-events från MFE-host när kund köper ÅF-portal-prenumeration. Service:
1. Spinnar upp Docker-container per kund (isolation)
2. Sätter upp unik PostgreSQL-databas
3. Registrerar domän i Caddy + auto-TLS
4. Pollar DNS tills A-record är OK
5. Returnerar bekräftelse när allt är live

## Filer att ändra/skapa
- `package.json` — Express, docker SDK, dotenv, axios
- `src/main.ts` — Express server, middleware
- `src/routes/provision.ts` — POST /provision endpoint
- `src/routes/status.ts` — GET /status/:customerId endpoint
- `src/services/containerService.ts` — docker-compose gen + docker-compose up
- `src/services/caddyService.ts` — Caddy Admin API calls
- `src/services/dnsService.ts` — DNS polling (max 24h, varje 5 min)
- `src/services/dbService.ts` — PostgreSQL provisioning
- `Dockerfile` — Node.js image, port 4500
- `docker-compose.example.yml` — produktion på 192.168.99.4
- `.env.example` — DOCKER_HOST, CADDY_ADMIN_URL, DATABASE_ADMIN_URL, GITHUB_TOKEN
- `tests/provision.test.ts` — Test POST /provision end-to-end

## Acceptance Criteria
1. POST /provision accepterar { customer_id, domain, company_name, contact_email }
2. Returnerar 202 Accepted + request ID direkt
3. Container (af-<customer_id>) är uppe inom 60 sekunder
4. Caddy-route skapas + TLS cert auto-genereras
5. PostgreSQL-databas isolerad per kund (unikt schema/DB)
6. GET /status/<customer_id> returnerar:
   - `{ status: "provisioning", eta: "..."}` under setup
   - `{ status: "provisioned", url: "https://<domain>", deployed_at: "..." }` när klart
   - `{ status: "dns_waiting", last_check: "..." }` under DNS-poll
7. DNS-polling: max 24h, check varje 5 min, geeft up med status=dns_timeout
8. Varje provision-request loggas (customer_id, domain, timestamp)
9. docker ps visar alla containers korrekt
10. Unit tests för provision-logik + integration test för full flow

## Test-kommando
```bash
npm test
```

## Build-kommando
```bash
npm run build
```

## Dev-starta
```bash
npm run dev
```

## Lokalt test av provision-endpoint
```bash
# Start server
npm run dev

# I annan terminal:
curl -X POST http://localhost:4500/provision \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "test-001",
    "domain": "test.minbutik.se",
    "company_name": "Test Company",
    "contact_email": "test@minbutik.se"
  }'

# Förväntat svar:
# { "status": 202, "request_id": "uuid", "message": "Provisioning started" }

# Checka status:
curl http://localhost:4500/status/test-001
```

## Infrastruktur-förutsättningar (redan OK)
- 192.168.99.4: Docker, docker-compose, Caddy
- Caddy Admin API: localhost:2019 (på 192.168.99.4)
- PostgreSQL: 5432, admin creds i .env

## Deploys
Dev: localhost:4500
Prod: 192.168.99.4:4500 (docker-compose på host)

## Antaganden
- Caddy redan konfigurerad för dynamic routes
- PostgreSQL redan uppe på 192.168.99.4
- Docker daemon tillgängligt från service (via Docker socket el. remote)
