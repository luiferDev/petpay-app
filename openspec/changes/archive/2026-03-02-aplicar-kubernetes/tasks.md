# Tasks: Apply Kubernetes Deployment

## Phase 1: Dockerfiles ✅

- [x] 1.1 Create/Update Identity Dockerfile with multi-stage build
- [x] 1.2 Create/Update Marketplace Dockerfile with multi-stage build
- [x] 1.3 Create/Update Catalog Dockerfile with multi-stage build
- [x] 1.4 Test Docker builds locally

## Phase 2: Kubernetes Base ✅

- [x] 2.1 Create namespace.yaml
- [x] 2.2 Create configmaps.yaml for all services
- [x] 2.3 Create secrets.yaml template
- [x] 2.4 Create identity.yaml (Deployment + Service)
- [x] 2.5 Create marketplace.yaml (Deployment + Service)
- [x] 2.6 Create catalog.yaml (Deployment + Service)
- [x] 2.7 Create postgres.yaml (StatefulSet + PVC)
- [x] 2.8 Create ingress.yaml with load balancer

## Phase 3: Kustomize Overlays ✅

- [x] 3.1 Create base kustomization.yaml
- [x] 3.2 Create dev overlay
- [x] 3.3 Create prod overlay
- [x] 3.4 Configure resource scaling per environment

## Phase 4: Load Balancer & Proxy ✅

- [x] 4.1 Configure Nginx with round-robin
- [x] 4.2 Add rate limiting (50 req/s)
- [x] 4.3 Add connection limits (100)
- [x] 4.4 Configure path-based routing
- [x] 4.5 Add health check endpoint

## Phase 5: Documentation & Scripts ✅

- [x] 5.1 Create k8s/README.md
- [x] 5.2 Create docker-compose.yml
- [x] 5.3 Create nginx.conf
- [x] 5.4 Create build-deploy.sh script

## Phase 6: Testing (PENDING)

- [ ] 6.1 Test docker-compose up locally
- [ ] 6.2 Test nginx routing
- [ ] 6.3 Deploy to Minikube/Kind
- [ ] 6.4 Verify services communicate
- [ ] 6.5 Test rolling update
- [ ] 6.6 Test rollback procedure
