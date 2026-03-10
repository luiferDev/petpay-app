# Proposal: Cleanup and Testing

## Intent

Address critical codebase quality issues and add missing infrastructure for Kubernetes deployment readiness. The routes.go file in Catalog & Offers contains duplicate code (lines 21-60) that causes compilation issues. All three services lack health endpoints that Kubernetes/nginx requires for liveness/readiness probes. Additionally, both Go services (Marketplace and Catalog) have zero test coverage, and the K8s deployment needs validation with kind.

## Scope

### In Scope
1. **Clean routes.go** - Remove duplicate code from `catalog-&-offers/internal/infrastructure/http/routes.go` (lines 21-60)
2. **Add Health Endpoints** - Implement `/health` endpoint in all 3 services:
   - Identity (port 3000) - Express route
   - Marketplace (port 8080) - Gin route
   - Catalog & Offers (port 8081) - Gin route
3. **Add Unit Tests** - Write tests for:
   - Marketplace: order service and repository
   - Catalog: product service and repository
4. **Test K8s Deployment** - Deploy all services to kind cluster and verify
5. **Create Test Requests** - HTTP request files for manual testing

### Out of Scope
- Integration tests between services
- Load testing
- CI/CD pipeline changes
- Database migration tests
- Authentication/authorization tests

## Approach

### 1. Clean routes.go
Remove the duplicate return statements (lines 20-60) in `catalog-&-offers/internal/infrastructure/http/routes.go`. The file should only contain the valid function that returns `r`.

### 2. Health Endpoints
**Identity (Express/TypeScript):**
- Add `/health` GET route in `Identity/src/infrastructure/http/server.ts`
- Return JSON: `{ "status": "healthy", "service": "identity" }`

**Marketplace (Gin/Go):**
- Add `/health` GET route in `marketplace/internal/infrastructure/http/routes.go`
- Return JSON: `{ "status": "healthy", "service": "marketplace" }`

**Catalog (Gin/Go):**
- Add `/health` GET route in `catalog-&-offers/internal/infrastructure/http/routes.go`
- Return JSON: `{ "status": "healthy", "service": "catalog" }`

### 3. Unit Tests
**Marketplace:**
- Create `marketplace/internal/application/services/order_service_test.go`
- Create `marketplace/internal/infrastructure/repository/order_repository_test.go`
- Use testify package with mock implementations

**Catalog:**
- Create `catalog-&-offers/internal/application/services/product_service_test.go`
- Create `catalog-&-offers/internal/infrastructure/repository/product_repository_test.go`

### 4. K8s Testing with kind
- Create kind cluster
- Build Docker images for all services
- Deploy using kubectl
- Verify pods are running
- Test health endpoints via port-forward or node port

### 5. Test Requests
- Create HTTP files in `tests/requests/` directory:
  - `identity-health.http`
  - `marketplace-health.http`
  - `catalog-health.http`
  - `marketplace-orders.http`

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `catalog-&-offers/internal/infrastructure/http/routes.go` | Modified | Remove duplicate code (lines 21-60) |
| `Identity/src/infrastructure/http/server.ts` | Modified | Add /health endpoint |
| `marketplace/internal/infrastructure/http/routes.go` | Modified | Add /health endpoint |
| `catalog-&-offers/internal/infrastructure/http/routes.go` | Modified | Add /health endpoint |
| `marketplace/internal/application/services/order_service_test.go` | New | Unit tests for order service |
| `marketplace/internal/infrastructure/repository/order_repository_test.go` | New | Unit tests for order repository |
| `catalog-&-offers/internal/application/services/product_service_test.go` | New | Unit tests for product service |
| `catalog-&-offers/internal/infrastructure/repository/product_repository_test.go` | New | Unit tests for product repository |
| `tests/requests/*.http` | New | HTTP request files for manual testing |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Breaking existing routes during cleanup | Medium | Test catalog service locally before deployment |
| Tests fail due to mock setup issues | Medium | Use standard Go testing patterns from AGENTS.md |
| Kind cluster creation fails | Low | Verify kind is installed, provide manual steps |
| Docker build fails | Low | Ensure Dockerfile exists in each service |
| Health endpoint timing out in K8s | Low | Add timeout: 5s to probe config |

## Rollback Plan

1. **routes.go cleanup**: If compilation fails, restore the original file from git:
   ```bash
   git checkout catalog-&-offers/internal/infrastructure/http/routes.go
   ```

2. **Health endpoints**: Rollback by removing the added routes in each service:
   ```bash
   # Identity
   git checkout Identity/src/infrastructure/http/server.ts
   # Marketplace  
   git checkout marketplace/internal/infrastructure/http/routes.go
   # Catalog
   git checkout catalog-&-offers/internal/infrastructure/http/routes.go
   ```

3. **Tests**: Rollback by removing test files:
   ```bash
   rm marketplace/.../*_test.go
   rm catalog-&-offers/.../*_test.go
   ```

4. **K8s deployment**: Delete kind cluster:
   ```bash
   kind delete cluster --name petpay
   ```

## Dependencies

- `kind` CLI installed (for K8s testing)
- Docker installed and running
- Go 1.x with testify package
- Node.js/Bun for Identity service

## Success Criteria

- [ ] `catalog-&-offers/internal/infrastructure/http/routes.go` compiles without errors
- [ ] GET `/health` returns 200 on Identity (port 3000)
- [ ] GET `/health` returns 200 on Marketplace (port 8080)
- [ ] GET `/health` returns 200 on Catalog (port 8081)
- [ ] `go test ./...` passes in marketplace service
- [ ] `go test ./...` passes in catalog service
- [ ] Kind cluster created successfully
- [ ] All 3 services deployed and running in K8s
- [ ] Health endpoints accessible from within cluster
- [ ] HTTP request files created in `tests/requests/`
