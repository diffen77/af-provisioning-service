# Fix Plan — af-provisioning-service

## Phase 1: Projekt-setup
- [ ] Initiera Node.js project (npm init -y)
- [ ] Installera dependencies (express, docker, dotenv, axios, typescript, jest)
- [ ] Skapa src/, tests/, dist/ directory structure
- [ ] Skapa .env.example med alla variabler

## Phase 2: Express-server + grundrutter
- [ ] Skapa src/main.ts med Express app
- [ ] Listen på port 4500
- [ ] Lägg middleware (json, error-handler)
- [ ] Health check GET / → { status: "ok" }
- [ ] npm run dev startar servern

## Phase 3: POST /provision endpoint
- [ ] Validera incoming payload (customer_id, domain, company_name, contact_email)
- [ ] Generera unikt container-namn (af-<customer_id>)
- [ ] Returnera 202 Accepted + request_id direkt
- [ ] Spara request till in-memory eller DB (provisioning_requests table)
- [ ] Trigga async provisioning-flow (background job)

## Phase 4: Container-provisioning (docker-compose)
- [ ] Skapa containerService.ts
- [ ] Funktion: generateDockerCompose(customerId, domain, dbConfig)
- [ ] Skriv docker-compose.yml till /tmp eller system temp
- [ ] docker-compose up -d med rätt projekt-namn
- [ ] Logga container start
- [ ] Timeout: 60 sekunder för container-start, fail om timeout

## Phase 5: PostgreSQL-provisioning
- [ ] Skapa dbService.ts
- [ ] Funktion: createCustomerDatabase(customerId)
- [ ] Skapa unikt schema eller DB (af_<customerId>)
- [ ] Generera random DB-password
- [ ] Spara credentials för container (via docker env eller .env-file)
- [ ] Return DB_URL för container

## Phase 6: Caddy dynamic routing
- [ ] Skapa caddyService.ts
- [ ] Caddy Admin API: POST /config/apps/http/servers/srv0/routes
- [ ] Skapa route för https://<domain> → http://container:3000
- [ ] Auto-TLS via Caddy
- [ ] Handle Caddy API errors (404, 500)

## Phase 7: DNS polling
- [ ] Skapa dnsService.ts
- [ ] Funktion: pollDNS(domain, maxAttempts=288 for 24h)
- [ ] Check varje 5 minuter: nslookup <domain> = 192.168.99.4?
- [ ] Logga varje attempt
- [ ] Return: { resolved: true, checkedAt: "..." } eller { resolved: false, attempts: X, lastCheck: "..." }
- [ ] Timeout → status=dns_timeout i DB

## Phase 8: GET /status/:customerId endpoint
- [ ] Hämta request från DB/cache
- [ ] Return status-objekt:
  - provisioning: container uppe men DNS ej ok
  - provisioned: allt klart
  - dns_waiting: container ok, DNS pending
  - dns_timeout: DNS check failed
  - failed: error i någon fas
- [ ] Include eta, url, last_check, error_message

## Phase 9: Logging + Monitoring
- [ ] Winston el. pino logger
- [ ] Logg: provision-requests, container-ups, caddy-routes, dns-polls, errors
- [ ] Console output för dev (npm run dev)
- [ ] File-logging för prod

## Phase 10: Tests
- [ ] Unit test: generateDockerCompose() mockad docker
- [ ] Unit test: createCustomerDatabase() mockad PostgreSQL
- [ ] Unit test: pollDNS() mockad nslookup
- [ ] Integration test: POST /provision → 202 + status går från provisioning → provisioned
- [ ] Test: GET /status/:customerId före provision → 404
- [ ] Test: POST /provision med invalid payload → 400

## Phase 11: Build + Dockerfile
- [ ] npm run build (typescript → dist/)
- [ ] Dockerfile: FROM node:20-alpine, COPY package*.json, RUN npm ci, COPY dist/, CMD node dist/main.js
- [ ] Dockerfile exponerar port 4500
- [ ] Build image: docker build -t af-provisioning-service .
- [ ] Test: docker run -p 4500:4500 af-provisioning-service

## Phase 12: Prod docker-compose
- [ ] Skapa docker-compose.yml för 192.168.99.4
- [ ] Service: af-provisioning-service (image, ports 4500:4500, env-vars, volumes för logs)
- [ ] Network: harrydabbqse_default (existing)
- [ ] Restart: unless-stopped
- [ ] Volumes: /home/diffen/docker-compose-generated (för generated docker-compose files)

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
