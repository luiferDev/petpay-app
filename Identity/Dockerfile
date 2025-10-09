# Usa la imagen oficial de Bun como base.
FROM oven/bun:latest

# Establece el directorio de trabajo dentro del contenedor.
WORKDIR /app
RUN bun init -y
# Copia los archivos de configuración de Bun y el package.json.
COPY package.json ./
COPY bun.lock ./

# Instala las dependencias del proyecto usando Bun.
RUN bun install

# Copia el resto del código de tu aplicación al directorio de trabajo.
COPY . .

# Expone el puerto en el que la aplicación Express estará escuchando.
EXPOSE 3000

# Define el ENTRYPOINT: Siempre se ejecutará `bun run`.
# Esto hace que la imagen sea más versátil; puedes pasarle el script como CMD.
ENTRYPOINT [ "bun", "run" ]

# Define el CMD: Son los argumentos predeterminados para el ENTRYPOINT.
# Si no se especifican argumentos al ejecutar docker run, se usará "start".
CMD [ "start" ]
