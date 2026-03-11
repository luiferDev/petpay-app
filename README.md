# 🏦 PetPay - Microservices Platform

Plataforma de pagos y servicios para mascotas construida con microservicios en Kubernetes.

---

## 📚 Documentación

### Guías de Desarrollo

- **[🐳 Kubernetes Development Guide](docs/KUBERNETES-DEV-GUIDE.md)** - Guía completa de desarrollo local con Kind
- **[🚀 API Gateway](README-API-GATEWAY.md)** - Documentación del API Gateway para desarrollo

### Servicios del Monorepo

| Servicio | Tecnología | Puerto | Descripción |
|----------|------------|--------|-------------|
| **Identity** | TypeScript/Bun | 3000 | Gestión de usuarios y autenticación |
| **Marketplace** | Go/Gin | 8080 | Órdenes y pagos |
| **Catalog** | Go/Gin | 8081 | Productos y servicios |

---

## 🚀 Inicio Rápido

### 1. Iniciar entorno local con Kind

```bash
# Crear cluster Kubernetes
kind create cluster --name petpay-dev --config kind-config.yaml

# Desplegar servicios
kubectl apply -f k8s/base/

# Ver estado
kubectl get all -n petpay
```

### 2. Activar API Gateway

```bash
# Usar script automatizado
./api-gateway-dev.sh

# O manualmente
kubectl port-forward -n ingress-nginx svc/ingress-nginx-controller 8080:80
```

### 3. Probar los servicios

```bash
# Login
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"luifer991+test544@gmail.com","password":"Password123!"}'

# Listar productos
curl "http://localhost:8080/api/v1/products?category=pets"

# Listar órdenes
curl http://localhost:8080/api/v1/orders
```

---

## 🛠️ Desarrollo

### Comandos de desarrollo

```bash
# Ver logs de Identity
kubectl logs -n petpay deploy/identity -f

# Reiniciar un servicio
kubectl rollout restart -n petpay deploy/identity

# Entrar a un pod
kubectl exec -it -n petpay deploy/identity -- /bin/sh
```

### Convenciones de commits

El proyecto sigue las convenciones [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` Nueva funcionalidad
- `fix:` Corrección de bugs
- `docs:` Documentación
- `style:` Formato de código
- `refactor:` Reestructuración sin cambios de funcionalidad
- `test:` Tests
- `chore:` Mantenimiento

Ejemplo: `feat(identity): add user registration endpoint`

---

## 📂 Estructura del Proyecto

```
petpay-app/
├── Identity/                    # Servicio de usuarios (TypeScript/Bun)
├── marketplace/                 # Servicio de marketplace (Go)
├── catalog-offers/              # Servicio de catálogo (Go)
├── k8s/                         # Configuraciones Kubernetes
│   ├── base/                    # Manifestos base
│   └── ingress-nginx-nodeport.yaml
├── kind-config.yaml             # Configuración Kind
├── api-gateway-dev.sh           # Script API Gateway
├── README-API-GATEWAY.md        # Documentación API Gateway
└── docs/
    └── KUBERNETES-DEV-GUIDE.md  # Guía completa de desarrollo
```

---

## 🔐 Seguridad

- **Nunca** commitear archivos `.env` o secrets
- Usa Kubernetes Secrets para datos sensibles
- El API Gateway incluye CORS, rate limiting y security headers
- Las contraseñas en documentación usan `***` como placeholder

---

## 🧹 Limpieza

```bash
# Eliminar servicios
kubectl delete all --all -n petpay

# Eliminar cluster Kind
kind delete cluster --name petpay-dev

# Eliminar imágenes Docker
docker rmi petpay/identity:latest
docker rmi petpay/marketplace:latest
docker rmi petpay/catalog:latest
```

---

## 📖 Recursos Adicionales

- [Guía Kubernetes](docs/KUBERNETES-DEV-GUIDE.md) - Configuración completa de desarrollo
- [API Gateway](README-API-GATEWAY.md) - Endpoints y configuración
- [AGENTS.md](AGENTS.md) - Guías y convenciones para agentes AI

---

**Desarrollado por:** PetPay Team
**Fecha:** Marzo 2026
