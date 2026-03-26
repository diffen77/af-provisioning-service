# Task: af-provisioning-service — Docker build + GHA deploy workflow

## Repo
~/Projects/af-provisioning-service (diffen77/af-provisioning-service)

## Vad ska byggas
Provisioning-servicen är kodkomplett (Phase 12), men CI/CD-pipelinen fattas:
1. Docker image måste byggas + pushad till ghcr.io/diffen77/af-provisioning-service
2. GHA workflow måste deploy:a på 192.168.99.4:4500
3. Verifiera: Service är uppe och responding

## Filer att ändra/skapa
- .github/workflows/deploy-provisioning.yml (ny) — CI+CD pipeline
- Dockerfile (redan OK, bara verifiera syntax)
- docker-compose.yml (redan OK för lokal dev)

## Acceptance Criteria
1. GHA push to main bygger Docker image
2. Image pushad till ghcr.io/diffen77/af-provisioning-service:latest
3. Deploy-workflow skript SSH:ar till 192.168.99.4 och startar container
4. curl -s http://192.168.99.4:4500/health returnerar {"status":"ok"}
5. curl -X POST http://192.168.99.4:4500/provision med test-payload returnerar 202 Accepted
6. Servicen stannar/startar utan crash-loopar
7. git push, CI grön, service live

## Test-kommando (lokal)
docker build -t af-provisioning-service .
docker run --rm -p 4500:3000 af-provisioning-service
curl -s http://localhost:4500/health

## Build-kommando
npm run build && npm test

## Deploy-skript (på 192.168.99.4)
ssh diffen@192.168.99.4 "docker pull ghcr.io/diffen77/af-provisioning-service:latest && docker stop af-provisioning-service 2>/dev/null; docker run -d --name af-provisioning-service --restart unless-stopped -p 4500:3000 ghcr.io/diffen77/af-provisioning-service:latest"
