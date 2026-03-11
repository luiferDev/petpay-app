FROM krakend:2.13

# Por defecto usa configuración con JWT (desarrollo y producción)
# Para deshabilitar JWT, usar versión sin auth
COPY krakend.json /etc/krakend/krakend.json
COPY krakend-prod.json /etc/krakend/krakend-prod.json

# Por defecto ejecuta con JWT habilitado
CMD ["krakend", "run", "-d", "-c", "/etc/krakend/krakend.json", "-p", "8080"]
