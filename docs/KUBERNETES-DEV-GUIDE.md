# 🐳 Guía Completa de Desarrollo con Kubernetes (Kind)

Este documento contiene todos los comandos paso a paso para configurar, ejecutar y probar un entorno de desarrollo Kubernetes completo para Petpay.

---

## 📋 Índice

1. [Prerrequisitos](#prerrequisitos)
2. [Instalación de Kind](#instalación-de-kind)
3. [Crear el Cluster](#crear-el-cluster)
4. [Configurar Ingress y NodePorts](#configurar-ingress-y-nodeports)
5. [Preparar Imágenes Docker](#preparar-imágenes-docker)
6. [Desplegar Servicios](#desplegar-servicios)
7. [Activar API Gateway](#activar-api-gateway)
8. [Probar los Servicios](#probar-los-servicios)
9. [Monitoreo y Debug](#monitoreo-y-debug)
10. [Limpieza Total](#limpieza-total)

---

## 1. Prerrequisitos

### Instalar dependencias necesarias

```bash
# Instalar Docker (si no lo tienes)
sudo apt update && sudo apt install docker.io docker-compose -y
sudo usermod -aG docker $USER
newgrp docker  # O reinicia sesión

# Instalar kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Instalar Kind
curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind

# Verificar instalaciones
docker --version
kubectl version --client
kind version
```

### Variables de entorno útiles

```bash
export KUBECONFIG=~/.kube/config
export CLUSTER_NAME=petpay-dev
```

---

## 2. Crear el Cluster con Kind

### Opción A: Usar configuración existente (recomendado)

```bash
# Desde el directorio del proyecto
cd /home/luiferdev/Documents/Dev/petpay-app

# Crear cluster con configuración
kind create cluster \
  --name petpay-dev \
  --config kind-config.yaml \
  --wait 5m
```

### Opción B: Crear cluster manual

```bash
# Crear configuración temporal
cat <<EOF > /tmp/kind-config.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
name: petpay-dev
nodes:
  - role: control-plane
    kubeadmConfigPatches:
      - |
        kind: InitConfiguration
        nodeRegistration:
          kubeletExtraArgs:
            node-labels: "ingress-ready=true"
    extraPortMappings:
      - containerPort: 80
        hostPort: 80
        protocol: TCP
      - containerPort: 443
        hostPort: 443
        protocol: TCP
      - containerPort: 6443
        hostPort: 39785
        protocol: TCP
EOF

# Crear cluster
kind create cluster \
  --name petpay-dev \
  --config /tmp/kind-config.yaml \
  --wait 5m
```

### Verificar cluster

```bash
# Ver nodos
kubectl get nodes

# Ver estado cluster
kubectl cluster-info

# Ver namespaces
kubectl get namespaces
```

**Salida esperada:**
```
NAME                 STATUS   ROLES           AGE   VERSION
petpay-dev-control-plane   Ready    control-plane   2m   v1.34.0
```

---

## 3. Configurar Ingress y NodePorts

### Aplicar configuración de Ingress

```bash
# Aplicar configuración NGINX Ingress Controller
kubectl apply -f k8s/ingress-nginx-nodeport.yaml

# Esperar a que esté listo
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=90s
```

### Verificar Ingress

```bash
# Ver pods de ingress
kubectl get pods -n ingress-nginx

# Ver servicios
kubectl get svc -n ingress-nginx

# Ver NodePorts disponibles
kubectl get svc ingress-nginx-controller -n ingress-nginx
```

**Salida esperada:**
```
NAME                       TYPE       CLUSTER-IP    EXTERNAL-IP   PORT(S)                      AGE
ingress-nginx-controller   NodePort   10.96.89.50   <none>        80:31980/TCP,443:31953/TCP   1m
```

### Configurar NodePort para el API Gateway

```bash
# Redirigir puerto 80 al NodePort 31980 (desde el host)
# O usar directamente el puerto del NodePort
echo "API Gateway disponible en: http://localhost:31980"
```

---

## 4. Preparar Imágenes Docker

### Verificar imágenes necesarias

```bash
# Listar imágenes actuales
docker images

# Buscar imágenes en el proyecto
find . -name "Dockerfile*" -o -name "docker-compose.yml" | grep -v node_modules
```

### Construir imágenes (si no existen)

```bash
# Para Identity (TypeScript/Bun)
cd Identity
docker build -t petpay/identity:latest .
docker image tag petpay/identity:latest petpay/identity:$(date +%Y%m%d-%H%M%S)
cd ..

# Para Marketplace (Go)
cd marketplace
docker build -t petpay/marketplace:latest .
docker image tag petpay/marketplace:latest petpay/marketplace:$(date +%Y%m%d-%H%M%S)
cd ..

# Para Catalog (Go)
cd catalog-&-offers
docker build -t petpay/catalog:latest .
docker image tag petpay/catalog:latest petpay/catalog:$(date +%Y%m%d-%H%M%S)
cd ..
```

### Cargar imágenes al cluster Kind

```bash
# Cargar imágenes en el cluster
kind load docker-image petpay/identity:latest --name petpay-dev
kind load docker-image petpay/marketplace:latest --name petpay-dev
kind load docker-image petpay/catalog:latest --name petpay-dev

# Verificar imágenes cargadas
docker exec petpay-dev-control-plane crictl images | grep petpay
```

### Alternativa: Usar imágenes remotas

Si las imágenes ya existen en un registry:

```bash
# Modificar los deployment.yaml para usar imágenes remotas
# kubectl set image deployment/identity identity=registry/repo/imagen:tag
```

---

## 5. Desplegar Servicios

### Preparar base de datos PostgreSQL

```bash
# Aplicar configuración de PostgreSQL
kubectl apply -f k8s/base/postgres.yaml

# Esperar a que esté listo
kubectl wait --namespace petpay \
  --for=condition=ready pod \
  --selector=app=postgres \
  --timeout=300s

# Verificar estado
kubectl get pods -n petpay -l app=postgres
```

### Aplicar configuraciones base

```bash
# Aplicar namespace
kubectl apply -f k8s/base/namespace.yaml

# Aplicar secrets (si es necesario, ajustar valores)
kubectl apply -f k8s/base/secrets.yaml

# Aplicar configmaps
kubectl apply -f k8s/base/configmaps.yaml
```

### Desplegar servicios

```bash
# Aplicar todos los servicios
kubectl apply -f k8s/base/identity.yaml
kubectl apply -f k8s/base/marketplace.yaml
kubectl apply -f k8s/base/catalog.yaml

# Aplicar ingress
kubectl apply -f k8s/base/ingress.yaml
```

### Verificar despliegue

```bash
# Ver pods en el namespace petpay
kubectl get pods -n petpay

# Ver servicios
kubectl get svc -n petpay

# Ver ingress
kubectl get ingress -n petpay

# Ver logs de cada servicio
kubectl logs -n petpay deploy/identity --tail=20
kubectl logs -n petpay deploy/marketplace --tail=20
kubectl logs -n petpay deploy/catalog --tail=20
```

---

## 6. Ejecutar Migraciones de Base de Datos

```bash
# Ejecutar migraciones en Identity
kubectl exec -it postgres-0 -n petpay -- psql -U postgres -d petpay -c "
CREATE TABLE IF NOT EXISTS users (
    id varchar(26) PRIMARY KEY NOT NULL,
    email varchar(255) NOT NULL,
    password_hash varchar(255) NOT NULL,
    first_name varchar(100) NOT NULL,
    last_name varchar(100) NOT NULL,
    phone varchar(20),
    is_verified boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT users_email_unique UNIQUE(email)
);

CREATE INDEX IF NOT EXISTS email_idx ON users USING btree (email);

-- Insertar usuario de prueba
INSERT INTO users (id, email, password_hash, first_name, last_name, is_verified)
VALUES ('user12345678901234', 'luifer991+test544@gmail.com', '\$2b\$12\$Gl4o7a1M3FyNV7YA8kz36Orjk1J7kedzyRHerA/M8MmIBIid6xoI6', 'Luifer', 'Admin', true)
ON CONFLICT (email) DO NOTHING;
"
```

---

## 7. Activar API Gateway

### Opción A: Usar script automatizado

```bash
cd /home/luiferdev/Documents/Dev/petpay-app

# Iniciar API Gateway
./api-gateway-dev.sh
```

### Opción B: Manual con port-forward

```bash
# Iniciar port-forward para el API Gateway (NodePort)
nohup kubectl port-forward --address 0.0.0.0 \
  -n ingress-nginx svc/ingress-nginx-controller 8080:80 \
  > /tmp/gateway.log 2>&1 &

# Verificar que está corriendo
ps aux | grep "port-forward"
curl -s http://localhost:8080/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"luifer991+test544@gmail.com","password":"Password123!"}'
```

### Opción C: Usar NodePort directamente

```bash
# Obtener NodePort de ingress
NODE_PORT=$(kubectl get svc ingress-nginx-controller -n ingress-nginx \
  -o jsonpath='{.spec.ports[?(@.name=="http")].nodePort}')

echo "API Gateway: http://localhost:${NODE_PORT}"
# Ejemplo: http://localhost:31980
```

---

## 8. Probar los Servicios

### Probar Identity Service

```bash
# Login
curl -s -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"luifer991+test544@gmail.com","password":"Password123!"}'

# Registrar usuario (si el endpoint existe)
curl -s -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nuevo@ejemplo.com",
    "password": "Password123!",
    "firstName": "Nuevo",
    "lastName": "Usuario"
  }'
```

### Probar Marketplace Service

```bash
# Listar orders
curl -s http://localhost:8080/api/v1/orders

# Crear order (si el endpoint existe)
curl -s -X POST http://localhost:8080/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"productId": "1", "quantity": 2}],
    "total": 100.00
  }'
```

### Probar Catalog Service

```bash
# Listar productos
curl -s "http://localhost:8080/api/v1/products?category=pets"

# Listar categorías
curl -s http://localhost:8080/api/v1/categories
```

### Script de prueba completo

```bash
#!/bin/bash
# save as test-gateway.sh

echo "=== Probando API Gateway ==="
echo ""

# Test Identity
echo "1. Identity Service:"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"luifer991+test544@gmail.com","password":"Password123!"}')
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)
echo "   HTTP Status: $HTTP_CODE"
echo "   Response: $BODY"
echo ""

# Test Marketplace
echo "2. Marketplace Service:"
curl -s http://localhost:8080/api/v1/orders | head -c 100
echo ""
echo ""

# Test Catalog
echo "3. Catalog Service:"
curl -s "http://localhost:8080/api/v1/products" | head -c 100
echo ""
echo ""

echo "=== Pruebas completadas ==="
```

---

## 9. Monitoreo y Debug

### Ver logs en tiempo real

```bash
# Logs de Identity
kubectl logs -n petpay deploy/identity -f --tail=50

# Logs de Marketplace
kubectl logs -n petpay deploy/marketplace -f --tail=50

# Logs de Catalog
kubectl logs -n petpay deploy/catalog -f --tail=50

# Logs de Ingress Controller
kubectl logs -n ingress-nginx deploy/ingress-nginx-controller -f --tail=50

# Logs de PostgreSQL
kubectl logs -n petpay postgres-0 -f --tail=50
```

### Describir recursos

```bash
# Describir pods
kubectl describe pod -n petpay

# Describir servicios
kubectl describe svc -n petpay

# Describir ingress
kubectl describe ingress -n petpay

# Ver eventos del cluster
kubectl get events -n petpay --sort-by='.lastTimestamp'
```

### Debug con exec

```bash
# Entrar al pod de Identity
kubectl exec -it -n petpay deploy/identity -- /bin/sh

# Entrar al pod de PostgreSQL
kubectl exec -it -n petpay postgres-0 -- psql -U postgres -d petpay

# Probar conexión a PostgreSQL desde dentro del cluster
kubectl exec -it -n petpay deploy/identity -- \
  curl -s http://postgres.petpay.svc.cluster.local:5432
```

### Ver configuración de ingress

```bash
# Ver configuración NGINX dentro del pod
kubectl exec -n ingress-nginx deploy/ingress-nginx-controller -- \
  cat /etc/nginx/nginx.conf | grep -A 10 "petpay-ingress"
```

---

## 10. Limpieza Total

### Eliminar servicios y despliegues

```bash
# Eliminar todos los recursos de petpay namespace
kubectl delete all --all -n petpay

# Eliminar el namespace completo
kubectl delete namespace petpay

# Eliminar Ingress Controller
kubectl delete -f k8s/ingress-nginx-nodeport.yaml

# Eliminar namespace de ingress
kubectl delete namespace ingress-nginx
```

### Eliminar cluster Kind

```bash
# Listar clusters
kind get clusters

# Eliminar cluster
kind delete cluster --name petpay-dev

# Verificar eliminación
kind get clusters
```

### Eliminar imágenes Docker

```bash
# Eliminar imágenes del proyecto
docker rmi petpay/identity:latest
docker rmi petpay/marketplace:latest
docker rmi petpay/catalog:latest

# Eliminar imágenes sin tag
docker image prune -f

# Eliminar contenedores detenidos
docker container prune -f
```

### Eliminar archivos temporales

```bash
# Limpiar logs
rm -f /tmp/gateway.log
rm -f /tmp/identity.log
rm -f /tmp/marketplace.log
rm -f /tmp/catalog.log

# Limpiar configuraciones temporales
rm -f /tmp/kind-config.yaml
```

### Verificar limpieza completa

```bash
# Verificar que no hay recursos pendientes
kubectl get all --all-namespaces

# Verificar clusters Kind
kind get clusters

# Verificar imágenes Docker
docker images | grep petpay
```

---

## 11. Referencia Rápida - Comandos Útiles

### Comandos esenciales

```bash
# Iniciar cluster
kind create cluster --name petpay-dev --config kind-config.yaml

# Aplicar todos los manifests
kubectl apply -f k8s/base/

# Ver estado
kubectl get all -n petpay

# Ver logs
kubectl logs -n petpay deploy/identity -f

# Probar API Gateway
curl http://localhost:8080/auth/login

# Eliminar cluster
kind delete cluster --name petpay-dev
```

### Comandos de emergencia

```bash
# Reiniciar un deployment
kubectl rollout restart -n petpay deploy/identity

# Forzar eliminación de pod stuck
kubectl delete pod -n petpay <pod-name> --force --grace-period=0

# Escalar a 0 replicas
kubectl scale -n petpay deploy/identity --replicas=0

# Escalar a 3 replicas
kubectl scale -n petpay deploy/identity --replicas=3
```

### Variables de entorno útiles

```bash
# Exportar KUBECONFIG
export KUBECONFIG=~/.kube/config

# Obtener NodePort actual
export NODE_PORT=$(kubectl get svc ingress-nginx-controller -n ingress-nginx \
  -o jsonpath='{.spec.ports[?(@.name=="http")].nodePort}')

# Alias útiles
alias k="kubectl"
alias kgp="kubectl get pods -n petpay"
alias kgs="kubectl get svc -n petpay"
alias kgi="kubectl get ingress -n petpay"
alias klogs="kubectl logs -n petpay deploy/identity -f"
```

---

## 12. Solución de Problemas Comunes

### Problema: Pods no se inician

```bash
# Ver eventos
kubectl get events -n petpay --sort-by='.lastTimestamp'

# Ver describe del pod
kubectl describe pod -n petpay -l app=identity

# Ver logs de init containers si los hay
kubectl logs -n petpay deploy/identity -c <init-container-name>
```

### Problema: No puedo acceder a la API

```bash
# Verificar servicios
kubectl get svc -n petpay

# Verificar ingress
kubectl get ingress -n petpay

# Verificar NodePort
kubectl get svc ingress-nginx-controller -n ingress-nginx

# Probar desde dentro del cluster
kubectl exec -it deploy/identity -n petpay -- \
  curl -s http://identity:3000/health
```

### Problema: Base de datos no conecta

```bash
# Verificar PostgreSQL
kubectl get pods -n petpay -l app=postgres

# Ver logs de PostgreSQL
kubectl logs -n petpay postgres-0

# Probar conexión
kubectl exec -it postgres-0 -n petpay -- psql -U postgres -d petpay -c "SELECT 1"
```

---

## 📝 Notas Importantes

1. **Puertos reservados:**
   - `80`: Ingress Controller (requiere sudo o root)
   - `8080`: API Gateway local (recomendado para desarrollo)
   - `3000`: Identity Service directo
   - `8080`: Marketplace Service directo
   - `8081`: Catalog Service directo
   - `5432`: PostgreSQL (interno al cluster)

2. **Seguridad en desarrollo:**
   - ¡NUNCA commit contraseñas hardcodeadas!
   - Usa Kubernetes Secrets para datos sensibles
   - El script de API Gateway limpia las contraseñas en documentación

3. **Persistencia de datos:**
   - PostgreSQL usa PersistentVolumeClaim (PVC)
   - Los datos persisten si eliminas los pods
   - Para limpiar completamente, también elimina los PVCs

4. **Sincronización con Git:**
   - Los commits se crean con `sdd:new create-commits`
   - Usa `type(scope): description` como formato
   - Verifica que no haya secrets antes de commitear

---

## 🎯 Checklist de Verificación

- [ ] Kind instalado y funcionando
- [ ] Cluster creado correctamente
- [ ] Ingress Controller desplegado
- [ ] PostgreSQL corriendo y accesible
- [ ] Migraciones ejecutadas
- [ ] Servicios Identity, Marketplace, Catalog desplegados
- [ ] API Gateway activo y accesible
- [ ] Pruebas de login exitosas
- [ ] Pruebas de servicios completadas
- [ ] Logs verificados sin errores críticos

---

**Documento actualizado:** 10 de marzo de 2026
**Autor:** Luifer Dev - Petpay Team
**Versión:** 1.0
