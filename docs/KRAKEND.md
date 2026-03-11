# KrakenD API Gateway - Investigación y Plan de Implementación

> Documento de investigación sobre KrakenD para usar como API Gateway con Docker Compose y Kubernetes.
> Incluye configuración de balanceo de carga y autenticación JWT.

---

## ¿Qué es KrakenD?

KrakenD es un **API Gateway de alto rendimiento** written in Go que actúa como puerta de entrada a tus microservicios. Es ultrarrápido (hasta 20k req/s), stateless, y tiene soporte nativo para:

- **JWT Validation** - Autenticación y autorización
- **Rate Limiting** - Control de tráfico
- **Load Balancing** - Distribución de carga
- **Circuit Breaker** - Protección de backends
- **Request/Response Transformation** - Manipulación de datos

---

## Comparación: nginx vs KrakenD

| Característica | nginx | KrakenD |
|----------------|-------|---------|
| JWT Validation | ❌ Manual con lua | ✅ Nativo |
| Rate Limiting | ✅ Básico | ✅ Avanzado (per-user, per-ip) |
| Load Balancing | ✅ | ✅ |
| Circuit Breaker | ⚠️ Módulo adicional | ✅ Nativo |
| Configuration | JSON | JSON (más legible) |
| Performance | Alto | Muy alto |
| Kubernetes | ❌ Manual | ✅ Operador oficial |

---

## Arquitectura Propuesta

```
                    ┌─────────────────┐
                    │   Cliente       │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   KrakenD       │ ◄── JWT Validation
                    │   (Gateway)     │ ◄── Rate Limiting
                    │   Puerto 8080   │ ◄── Load Balancing
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
┌────────▼────────┐  ┌────────▼────────┐  ┌────────▼────────┐
│   Identity      │  │   Marketplace  │  │   Catalog      │
│   :3000        │  │   :8080        │  │   :8081        │
└─────────────────┘  └─────────────────┘  └─────────────────┘
                                                        
┌─────────────────────────────────────────────────────────────┐
│                          │                                  │
│                    ┌─────▼─────┐                           │
│                    │  Booking   │                           │
│                    │  :8082    │                           │
│                    └───────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Docker Compose

### Dockerfile

```dockerfile
FROM krakend:2.13

# Copiar configuración
COPY krakend.json /etc/krakend/krakend.json

