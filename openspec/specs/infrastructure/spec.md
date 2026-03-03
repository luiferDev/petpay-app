# Infrastructure Specification

## Overview

This specification defines the Kubernetes deployment infrastructure for the petpay-app microservices platform.

## ADDED Requirements

### Requirement: Container Orchestration

The Kubernetes cluster MUST provide automated container orchestration for all petpay-app microservices (Identity, Marketplace, Catalog).

#### Scenario: Service deployment succeeds

- GIVEN a configured Kubernetes cluster with kubectl access
- WHEN applying the base Kustomize configuration
- THEN all 3 microservices SHOULD be deployed with 2 replicas each
- AND all services SHOULD have running pods in Ready state

#### Scenario: Pod restart maintains availability

- GIVEN a running microservice with 2 replicas
- WHEN one pod is terminated (simulating failure)
- THEN the second pod MUST continue serving requests
- AND the replication controller SHOULD create a replacement pod

### Requirement: Service Networking

All microservices MUST be accessible via Kubernetes Services with proper internal DNS resolution.

#### Scenario: Inter-service communication

- GIVEN Identity service needs to connect to PostgreSQL
- WHEN the service uses the DNS name `postgres.petpay.svc.cluster.local`
- THEN the connection MUST resolve to the PostgreSQL pod
- AND database queries SHOULD succeed

#### Scenario: External access through Ingress

- GIVEN an external client sends HTTP request to the Ingress
- WHEN the request matches `/api/v1/auth/*`
- THEN the request MUST be routed to the Identity service
- AND the response SHOULD be returned to the client

### Requirement: Load Balancing

The system MUST distribute incoming traffic across service replicas with rate limiting protection.

#### Scenario: Traffic distribution

- GIVEN multiple concurrent requests to a service endpoint
- WHEN requests arrive at the Ingress controller
- THEN requests MUST be distributed using round-robin algorithm
- AND each replica SHOULD receive approximately equal traffic

#### Scenario: Rate limiting enforced

- GIVEN a client exceeding 50 requests per second
- WHEN the rate limit threshold is exceeded
- THEN excess requests MUST return HTTP 429 (Too Many Requests)
- AND the limit-connections annotation MUST cap at 100 concurrent connections

### Requirement: Health Monitoring

All containerized services MUST expose health endpoints for Kubernetes probes.

#### Scenario: Liveness probe failure

- GIVEN a container becomes unresponsive
- WHEN the liveness probe fails 3 consecutive times
- THEN Kubernetes MUST restart the pod
- AND a new pod SHOULD be created to replace it

#### Scenario: Readiness probe controls traffic

- GIVEN a pod starting up with initialization tasks
- WHEN the readiness probe has not yet passed
- THEN the pod MUST NOT receive traffic from the service
- AND once ready, traffic SHOULD immediately start flowing

### Requirement: Persistent Storage

The PostgreSQL database MUST retain data across pod restarts using persistent volumes.

#### Scenario: Database pod restart

- GIVEN PostgreSQL StatefulSet with persistent volume
- WHEN the postgres pod is restarted
- THEN all previously stored data MUST remain intact
- AND the volume claim MUST be reattached to the new pod

### Requirement: Environment Configuration

All services MUST receive configuration via ConfigMaps and secrets injection.

#### Scenario: ConfigMap values available

- GIVEN a ConfigMap with environment variables
- WHEN the pod starts with envFrom configMapRef
- THEN all defined variables MUST be available in the container
- AND changes to ConfigMap SHOULD be reflected on next deployment

#### Scenario: Secrets injection

- GIVEN a Secret containing database credentials
- WHEN the pod references the secret via secretKeyRef
- THEN the secret value MUST be mounted as an environment variable
- AND the secret MUST NOT be exposed in pod specs or logs

### Requirement: Resource Management

All containers MUST define resource requests and limits for CPU and memory.

#### Scenario: Resource limit enforcement

- GIVEN a container with memory limit of 512Mi
- WHEN the process attempts to exceed this limit
- THEN the container MUST be terminated (OOM killed)
- AND the system MUST log the out-of-memory event

### Requirement: Rolling Updates

The system MUST support zero-downtime deployments using rolling update strategy.

#### Scenario: Image update deployment

- GIVEN a deployment with image tag `latest`
- WHEN the image is updated in the manifest
- THEN pods MUST be updated incrementally (maxSurge: 25%)
- AND at least 75% of replicas SHOULD remain available during update

### Requirement: Deployment Method

The deployment method changes from standalone processes to containerized orchestration.

(Previously: Services ran as standalone processes with manual deployment)

- GIVEN the original petpay-app monorepo structure
- WHEN transitioning to Kubernetes
- THEN all services MUST be containerized with Dockerfiles
- AND deployment artifacts MUST be Kubernetes manifests

### Requirement: Manual Scaling

Manual horizontal scaling is replaced by Kubernetes HPA.

(Reason: Kubernetes handles scaling automatically based on replicas configured)

- GIVEN previous manual scaling process
- WHEN services need more capacity
- THEN replicas SHOULD be adjusted via Kustomize overlays
- AND HorizontalPodAutoscaler can be added in future for auto-scaling

### Requirement: Manual Service Discovery

Static service URLs are replaced by Kubernetes DNS.

(Reason: Kubernetes provides service discovery via cluster DNS)

- GIVEN previous hardcoded service URLs
- WHEN services communicate internally
- THEN they MUST use Kubernetes service names
- AND external configuration MUST NOT be required for inter-service communication
