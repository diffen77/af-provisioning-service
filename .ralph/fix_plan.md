# Fix Plan: af-provisioning-service Deployment

- [x] Trigger GHA workflow (push to main or manual trigger) — DONE: Pushed workflow file + Dockerfile fix (commits 5e72af4, 15d1050)
- [x] Monitor build-and-push job completion — DONE: Run 23589639918 build-and-push succeeded in 38s
- [x] Verify image pushed to GHCR: ghcr.io/diffen77/af-provisioning-service:latest — DONE: Build-and-push job green
- [ ] BLOCKER: GitHub secret DEPLOY_SSH_KEY missing — Lundin needs to set secrets in GitHub repo settings
- [ ] SSH to 192.168.99.4 and setup docker-compose environment
- [ ] Pull image and start container: docker compose up -d
- [ ] Verify health endpoint: curl http://192.168.99.4:4500/health → 200
- [ ] Test provision endpoint: curl -X POST /provision with test payload
- [ ] Confirm: docker ps shows af-provisioning-service running
- [ ] git commit + push (proof of completion)
