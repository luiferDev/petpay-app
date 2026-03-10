# 🚀 Petpay API Gateway - Development Environment

## Quick Start

```bash
# Start the API Gateway
./api-gateway-dev.sh

# Test all endpoints
./api-gateway-dev.sh --test
```

## 📡 Endpoints

### Base URL
```
http://localhost:8080
```

### 🔐 Identity Service (Users & Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login with email/password |
| POST | `/auth/register` | Register new user |
| POST | `/auth/refresh` | Refresh access token |
| GET | `/api/v1/users/:id` | Get user by ID |

**Example: Login**
```bash
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "luifer991+test544@gmail.com",
    "password": "***"
  }'
```

### 🛒 Marketplace Service (Orders & Payments)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/orders` | List orders |
| POST | `/api/v1/orders` | Create order |
| GET | `/api/v1/orders/:id` | Get order by ID |
| GET | `/api/v1/payments` | List payments |

**Example: List Orders**
```bash
curl http://localhost:8080/api/v1/orders
```

### 📦 Catalog Service (Products & Services)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/products` | List products |
| GET | `/api/v1/products/:id` | Get product by ID |
| GET | `/api/v1/categories` | List categories |
| GET | `/api/v1/services` | List services |

**Example: List Products**
```bash
curl "http://localhost:8080/api/v1/products?category=pets"
```

## 🔒 Security Features

### 1. CORS Configuration
- Origin: `http://localhost:3000, http://localhost:3001, https://petpay.local, https://petpay.dev`
- Methods: `GET, POST, PUT, PATCH, DELETE, OPTIONS`
- Headers: `Authorization, Content-Type, DNT, Keep-Alive`

### 2. Rate Limiting
- **Rate limit**: 100KB per request
- **Connections**: Max 10 concurrent connections
- **Requests/sec**: 10 RPS

### 3. Security Headers
```nginx
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
```

### 4. Request Timeouts
- Connect: 30s
- Read: 60s
- Send: 60s

## 🛠️ Useful Commands

### View Logs
```bash
# Identity service
kubectl logs -n petpay deploy/identity --tail=20 -f

# Marketplace service
kubectl logs -n petpay deploy/marketplace --tail=20 -f

# Catalog service
kubectl logs -n petpay deploy/catalog --tail=20 -f

# Ingress controller
kubectl logs -n ingress-nginx deploy/ingress-nginx-controller --tail=20 -f
```

### Restart Services
```bash
kubectl rollout restart -n petpay deploy/identity
kubectl rollout restart -n petpay deploy/marketplace
kubectl rollout restart -n petpay deploy/catalog
```

### Check Service Status
```bash
kubectl get pods -n petpay
kubectl get services -n petpay
kubectl get ingress -n petpay
```

### Access Directly (Without Gateway)
```bash
# Identity
curl http://localhost:3000/auth/login

# Marketplace
curl http://localhost:8080/api/v1/orders

# Catalog
curl http://localhost:8081/api/v1/products
```

## 📝 Test Users

| Email | Password | Role |
|-------|----------|------|
| `luifer991+test544@gmail.com` | `***` (from secrets) | ADMIN |
| `test@test.com` | `***` (from secrets) | CLIENT |

## 🔍 Troubleshooting

### Gateway not responding
```bash
# Check port-forward process
ps aux | grep port-forward

# Restart gateway
pkill -f "port-forward"
./api-gateway-dev.sh
```

### Database errors
```bash
# Check database connectivity
kubectl exec -it postgres-0 -n petpay -- psql -U postgres -d petpay -c "SELECT 1"
```

### Pod crashes
```bash
# Check pod events
kubectl describe pod -n petpay -l app=identity

# Check recent pod status
kubectl get pods -n petpay --sort-by=.metadata.creationTimestamp
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│         Client Applications             │
│  (Web, Mobile, Postman, curl)          │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│         API Gateway (NGINX)             │
│  • Rate Limiting                        │
│  • CORS                                 │
│  • Security Headers                     │
│  • Request Routing                      │
└───────────────┬─────────────────────────┘
                │
        ┌───────┴───────┐
        ▼               ▼
┌──────────────┐ ┌──────────────┐
│  Identity    │ │ Marketplace  │
│  Service     │ │   Service    │
│  (Port 3000) │ │  (Port 8080) │
└──────────────┘ └──────────────┘
        │               │
        ▼               ▼
┌──────────────┐ ┌──────────────┐
│  PostgreSQL  │ │  PostgreSQL  │
│  (Database)  │ │  (Database)  │
└──────────────┘ └──────────────┘
```

## 📚 Additional Resources

- [Kubernetes Dashboard](http://localhost:9090) (if enabled)
- [PostgreSQL Connection](postgres://postgres:changeme@localhost:5432/petpay)
- [Services API Docs](./docs/api.md)

---

**Note**: This setup is for development only. For production, configure proper SSL/TLS, external DNS, and enhanced security measures.