# Ejecutar KrakenD
CMD ["krakend", "run", "-d", "-c", "/etc/krakend/krakend.json", "-p", "8080"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  krakend:
    build: ./krakend
    ports:
      - "8080:8080"
    volumes:
      - ./krakend/krakend.json:/etc/krakend/krakend.json:ro
    depends_on:
      - identity
      - marketplace
      - catalog
      - bookings

  identity:
    build: ./Identity
    ports:
      - "3000:3000"

  marketplace:
    build: ./marketplace
    ports:
      - "8080:8080"

  catalog:
    build: ./catalog
    ports:
      - "8081:8081"

  bookings:
    build: ./bookings-service
    ports:
      - "8082:8082"
```

---

## 2. Kubernetes

### Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: krakend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: krakend
  template:
    metadata:
      labels:
        app: krakend
    spec:
      containers:
      - name: krakend
        image: YOUR-KRAKEND-IMAGE:1.0.0
        ports:
        - containerPort: 8080
        command: ["/usr/bin/krakend"]
        args: ["run", "-d", "-c", "/etc/krakend/krakend.json", "-p", "8080"]
        securityContext:
          allowPrivilegeEscalation: false
          runAsNonRoot: true
          runAsUser: 1000
          readOnlyRootFilesystem: true
          capabilities:
            drop:
              - ALL
            add:
              - NET_BIND_SERVICE
```

### Service (NodePort)

```yaml
apiVersion: v1
kind: Service
metadata:
  name: krakend-service
spec:
  type: NodePort
  ports:
  - name: http
    port: 8000
    targetPort: 8080
    protocol: TCP
  selector:
    app: krakend
```

---

## 3. Configuración JWT

### Estructura JWT

```
header.payload.signature
```

El header debe contener:
```json
{
  "alg": "RS256",
  "kid": "KEY_ID"
}
```

### Configuración de Validación JWT

```json
{
  "version": 3,
  "extra_config": {
    "auth/validator": {
      "alg": "RS256",
      "jwk_url": "https://identity.example.com/.well-known/jwks.json",
      "audience": ["petpay-api"],
      "issuer": "https://identity.example.com",
      "cache": true,
      "cache_duration": 900
    }
  },
  "endpoints": [
    {
      "endpoint": "/api/v1/bookings",
      "method": "POST",
      "extra_config": {
        "auth/validator": {
          "roles_key": "roles",
          "roles": ["user", "admin"]
        }
      },
      "backend": [
        {
          "url_pattern": "/api/v1/bookings",
          "host": ["http://bookings:8082"]
        }
      ]
    },
    {
      "endpoint": "/api/v1/bookings",
      "method": "GET",
      "extra_config": {
        "auth/validator": {}
      },
      "backend": [
        {
          "url_pattern": "/api/v1/bookings",
          "host": ["http://bookings:8082"]
        }
      ]
    }
  ]
}
```

### Claims a Headers

```json
{
  "endpoint": "/api/v1/bookings",
  "input_headers": ["X-User", "X-Roles"],
  "extra_config": {
    "auth/validator": {
      "propagate_claims": [
        ["sub", "X-User"],
        ["roles", "X-Roles"]
      ]
    }
  }
}
```

---

## 4. Load Balancing

### Configuración de Backends

```json
{
  "endpoint": "/api/v1/products",
  "backend": [
    {
      "url_pattern": "/",
      "host": [
        "http://catalog-1:8081",
        "http://catalog-2:8081",
        "http://catalog-3:8081"
      ],
      "weight": 3,
      "extra_config": {
        "proxy": {
          "balance": "round-robin",
          "max_connections": 100,
          "max_idle_connections": 50
        }
      }
    }
  ]
}
```

### Estrategias de Balanceo

| Estrategia | Descripción |
|-----------|-------------|
| `round-robin` | Por defecto, distribuye equitativamente |
| `least-connections` | Envía al con menos conexiones activas |
| `weight` | ponderado según peso definido |

---

## 5. Rate Limiting

### Rate Limiting por Usuario

```json
{
  "endpoint": "/api/v1/bookings",
  "extra_config": {
    "qos/ratelimit/proxy": {
      "max_rate": 100,
      "strategy": "token-bucket",
      "capacity": 100
    }
  }
}
```

### Rate Limiting Global

```json
{
  "version": 3,
  "extra_config": {
    "qos/ratelimit/global": {
      "max_rate": 1000,
      "burst": 100
    }
  }
}
```

---

## 6. Circuit Breaker

```json
{
  "backend": [
    {
      "url_pattern": "/api/v1/bookings",
      "host": ["http://bookings:8082"],
      "extra_config": {
        "qos/breaker": {
          "enabled": true,
          "interval": 60,
          "timeout": 30,
          "max_errors": 3,
          "half_open_requests": 3
        }
      }
    }
  ]
}
```

---

## 7. Configuración Completa krakend.json

```json
{
  "version": 3,
  "name": "Petpay API Gateway",
  
  "extra_config": {
    "telemetry/logging": {
      "level": "ERROR",
      "stdout": true,
      "syslog": false
    },
    "router": {
      "disable_access_log": false
    },
    "qos/ratelimit/global": {
      "max_rate": 5000,
      "burst": 100
    }
  },

  "endpoints": [
    {
      "endpoint": "/api/v1/auth/login",
      "backend": [
        {
          "url_pattern": "/api/v1/auth/login",
          "host": ["http://identity:3000"]
        }
      ]
    },
    {
      "endpoint": "/api/v1/auth/refresh",
      "backend": [
        {
          "url_pattern": "/api/v1/auth/refresh",
          "host": ["http://identity:3000"]
        }
      ]
    },
    {
      "endpoint": "/api/v1/users",
      "method": "GET",
      "extra_config": {
        "auth/validator": {
          "roles": ["user", "admin"]
        }
      },
      "backend": [
        {
          "url_pattern": "/api/v1/users",
          "host": ["http://identity:3000"]
        }
      ]
    },
    {
      "endpoint": "/api/v1/bookings",
      "method": "GET",
      "extra_config": {
        "auth/validator": {
          "roles": ["user", "admin"]
        }
      },
      "backend": [
        {
          "url_pattern": "/api/v1/bookings",
          "host": ["http://bookings:8082"]
        }
      ]
    },
    {
      "endpoint": "/api/v1/bookings",
      "method": "POST",
      "extra_config": {
        "auth/validator": {
          "roles": ["user", "admin"]
        },
        "qos/ratelimit/proxy": {
          "max_rate": 10,
          "strategy": "token-bucket"
        }
      },
      "backend": [
        {
          "url_pattern": "/api/v1/bookings",
          "host": ["http://bookings:8082"]
        }
      ]
    },
    {
      "endpoint": "/api/v1/orders",
      "extra_config": {
        "auth/validator": {}
      },
      "backend": [
        {
          "url_pattern": "/api/v1/orders",
          "host": ["http://marketplace:8080"]
        }
      ]
    },
    {
      "endpoint": "/api/v1/products",
      "backend": [
        {
          "url_pattern": "/api/v1/products",
          "host": ["http://catalog:8081"]
        }
      ]
    }
  ]
}
```

---

## 8. Flujo de Autenticación

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT                                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ 1. POST /api/v1/auth/login
                            ▼
┌───────────────────────────────────────────────────────────────────┐
│                    KRAKEND GATEWAY                                │
│  (Pasa la request tal cual al backend)                           │
└───────────────────────────┬───────────────────────────────────────┘
                            │
                            │ 2. POST /api/v1/auth/login
                            ▼
┌───────────────────────────────────────────────────────────────────┐
│                    IDENTITY SERVICE                               │
│  - Valida credenciales                                           │
│  - Genera JWT con: sub, roles, audience, issuer                  │
└───────────────────────────┬───────────────────────────────────────┘
                            │
                            │ JWT Token
                            ▼
┌───────────────────────────────────────────────────────────────────┐
│                        CLIENT                                     │
│  - Guarda el token                                               │
│  - Envía en header: Authorization: Bearer <token>               │
└───────────────────────────────────────────────────────────────────┘
                            │
                            │ 3. GET /api/v1/bookings
                            │    Authorization: Bearer <token>
                            ▼
┌───────────────────────────────────────────────────────────────────┐
│                    KRAKEND GATEWAY                                │
│  1. Extrae token del header                                      │
│  2. Valida firma con JWK (Identity)                             │
│  3. Verifica audience, issuer                                   │
│  4. Verifica roles                                               │
│  5. Propaga claims como headers (X-User, X-Roles)              │
│  6. Forward al backend                                           │
└───────────────────────────┬───────────────────────────────────────┘
                            │
                            │ + X-User: user-123
                            │ + X-Roles: user,admin
                            ▼
┌───────────────────────────────────────────────────────────────────┐
│                    BOOKINGS SERVICE                               │
│  - Recibe request con headers de usuario                         │
│  - Usa X-User para saber quién hace la request                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## 9. Recomendaciones de Producción

### Alto Disponibilidad

- Ejecutar mínimo **2 instancias** de KrakenD
- Colocar un **load balancer** frente a KrakenD (o usar Kubernetes)
- KrakenD es **stateless** - no necesita compartir estado entre nodos

### Logging

```json
{
  "extra_config": {
    "telemetry/logging": {
      "level": "ERROR"
    }
  }
}
```

### Métricas

```json
{
  "extra_config": {
    "telemetry/influxdb": {
      "address": "http://influxdb:8086",
      "bucket": "krakend",
      "org": "myorg",
      "token": "mytoken"
    }
  }
}
```

---

## 10. Próximos Pasos

1. **Crear config/krakend.json** con las rutas de tus servicios
2. **Configurar JWK URL** apuntando a tu Identity service
3. **Probar localmente** con docker-compose
4. **Migrar a Kubernetes** con el deployment YAML
5. **Configurar métricas** (Grafana + InfluxDB)

---

## Recursos

- [Documentación oficial](https://www.krakend.io/docs/)
- [Docker deployment](https://www.krakend.io/docs/deploying/docker/)
- [Kubernetes deployment](https://www.krakend.io/docs/deploying/kubernetes/)
- [JWT Validation](https://www.krakend.io/docs/authorization/jwt-validation/)
- [JWT Overview](https://www.krakend.io/docs/authorization/jwt-overview/)
- [KrakenD Playground](https://www.krakend.io/docs/overview/playground/)

---

## Archivos Creados

### Docker Compose

```bash
# Estructura de archivos
krakend/
├── krakend.json      # Configuración por defecto (dev sin JWT)
├── krakend-dev.json  # Configuración desarrollo
├── krakend-prod.json # Configuración producción (con JWT)
└── Dockerfile         # Build con soporte para dev/prod
```

### Kubernetes

```bash
k8s/krakend/
├── deployment.yaml   # Deployment con 3 réplicas
├── service.yaml      # NodePort + ClusterIP
└── configmap.yaml    # Configuración embebida
```

---

## Uso

### Desarrollo (sin JWT)

```bash
# Usar configuración dev
cp krakend/krakend-dev.json krakend/krakend.json

# O construir con variable de entorno
docker build --build-arg ENVIRONMENT=dev -t petpay-krakend:dev ./krakend
```

### Producción (con JWT)

```bash
# Usar configuración prod
cp krakend/krakend-prod.json krakend/krakend.json

# O construir con variable de entorno
docker build --build-arg ENVIRONMENT=prod -t petpay-krakend:prod ./krakend
```

### Docker Compose

```bash
# Levantar todo
docker-compose up -d krakend

# Ver logs
docker-compose logs -f krakend

# Verificar salud
curl http://localhost:8080/health
```

### Kubernetes

```bash
# Aplicar configuración
kubectl apply -f k8s/krakend/

# Ver pods
kubectl get pods -l app=krakend

# Ver logs
kubectl logs -l app=krakend
```

---

## Endpoints Disponibles

| Método | Endpoint | Backend | Auth JWT |
|--------|----------|---------|----------|
| POST | `/api/v1/auth/login` | Identity | ❌ |
| POST | `/api/v1/auth/register` | Identity | ❌ |
| POST | `/api/v1/auth/refresh` | Identity | ❌ |
| GET | `/api/v1/users/profile` | Identity | ✅ user, admin |
| PATCH | `/api/v1/users/profile` | Identity | ✅ user, admin |
| GET | `/api/v1/bookings` | Bookings | ✅ user, admin, provider |
| POST | `/api/v1/bookings` | Bookings | ✅ user, admin |
| GET | `/api/v1/bookings/{id}` | Bookings | ✅ user, admin, provider |
| PATCH | `/api/v1/bookings/{id}/status` | Bookings | ✅ provider, admin |
| DELETE | `/api/v1/bookings/{id}` | Bookings | ✅ user, admin |
| GET | `/api/v1/orders` | Marketplace | ✅ user, admin |
| POST | `/api/v1/orders` | Marketplace | ✅ user, admin |
| GET | `/api/v1/products` | Catalog | ❌ |
| GET | `/api/v1/categories` | Catalog | ❌ |
| GET | `/api/v1/services` | Catalog | ❌ |
| GET | `/health` | Identity | ❌ |
