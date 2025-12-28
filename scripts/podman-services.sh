#!/bin/bash

# Podman service management script for Lawsphere

NETWORK="lawsphere-network"

start_services() {
    echo "Starting Lawsphere services with Podman..."
    
    # Create network if not exists
    podman network create $NETWORK 2>/dev/null || true
    
    # PostgreSQL with pgvector
    podman run -d --name lawsphere-postgres \
        --network $NETWORK \
        -e POSTGRES_USER=lawsphere \
        -e POSTGRES_PASSWORD=lawsphere_secret \
        -e POSTGRES_DB=lawsphere \
        -p 5432:5432 \
        -v lawsphere-postgres-data:/var/lib/postgresql/data \
        pgvector/pgvector:pg16
    
    # Redis
    podman run -d --name lawsphere-redis \
        --network $NETWORK \
        -e REDIS_PASSWORD=redis_secret \
        -p 6379:6379 \
        redis:7-alpine redis-server --requirepass redis_secret
    
    # MinIO (S3-compatible storage)
    podman run -d --name lawsphere-minio \
        --network $NETWORK \
        -e MINIO_ROOT_USER=lawsphere \
        -e MINIO_ROOT_PASSWORD=lawsphere_secret \
        -p 9000:9000 \
        -p 9001:9001 \
        -v lawsphere-minio-data:/data \
        minio/minio:latest server /data --console-address ":9001"
    
    echo "Services started!"
    podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

stop_services() {
    echo "Stopping Lawsphere services..."
    podman stop lawsphere-postgres lawsphere-redis lawsphere-minio 2>/dev/null
    podman rm lawsphere-postgres lawsphere-redis lawsphere-minio 2>/dev/null
    echo "Services stopped!"
}

status() {
    podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep lawsphere || echo "No services running"
}

logs() {
    local service=$1
    if [ -z "$service" ]; then
        echo "Usage: $0 logs <postgres|redis|minio>"
        exit 1
    fi
    podman logs -f lawsphere-$service
}

case "$1" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        stop_services
        start_services
        ;;
    status)
        status
        ;;
    logs)
        logs $2
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs <service>}"
        exit 1
        ;;
esac
