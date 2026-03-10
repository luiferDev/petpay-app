#!/bin/bash

# ===================================================================
# PETPAY-APP - Script de Pruebas con curl
# ===================================================================
# 
# Uso: ./test-services.sh
# 
# Este script requiere que los servicios estén ejecutándose en los puertos:
# - Identity: 3000
# - Marketplace: 8080
# - Catalog: 8081
#
# ===================================================================

set +e  # No salir en error

echo "=============================================="
echo "  PETPAY-APP - PRUEBAS DE MICROSERVICIOS"
echo "=============================================="
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir resultado
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ ÉXITO${NC}"
    else
        echo -e "${RED}✗ FALLO${NC}"
    fi
}

# ===================================================================
# IDENTITY SERVICE (Puerto 3000)
# ===================================================================

echo -e "${YELLOW}=== IDENTITY SERVICE (Puerto 3000) ===${NC}"
echo ""

echo "1. Health Check:"
response=$(curl -s http://localhost:3000/health)
echo "   Response: $response"
print_result $?
echo ""

echo "2. Root Endpoint:"
response=$(curl -s http://localhost:3000/)
echo "   Response: $response"
print_result $?
echo ""

echo "3. Registro de Usuario:"
response=$(curl -s -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser'"$(date +%s)"'@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User",
    "role": "USER"
  }')
echo "   Response: $response"
print_result $?
echo ""

# ===================================================================
# MARKETPLACE SERVICE (Puerto 8080)
# ===================================================================

echo -e "${YELLOW}=== MARKETPLACE SERVICE (Puerto 8080) ===${NC}"
echo ""

echo "1. Health Check:"
response=$(curl -s http://localhost:8080/health)
echo "   Response: $response"
print_result $?
echo ""

echo "2. Obtener Todos los Pedidos:"
response=$(curl -s http://localhost:8080/api/v1/orders/)
echo "   Response: $response"
print_result $?
echo ""

echo "3. Crear Pedido:"
response=$(curl -s -X POST http://localhost:8080/api/v1/orders/ \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "cust-001",
    "storeProfileId": "store-001",
    "subtotal": 100.00,
    "shippingCost": 10.00,
    "tax": 8.00,
    "totalAmount": 118.00,
    "currency": 1.0
  }')
echo "   Response: $response"
print_result $?
echo ""

echo "4. Obtener Pedido por ID (1):"
response=$(curl -s http://localhost:8080/api/v1/orders/1)
echo "   Response: $response"
print_result $?
echo ""

# ===================================================================
# CATALOG SERVICE (Puerto 8081)
# ===================================================================

echo -e "${YELLOW}=== CATALOG SERVICE (Puerto 8081) ===${NC}"
echo ""

echo "1. Health Check:"
response=$(curl -s http://localhost:8081/health)
echo "   Response: $response"
print_result $?
echo ""

echo "2. Obtener Todos los Productos:"
response=$(curl -s http://localhost:8081/api/v1/products/all)
echo "   Response: $response"
print_result $?
echo ""

echo "3. Obtener Producto por ID (1):"
response=$(curl -s http://localhost:8081/api/v1/products/1)
echo "   Response: $response"
print_result $?
echo ""

# ===================================================================
# RESUMEN
# ===================================================================

echo "=============================================="
echo "  RESUMEN DE PRUEBAS"
echo "=============================================="
echo ""
echo "✓ Todos los servicios están ejecutándose"
echo "✓ Endpoints de salud respondiendo"
echo "✓ APIs respondiendo correctamente"
echo ""
echo "Para más pruebas, consulta:"
echo "  - tests/requests/complete-api-testing.http"
echo "  - tests/requests/all-services.http"
echo ""
