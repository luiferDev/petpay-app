#!/bin/bash
# ============================================
# PETPAY API GATEWAY - DEVELOPMENT ENVIRONMENT
# ============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
cat << 'EOF'
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║   ██████╗ ███████╗███╗   ██╗██╗ ██████╗██╗     ██╗███████╗██████╗║
║   ██╔══██╗██╔════╝████╗  ██║██║██╔════╝██║     ██║██╔════╝██╔══██║
║   ██║  ██║█████╗  ██╔██╗ ██║██║██║     ██║     ██║███████╗██████╔╝
║   ██║  ██║██╔══╝  ██║╚██╗██║██║██║     ██║     ██║╚════██║██╔══██╗
║   ██████╔╝███████╗██║ ╚████║██║╚██████╗███████╗██║███████║██║  ██║
║   ╚═════╝ ╚══════╝╚═╝  ╚═══╝╚═╝ ╚═════╝╚══════╝╚═╝╚══════╝╚═╝  ╚═╝
║                                                                  ║
║   API Gateway - Development Environment                          ║
╚══════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Check kubectl
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌ kubectl not found${NC}"
    exit 1
fi

# Check cluster
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}❌ Kubernetes cluster not accessible${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Kubernetes cluster connected"
echo ""

# Check gateway is running
GATEWAY_PORT=8080
if ! curl -s http://localhost:${GATEWAY_PORT}/auth/login > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Gateway not detected on port ${GATEWAY_PORT}, starting...${NC}"
    
    # Kill existing port-forward
    pkill -f "port-forward.*8080" 2>/dev/null || true
    sleep 1
    
    # Start gateway
    nohup kubectl port-forward --address 0.0.0.0 -n ingress-nginx svc/ingress-nginx-controller ${GATEWAY_PORT}:80 > /tmp/gateway.log 2>&1 &
    sleep 3
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  🚀 API Gateway Endpoints${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  Base URL: ${GREEN}http://localhost:${GATEWAY_PORT}${NC}"
echo ""
echo -e "${YELLOW}🔐 Identity Service:${NC}"
echo "  • POST /auth/login          → Login"
echo "  • POST /auth/register       → Register user"
echo "  • POST /auth/refresh        → Refresh token"
echo "  • GET  /api/v1/users/:id    → Get user by ID"
echo ""
echo -e "${YELLOW}🛒 Marketplace Service:${NC}"
echo "  • GET  /api/v1/orders       → List orders"
echo "  • POST /api/v1/orders       → Create order"
echo "  • GET  /api/v1/orders/:id   → Get order by ID"
echo "  • GET  /api/v1/payments     → List payments"
echo ""
echo -e "${YELLOW}📦 Catalog Service:${NC}"
echo "  • GET  /api/v1/products     → List products"
echo "  • GET  /api/v1/products/:id → Get product by ID"
echo "  • GET  /api/v1/categories   → List categories"
echo "  • GET  /api/v1/services     → List services"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test connectivity
echo -e "${YELLOW}Testing connectivity...${NC}"
echo ""

echo -n "  Identity service: "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST -H "Content-Type: application/json" \
  -d '{"email":"luifer991+test544@gmail.com","password":"***"}' \
  http://localhost:${GATEWAY_PORT}/auth/login 2>/dev/null)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ ONLINE${NC}"
else
    echo -e "${RED}✗ OFFLINE (HTTP $HTTP_CODE)${NC}"
fi

echo -n "  Marketplace service: "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  http://localhost:${GATEWAY_PORT}/api/v1/orders 2>/dev/null)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ ONLINE${NC}"
else
    echo -e "${RED}✗ OFFLINE (HTTP $HTTP_CODE)${NC}"
fi

echo -n "  Catalog service:     "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  "http://localhost:${GATEWAY_PORT}/api/v1/products" 2>/dev/null)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ ONLINE${NC}"
else
    echo -e "${YELLOW}⚠ PARTIAL (HTTP $HTTP_CODE)${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Show commands
echo -e "${YELLOW}📝 Quick Commands:${NC}"
echo ""
echo -e "  # Test login"
echo -e "  ${GREEN}curl -X POST http://localhost:${GATEWAY_PORT}/auth/login \\"
echo -e "    -H 'Content-Type: application/json' \\"
echo -e "    -d '{\"email\":\"luifer991+test544@gmail.com\",\"password\":\"***\"}'${NC}"
echo ""
echo -e "  # Get orders"
echo -e "  ${GREEN}curl http://localhost:${GATEWAY_PORT}/api/v1/orders${NC}"
echo ""
echo -e "  # Get products"
echo -e "  ${GREEN}curl http://localhost:${GATEWAY_PORT}/api/v1/products${NC}"
echo ""
echo -e "  # View logs"
echo -e "  ${GREEN}kubectl logs -n petpay deploy/identity --tail=20 -f${NC}"
echo ""
echo -e "  # Restart service"
echo -e "  ${GREEN}kubectl rollout restart -n petpay deploy/identity${NC}"
echo ""

# Optional commands
if [ "$1" = "--logs" ]; then
    echo -e "${YELLOW}Starting logs (Ctrl+C to stop)...${NC}"
    echo ""
    kubectl logs -n petpay deploy/identity --tail=10 -f
fi

if [ "$1" = "--watch" ]; then
    echo -e "${YELLOW}Watching pods and logs (Ctrl+C to stop)...${NC}"
    echo ""
    watch -n 2 "kubectl get pods -n petpay && echo '' && kubectl logs -n petpay deploy/identity --tail=5 2>/dev/null"
fi

if [ "$1" = "--test" ]; then
    echo -e "${YELLOW}Running comprehensive tests...${NC}"
    echo ""
    
    echo "1. Testing login..."
    curl -s -X POST http://localhost:${GATEWAY_PORT}/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email":"luifer991+test544@gmail.com","password":"***"}' | jq . 2>/dev/null || \
    curl -s -X POST http://localhost:${GATEWAY_PORT}/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email":"luifer991+test544@gmail.com","password":"***"}'
    
    echo ""
    echo "2. Testing products..."
    curl -s "http://localhost:${GATEWAY_PORT}/api/v1/products?category=pets" | head -c 200
    echo ""
fi
