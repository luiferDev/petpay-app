#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Petpay App - Build & Deploy Script${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo -e "${YELLOW}Warning: kubectl is not installed - skipping K8s deploy${NC}"
fi

# Default values
REGISTRY="petpay"
TAG="latest"
ENV="dev"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --registry)
            REGISTRY="$2"
            shift 2
            ;;
        --tag)
            TAG="$2"
            shift 2
            ;;
        --env)
            ENV="$2"
            shift 2
            ;;
        --skip-docker)
            SKIP_DOCKER=true
            shift
            ;;
        --skip-k8s)
            SKIP_K8S=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --registry     Docker registry (default: petpay)"
            echo "  --tag          Image tag (default: latest)"
            echo "  --env          Environment: dev|prod (default: dev)"
            echo "  --skip-docker  Skip Docker build"
            echo "  --skip-k8s     Skip Kubernetes deploy"
            echo "  --help         Show this help"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Build Docker images
if [ "$SKIP_DOCKER" != "true" ]; then
    echo -e "${GREEN}Building Docker images...${NC}"
    
    # Build Identity
    echo -e "${YELLOW}Building Identity service...${NC}"
    docker build -t $REGISTRY/identity:$TAG ./Identity
    
    # Build Marketplace
    echo -e "${YELLOW}Building Marketplace service...${NC}"
    docker build -t $REGISTRY/marketplace:$TAG ./marketplace
    
    # Build Catalog
    echo -e "${YELLOW}Building Catalog service...${NC}"
    docker build -t $REGISTRY/catalog:$TAG ./catalog-&-offers
    
    echo -e "${GREEN}Docker images built successfully!${NC}"
else
    echo -e "${YELLOW}Skipping Docker build${NC}"
fi

# Deploy to Kubernetes
if [ "$SKIP_K8S" != "true" ] && command -v kubectl &> /dev/null; then
    echo -e "${GREEN}Deploying to Kubernetes ($ENV)...${NC}"
    
    # Check if kustomize is available
    if command -v kustomize &> /dev/null; then
        kubectl apply -k k8s/overlays/$ENV
    else
        echo -e "${YELLOW}Kustomize not found, using kubectl apply directly${NC}"
        kubectl apply -f k8s/base/
    fi
    
    echo -e "${GREEN}Kubernetes deployment complete!${NC}"
    
    # Show status
    echo -e "${GREEN}Deployment status:${NC}"
    kubectl get pods -n petpay-$ENV
else
    echo -e "${YELLOW}Skipping Kubernetes deploy${NC}"
fi

echo -e "${GREEN}Done!${NC}"
