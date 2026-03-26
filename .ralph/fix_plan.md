# Fix Plan — af-provisioning-service CI/CD

- [ ] Verifiera Dockerfile syntax (docker build -t af-provisioning-service .)
- [ ] Skapa .github/workflows/deploy-provisioning.yml (build + push + SSH deploy)
- [ ] Push: npm run build && npm test passerar lokalt
- [ ] GHA run: Image byggt + pushat till GHCR (verifiera ghcr.io/diffen77/af-provisioning-service:latest)
- [ ] SSH deploy: Service upp på 192.168.99.4:4500
- [ ] Testa: curl -s http://192.168.99.4:4500/health → {"status":"ok"}
- [ ] Testa: POST /provision med test-payload → 202 Accepted
- [ ] git push origin main
- [ ] GHA CI grön + service live
