# Fix Plan — af-provisioning-service

## Phase 1: Projekt-setup
- [x] Initiera Node.js project (npm init -y)
- [x] Installera dependencies (express, docker, dotenv, axios, typescript, jest)
- [x] Skapa src/, tests/, dist/ directory structure
- [x] Skapa .env.example med alla variabler

## Phase 2: Express-server + grundrutter
- [x] Skapa src/main.ts med Express app
- [x] Listen på port 4500
- [x] Lägg middleware (json, error-handler)
- [x] Health check GET / → { status: "ok" }
- [x] npm run dev startar servern

## Phase 3: POST /provision endpoint
- [x] Validera incoming payload (customer_id, domain, company_name, contact_email)
- [x] Generera unikt container-namn (af-<customer_id>)
- [x] Returnera 202 Accepted + request_id direkt
- [x] Spara request till in-memory eller DB (provisioning_requests table)
- [x] Trigga async provisioning-flow (background job)

## Phase 4: Container-provisioning (docker-compose)
- [x] Skapa containerService.ts
- [x] Funktion: generateDockerCompose(customerId, domain, dbConfig)
- [x] Skriv docker-compose.yml till /tmp eller system temp
- [x] docker-compose up -d med rätt projekt-namn
- [x] Logga container start
- [x] Timeout: 60 sekunder för container-start, fail om timeout

## Phase 5: PostgreSQL-provisioning
- [x] Skapa dbService.ts
- [x] Funktion: createCustomerDatabase(customerId)
- [x] Skapa unikt schema eller DB (af_<customerId>)
- [x] Generera random DB-password
- [x] Spara credentials för container (via docker env eller .env-file)
- [x] Return DB_URL för container

## Phase 6: Caddy dynamic routing
- [x] Skapa caddyService.ts
- [x] Caddy Admin API: POST /config/apps/http/servers/srv0/routes
- [x] Skapa route för https://<domain> → http://container:3000
- [x] Auto-TLS via Caddy
- [x] Handle Caddy API errors (404, 500)

## Phase 7: DNS polling
- [x] Skapa dnsService.ts
- [x] Funktion: pollDNS(domain, maxAttempts=288 for 24h)
- [x] Check varje 5 minuter: nslookup <domain> = 192.168.99.4?
- [x] Logga varje attempt
- [x] Return: { resolved: true, checkedAt: "..." } eller { resolved: false, attempts: X, lastCheck: "..." }
- [x] Timeout → status=dns_timeout i DB

## Phase 8: GET /status/:customerId endpoint
- [x] Hämta request från DB/cache
- [x] Return status-objekt:
  - [x] provisioning: container uppe men DNS ej ok
  - [x] provisioned: allt klart
  - [x] dns_waiting: container ok, DNS pending
  - [x] dns_timeout: DNS check failed
  - [x] failed: error i någon fas
- [x] Include eta, url, last_check, error_message

## Phase 9: Logging + Monitoring
- [x] Winston el. pino logger
- [x] Logg: provision-requests, container-ups, caddy-routes, dns-polls, errors
- [x] Console output för dev (npm run dev)
- [x] File-logging för prod

## Phase 10: Tests
- [x] Unit test: generateDockerCompose() mockad docker
- [x] Unit test: createCustomerDatabase() mockad PostgreSQL
- [x] Unit test: pollDNS() mockad nslookup
- [x] Integration test: POST /provision → 202 + status går från provisioning → provisioned
- [x] Test: GET /status/:customerId före provision → 404
- [x] Test: POST /provision med invalid payload → 400

## Phase 11: Build + Dockerfile
- [x] npm run build (typescript → dist/)
- [x] Dockerfile: FROM node:20-alpine, COPY package*.json, RUN npm ci, COPY dist/, CMD node dist/main.js
- [x] Dockerfile exponerar port 4500
- [x] Build image: docker build -t af-provisioning-service .
- [x] Test: docker run -p 4500:4500 af-provisioning-service

## Phase 12: Prod docker-compose
- [x] Skapa docker-compose.yml för 192.168.99.4
- [x] Service: af-provisioning-service (image, ports 4500:4500, env-vars, volumes för logs)
- [x] Network: harrydabbqse_default (existing)
- [x] Restart: unless-stopped
- [x] Volumes: /home/diffen/docker-compose-generated (för generated docker-compose files)

## DOD
- [ ] npm test passar
- [ ] npm run build lyckas
- [ ] npm run dev startar server på localhost:4500
- [ ] curl http://localhost:4500 → { status: "ok" }
- [ ] curl POST /provision med test-payload → 202 + request_id
- [ ] curl GET /status/test-001 → provisioning status
- [ ] docker ps visar alla containers med rätt namn (af-*)
- [ ] .git committat + pushat
- [ ] CI grön (om GHA-workflow finns)

## Deployment checklist (för Niklasson senare)
- docker-compose.prod.yml klar
- Port 4500 öppen på 192.168.99.4
- Caddy admin API tillgänglig
- PostgreSQL credentials i .env.prod
- Container startad: docker-compose -f docker-compose.prod.yml up -d
- Health check: curl http://192.168.99.4:4500
