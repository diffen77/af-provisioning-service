# Task: INFRA Deploy af-provisioning-service CI/CD

## Repo
~/Projects/af-provisioning-service

## Vad ska byggas
Deploy CI/CD pipeline för af-provisioning-service:
1. GitHub Actions workflow: Build Docker image → push to GHCR
2. SSH-deploy to 192.168.99.4:4500 (docker compose up)
3. Verify service responds on /health endpoint

## Filer att ändra/skapa
- .github/workflows/deploy-provisioning.yml (redan skapad, may need debugging)
- .env på 192.168.99.4 (setup)
- docker-compose.yml på deploy host (setup)

## Acceptance Criteria
1. curl http://192.168.99.4:4500/health → HTTP 200 OK
2. curl -X POST http://192.168.99.4:4500/provision -d '{}' → HTTP 202 (Accepted) or 400 (not connection refused)
3. GHA run succeeds: "build-and-push" job green
4. Container running: docker ps | grep af-provisioning-service

## Test-kommando
curl http://192.168.99.4:4500/health
curl -X POST http://192.168.99.4:4500/provision -d '{"customer_id":"test-1","domain":"test.example.com","company_name":"Test Co","contact_email":"test@example.com"}'

## Build-kommando
docker build -t af-provisioning-service:latest .
docker compose -f docker-compose.yml up -d

## Notes
- Code complete as of 7e3a4e3 (ralph spec for CI/CD merged)
- Workflow exists but deployment hasn't been triggered yet
- May need to manually trigger GHA or debug deploy step if failing
