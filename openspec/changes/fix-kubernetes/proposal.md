# Proposal: Fix Kubernetes Deployment

## Intent

Fix the Kubernetes deployment so all petpay-app microservices (Identity, Marketplace, Catalog) start correctly in a kind cluster. Currently, all pods are in CrashLoopBackOff due to misconfigured environment variables (wrong DATABASE_URL reference for Marketplace, missing DB_HOST) and incorrect health endpoint probes.

## Scope

### In Scope
- Fix `marketplace.yaml` - correct DATABASE_URL secret key reference (currently points to DB_PASSWORD instead of DATABASE_URL)
- Add proper DATABASE_URL environment variable to all service deployments
- Update health probes in marketplace and catalog to use `/health` endpoint instead of root `/`
- Ensure all required secrets (DATABASE_URL, RABBITMQ_URL, OAUTH_STATE_SECRET) are properly mounted
- Rebuild and retag Docker images with health endpoints
- Verify all services start and respond to health checks in kind cluster

### Out of Scope
- Adding HorizontalPodAutoscaler
- Setting up monitoring/observability (Prometheus, Grafana)
- Ingress configuration for external access
- Database schema migrations

## Approach

1. **Fix environment variable mappings**: Update marketplace.yaml to reference the correct DATABASE_URL secret key
2. **Update ConfigMaps**: Add DB_HOST, RABBITMQ_URL to configmaps if needed
3. **Fix health probes**: Change marketplace and catalog liveness/readiness probes from `/` to `/health`
4. **Rebuild images**: Build new Docker images with health endpoints baked in
5. **Test in kind**: Deploy and verify all pods become Ready

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `k8s/base/marketplace.yaml` | Modified | Fix DATABASE_URL secret key reference (line 41), update probes to `/health` |
| `k8s/base/catalog.yaml` | Modified | Update probes to `/health`, ensure DATABASE_URL is required |
| `k8s/base/identity.yaml` | Modified | Ensure DATABASE_URL, RABBITMQ_URL, OAUTH_STATE_SECRET properly exposed |
| `k8s/base/configmaps.yaml` | Modified | Add DB_HOST if needed for Go services |
| Docker images | Rebuilt | Build new images with health endpoints for all services |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Service still crashes after env fix | Medium | Check pod logs with `kubectl logs` to identify remaining issues |
| Health endpoint not available in old images | High | Rebuild Docker images with health endpoint code |
| Database not reachable from pods | Low | Verify postgres service DNS resolves correctly |
| Breaking changes in new images | Low | Test locally with docker-compose first |

## Rollback Plan

1. Revert changes to K8s manifest files using git
2. Delete current deployments: `kubectl delete deployment identity marketplace catalog -n petpay`
3. Redeploy with previous image tags if working version exists
4. If images need rollback: retag previous working images and update manifests

## Dependencies

- Docker daemon running
- kind cluster created and accessible
- PostgreSQL and RabbitMQ running in cluster

## Success Criteria

- [ ] All 3 services (identity, marketplace, catalog) pods show "Running" status
- [ ] `kubectl get pods -n petpay` shows all replicas in Ready state
- [ ] Health endpoints respond: `kubectl exec -it <pod> -- curl localhost:<port>/health`
- [ ] No CrashLoopBackOff errors in pod status
