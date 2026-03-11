FROM krakend:2.13 AS builder

# Instalar jq para procesamiento de configuración
RUN apk add --no-cache jq

# Por defecto usar configuración de desarrollo
ARG ENVIRONMENT=dev
ENV ENVIRONMENT=${ENVIRONMENT}

# Copiar configuraciones
COPY krakend.json /etc/krakend/krakend.json
COPY krakend-dev.json /etc/krakend/krakend-dev.json
COPY krakend-prod.json /etc/krakend/krakend-prod.json

# Ejecutar con la configuración apropiada
CMD ["sh", "-c", "if [ \"$ENVIRONMENT\" = \"prod\" ]; then cp /etc/krakend/krakend-prod.json /etc/krakend/krakend.json; fi && krakend run -d -c /etc/krakend/krakend.json -p 8080"]
