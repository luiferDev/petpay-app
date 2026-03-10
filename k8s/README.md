# petpay-app Kubernetes Deployment

## Estructura

```
k8s/
├── base/                    # Manifiestos base
│   ├── namespace.yaml        # Namespace
│   ├── configmaps.yaml      # ConfigMaps
│   ├── secrets.yaml         # Secrets
│   ├── postgres.yaml        # PostgreSQL StatefulSet
│   ├── identity.yaml        # Identity Service
│   ├── marketplace.yaml     # Marketplace Service
│   ├── catalog.yaml         # Catalog Service
│   ├── ingress.yaml         # Ingress + LoadBalancer
│   └── kustomization.yaml   # Kustomize config
├── overlays/
│   ├── dev/                 # Desarrollo
│   │   └── kustomization.yaml
│   └── prod/                # Producción
│       └── kustomization.yaml
```

## Requisitos

- Kubernetes v1.24+
- kubectl configurado
- Kustomize instalado
- Ingress Controller (nginx-ingress)
- Docker para build de imágenes

## Quick Start

### 1. Build de imágenes Docker

```bash
# Identity
docker build -t petpay/identity:latest ./Identity

# Marketplace  
docker build -t petpay/marketplace:latest ./marketplace

# Catalog
docker build -t petpay/catalog:latest ./catalog-&-offers
```

### 2. Apply con Kustomize

```bash
# Desarrollo
kubectl apply -k k8s/overlays/dev

# Producción
kubectl apply -k k8s/overlays/prod
```

### 3. Verificar deployment

```bash
# Ver pods
kubectl get pods -n petpay

# Ver servicios
kubectl get svc -n petpay

# Ver ingress
kubectl get ingress -n petpay

# Logs
kubectl logs -n petpay -l app=identity
```

## Configuración

### Secrets

Los secrets contienen información sensible. Edita `base/secrets.yaml` o usa:

```bash
# Crear secret desde literal
kubectl create secret generic petpay-secrets \
  --from-literal=DB_PASSWORD='tu-password' \
  --from-literal=JWT_SECRET='tu-jwt-secret' \
  -n petpay
```

### Ingress

El Ingress está configurado para rutas:
- `/api/v1/auth/*` → Identity (3000)
- `/api/v1/users/*` → Identity (3000)
- `/api/v1/marketplace/*` → Marketplace (8080)
- `/api/v1/orders/*` → Marketplace (8080)
- `/api/v1/products/*` → Catalog (8081)
- `/api/v1/categories/*` → Catalog (8081)
- `/api/v1/services/*` → Catalog (8081)

### Balanceador de Carga

El Ingress incluye:
- Round-robin load balancing
- Rate limiting (50 req/s)
- Connection limits (100 concurrentes)
- SSL redirect
- WebSocket support

### Escalado

```bash
# Escalar manualmente
kubectl scale deployment identity --replicas=5 -n petpay

# HPA (Horizontal Pod Autoscaler)
kubectl autoscale deployment identity --min=2 --max=10 --cpu-percent=70 -n petpay
```

### Rolling Update

```bash
# Actualizar imagen
kubectl set image deployment/identity identity=petpay/identity:v1.1.0 -n petpay

# Ver progreso
kubectl rollout status deployment/identity -n petpay

# Rollback
kubectl rollout undo deployment/identity -n petpay
```

## Health Checks

Cada servicio tiene:
- **Liveness Probe**: Verifica si el contenedor está vivo
- **Readiness Probe**: Verifica si el contenedor puede recibir tráfico

## Recursos

| Servicio | CPU Request | CPU Limit | Memory Request | Memory Limit |
|----------|-------------|-----------|----------------|--------------|
| Identity | 100m | 500m | 128Mi | 512Mi |
| Marketplace | 100m | 500m | 128Mi | 512Mi |
| Catalog | 100m | 500m | 128Mi | 512Mi |
| Postgres | 250m | 1000m | 256Mi | 1Gi |

## Limpiar

```bash
# Eliminar todo
kubectl delete -k k8s/overlays/dev
kubectl delete -k k8s/overlays/prod
```
