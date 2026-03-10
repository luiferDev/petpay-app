# Proposal: Deploy petpay-app Monorepo to Kubernetes

## Intent

The petpay-app monorepo currently runs as standalone services requiring manual deployment and scaling. Moving to Kubernetes will provide automated container orchestration, horizontal scaling, self-healing capabilities, and streamlined CI/CD integration. This addresses operational complexity and prepares the infrastructure for production-scale workloads.

## Scope

### In Scope ✅ (IMPLEMENTED)
- ✅ Containerize all 3 microservices (Identity, Marketplace, Catalog & Offers)
- ✅ Create Kubernetes manifests (Deployments, Services, ConfigMaps, Secrets)
- ✅ Set up PostgreSQL database deployment with persistent storage
- ✅ Configure Ingress controller for external access
- ✅ Define resource limits and requests for all containers
- ✅ Implement health checks (liveness/readiness probes)
- ✅ Create namespace isolation for different environments
- ✅ **Load Balancer** with rate limiting (50 req/s, 100 connections)
- ✅ **Docker Compose** for local development
- ✅ **Nginx** reverse proxy with round-robin load balancing

### Out of Scope
- Service mesh implementation (Istio/Linkerd)
- Advanced monitoring stack (Prometheus/Grafana) - existing or future work
- CI/CD pipeline implementation - can be added later
- Multi-region deployment
- Helm chart templating (flat YAML files acceptable)

## Approach

### Recommended Strategy: Vanilla Kubernetes with Kustomize
1. Use Docker for containerization with multi-stage builds
2. Use Kustomize for environment overlays (dev/staging/prod)
3. Deploy Ingress-Nginx for external traffic routing
4. Use PostgreSQL with StatefulSet for database persistence
5. Implement rolling update strategy for zero-downtime deployments

### Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    Ingress-Nginx                        │
│              (Ports 80/443 → Services)                  │
└─────────────────┬───────────────┬───────────────────────┘
                  │               │
        ┌────────▼────┐  ┌──────▼────────┐
        │  Identity   │  │  Marketplace  │
        │  (Port 3000)│  │   (Port 8080) │
        └─────────────┘  └────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │ Catalog & Offers  │
                    │   (Port 8081)     │
                    └────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   PostgreSQL     │
                    │  (StatefulSet)   │
                    └───────────────────┘
```

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `Identity/Dockerfile` | Modified | Multi-stage build for production |
| `marketplace/Dockerfile` | Modified | Multi-stage build for production |
| `catalog-&-offers/Dockerfile` | Modified | Multi-stage build for production |
| `k8s/` | New | Kubernetes manifests directory |
| `k8s/base/` | New | Common manifests (namespace, configmaps) |
| `k8s/base/namespace.yaml` | New | Namespace `petpay` |
| `k8s/base/configmaps.yaml` | New | ConfigMaps for all services |
| `k8s/base/secrets.yaml` | New | Secrets for DB, JWT, OAuth |
| `k8s/base/identity.yaml` | New | Deployment + Service |
| `k8s/base/marketplace.yaml` | New | Deployment + Service |
| `k8s/base/catalog.yaml` | New | Deployment + Service |
| `k8s/base/postgres.yaml` | New | StatefulSet + PVC |
| `k8s/base/ingress.yaml` | New | Ingress + LoadBalancer |
| `k8s/base/kustomization.yaml` | New | Kustomize config |
| `k8s/overlays/dev/` | New | Development overlay |
| `k8s/overlays/prod/` | New | Production overlay |
| `k8s/README.md` | New | Documentation |
| `docker-compose.yml` | New | Local development compose |
| `nginx.conf` | New | Nginx with load balancing |
| `scripts/build-deploy.sh` | New | Build & deploy script |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Database connection issues from pods | Medium | Use FQDN service name, configure DNS policy |
| Ingress routing misconfiguration | Medium | Test with port-forward first, use path-based routing |
| Resource exhaustion | Low | Set appropriate resource requests/limits |
| Image pull failures | Low | Use image pull secrets for private registry |
| Rolling update failures | Medium | Implement readiness probes, set maxSurge/maxUnavailable |

## Rollback Plan

1. **Immediate Rollback**: Revert to previous deployment using `kubectl rollout undo deployment/<service-name>`
2. **Full Rollback**: Delete Kubernetes resources and revert to previous Docker Compose setup
3. **Database Rollback**: Not applicable (stateless change - database remains unchanged)
4. **Verification**: Run health checks and test basic API endpoints after rollback

## Dependencies

- Kubernetes cluster (v1.24+) or Minikube/Kind for local development
- Docker or containerd runtime
- kubectl configured with cluster access
- Container registry (Docker Hub, GCR, ECR, or self-hosted)
- Ingress controller (nginx-ingress or cloud provider's load balancer)

## Success Criteria

- [x] All 3 services containerized with multi-stage Dockerfiles
- [x] Kubernetes manifests created with Deployments, Services, ConfigMaps, Secrets
- [x] PostgreSQL StatefulSet with persistent storage
- [x] Ingress configured with path-based routing
- [x] Health endpoints defined for all services
- [x] Resource limits defined for all containers
- [x] Load Balancer configured with rate limiting
- [x] Nginx reverse proxy for local development
- [x] Docker Compose for local testing
- [ ] Deploy to actual Kubernetes cluster and verify
- [ ] Rolling update procedure tested
- [ ] Rollback procedure documented

## Implementation Summary

### Files Created

```
petpay-app/
├── Identity/
│   └── Dockerfile              # Multi-stage build (Bun)
├── marketplace/
│   └── Dockerfile              # Multi-stage build (Go)
├── catalog-&-offers/
│   └── Dockerfile              # Multi-stage build (Go)
├── k8s/
│   ├── base/
│   │   ├── namespace.yaml      # Namespace petpay
│   │   ├── configmaps.yaml     # Environment variables
│   │   ├── secrets.yaml        # DB, JWT, OAuth secrets
│   │   ├── identity.yaml       # Deployment + ClusterIP
│   │   ├── marketplace.yaml    # Deployment + ClusterIP
│   │   ├── catalog.yaml        # Deployment + ClusterIP
│  .yaml       # Stateful │   ├── postgresSet + PVC
│   │   ├── ingress.yaml       # Ingress + LoadBalancer
│   │   └── kustomization.yaml
│   ├── overlays/
│   │   ├── dev/               # Development config
│   │   └── prod/              # Production config
│   └── README.md
├── docker-compose.yml          # Local development
├── nginx.conf                  # Nginx load balancer
└── scripts/
    └── build-deploy.sh         # Build & deploy script
```

### Load Balancer Features
- **Round-robin** distribution
- **Rate limiting**: 50 req/s per IP
- **Connection limit**: 100 concurrent
- **SSL redirect** enabled
- **WebSocket** support
- **Health check** endpoint

### Kubernetes Features
- **2-3 replicas** per service (configurable)
- **Liveness + Readiness** probes
- **Pod anti-affinity** for HA
- **Resource limits** (CPU/Memory)
- **Rolling updates** with maxSurge
- **Persistent storage** for PostgreSQL
