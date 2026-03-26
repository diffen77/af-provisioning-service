# Fix Plan: af-provisioning-service Deployment

- [ ] Trigger GHA workflow (push to main or manual trigger)
- [ ] Monitor build-and-push job completion
- [ ] Verify image pushed to GHCR: ghcr.io/diffen77/af-provisioning-service:latest
- [ ] SSH to 192.168.99.4 and setup docker-compose environment
- [ ] Pull image and start container: docker compose up -d
- [ ] Verify health endpoint: curl http://192.168.99.4:4500/health → 200
- [ ] Test provision endpoint: curl -X POST /provision with test payload
- [ ] Confirm: docker ps shows af-provisioning-service running
- [ ] git commit + push (proof of completion)
