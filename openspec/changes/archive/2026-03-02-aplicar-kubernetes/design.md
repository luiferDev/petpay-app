# Design: Apply Kubernetes Deployment

## Technical Approach

This design implements container orchestration for the petpay-app monorepo using vanilla Kubernetes with Kustomize for environment management. All three microservices (Identity, Marketplace, Catalog) are containerized with Docker multi-stage builds and deployed using Kubernetes Deployments with Services, Ingress for external access, and StatefulSet for PostgreSQL.

## Architecture Decisions

### Decision: Kubernetes over Helm

**Choice**: Vanilla Kubernetes manifests with Kustomize overlays
**Alternatives considered**: Helm charts, Docker Compose only, managed Kubernetes (EKS/GKE)
**Rationale**: Kustomize provides simpler template-free configuration that matches the flat YAML approach already used in the project. Helm adds complexity that isn't needed for this 3-service deployment.

### Decision: StatefulSet for PostgreSQL

**Choice**: StatefulSet with PersistentVolumeClaim
**Alternatives considered**: Deployment with shared PVC, external managed database
**Rationale**: StatefulSet provides stable network identity and persistent storage, essential for database state. The petpay services require PostgreSQL persistence.

### Decision: Ingress-Nginx Controller

**Choice**: Ingress with nginx-ingress controller annotations
**Alternatives considered**: Kubernetes Gateway API, cloud provider load balancers
**Rationale**: Ingress-Nginx is the most widely supported, provides rate limiting out-of-the-box, and works across any Kubernetes cluster (local or cloud).

### Decision: Multi-stage Docker Builds

**Choice**: Multi-stage builds for all services
**Alternatives considered**: Single-stage builds, distroless images
**Rationale**: Multi-stage builds reduce final image size by excluding build dependencies while maintaining security through minimal base images.

### Decision: Round-robin Load Balancing

**Choice**: Default round-robin via Ingress-Nginx
**Alternatives considered**: Least connections, IP hash
**Rationale**: Round-robin is the simplest and works well for stateless microservices. IP hash could be considered for session persistence but is not required for current architecture.

## Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                        External Client                            │
└──────────────────────────┬───────────────────────────────────────┘
                           │ HTTP/HTTPS
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                  LoadBalancer Service (port 80/443)              │
│                   Rate Limit: 50 req/s, 100 conn                 │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Ingress Controller (nginx)                     │
│  /api/v1/auth/* ──→ identity:3000                               │
│  /api/v1/users/* ──→ identity:3000                               │
│  /api/v1/marketplace/* ──→ marketplace:8080                      │
│  /api/v1/orders/* ──→ marketplace:8080                           │
│  /api/v1/products/* ──→ catalog:8081                            │
│  /api/v1/categories/* ──→ catalog:8081                         │
│  /api/v1/services/* ──→ catalog:8081                            │
└───────┬─────────────────────┬──────────────────┬─────────────────┘
        │                     │                  │
        ▼                     ▼                  ▼
┌───────────────┐    ┌─────────────────┐   ┌──────────────────┐
│   Identity    │    │   Marketplace   │   │     Catalog       │
│  2 replicas   │    │   2 replicas    │   │   2 replicas      │
│  Port: 3000   │    │   Port: 8080    │   │   Port: 8081     │
└───────┬───────┘    └────────┬─────────┘   └────────┬─────────┘
        │                     │                      │
        │                     └──────────┬────────────┘
        │                                │
        │                                ▼
        │                   ┌─────────────────────┐
        │                   │   PostgreSQL        │
        │                   │   StatefulSet       │
        │                   │   Port: 5432        │
        │                   │   PVC: 10Gi        │
        │                   └─────────────────────┘
        │
        ▼
   ┌────────────┐
   │   ConfigMap │
   │   Secrets   │
   └────────────┘
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `Identity/Dockerfile` | Create | Multi-stage build for Identity service (Bun) |
| `marketplace/Dockerfile` | Create | Multi-stage build for Marketplace (Go) |
| `catalog-&-offers/Dockerfile` | Create | Multi-stage build for Catalog (Go) |
| `k8s/base/namespace.yaml` | Create | Namespace `petpay` definition |
| `k8s/base/configmaps.yaml` | Create | Environment variables for all services |
| `k8s/base/secrets.yaml` | Create | DB, JWT, OAuth secret templates |
| `k8s/base/identity.yaml` | Create | Deployment + ClusterIP service |
| `k8s/base/marketplace.yaml` | Create | Deployment + ClusterIP service |
| `k8s/base/catalog.yaml` | Create | Deployment + ClusterIP service |
| `k8s/base/postgres.yaml` | Create | StatefulSet + Service + PVC |
| `k8s/base/ingress.yaml` | Create | Ingress + LoadBalancer service |
| `k8s/base/kustomization.yaml` | Create | Base Kustomize configuration |
| `k8s/overlays/dev/kustomization.yaml` | Create | Dev environment overlay |
| `k8s/overlays/prod/kustomization.yaml` | Create | Production overlay |
| `docker-compose.yml` | Create | Local development compose |
| `nginx.conf` | Create | Nginx configuration with rate limiting |

## Interfaces / Contracts

### Kubernetes Service Contracts

```yaml
# Identity Service
service:
  name: identity
  type: ClusterIP
  port: 3000
  selectors:
    app: identity

# Marketplace Service  
service:
  name: marketplace
  type: ClusterIP
  port: 8080
  selectors:
    app: marketplace

# Catalog Service
service:
  name: catalog
  type: ClusterIP
  port: 8081
  selectors:
    app: catalog

# PostgreSQL Service
service:
  name: postgres
  type: ClusterIP (headless)
  port: 5432
  selectors:
    app: postgres
```

### Health Endpoints

All services MUST expose:
- `GET /health` - Returns 200 OK when service is healthy

### Ingress Routes

| Path Pattern | Backend Service | Backend Port |
|--------------|----------------|--------------|
| `/api/v1/auth/*` | identity | 3000 |
| `/api/v1/users/*` | identity | 3000 |
| `/api/v1/marketplace/*` | marketplace | 8080 |
| `/api/v1/orders/*` | marketplace | 8080 |
| `/api/v1/products/*` | catalog | 8081 |
| `/api/v1/categories/*` | catalog | 8081 |
| `/api/v1/services/*` | catalog | 8081 |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Dockerfile build success | `docker build` each service |
| Unit | Manifest syntax validation | `kubectl --dry-run=client` |
| Integration | docker-compose up | Start all services locally |
| Integration | Service-to-service communication | curl between services |
| Integration | Database persistence | Insert/read data |
| E2E | Kubernetes deployment | Minikube/Kind cluster |
| E2E | Rolling update | Deploy new image version |
| E2E | Rollback | `kubectl rollout undo` |

## Migration / Rollout

No data migration required. This is a stateless infrastructure change.

**Rollout Sequence:**
1. Build Docker images: `docker build -t petpay/identity:latest ./Identity`
2. Push to registry: `docker push petpay/identity:latest`
3. Apply to cluster: `kubectl apply -k k8s/overlays/prod`
4. Verify: `kubectl get pods -n petpay`
5. Test endpoints via Ingress

**Rollback Sequence:**
1. `kubectl rollout undo deployment/identity -n petpay`
2. Verify: `kubectl rollout status deployment/identity -n petpay`

## Open Questions

- [ ] Should HorizontalPodAutoscaler be added for auto-scaling based on CPU/memory?
- [ ] Is there a preference for specific storage class (SSD vs HDD)?
- [ ] Should TLS certificates be configured now or later?
- [ ] Are there specific node affinity requirements for database pods?
