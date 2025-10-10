# identity

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.23. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

## Archivo .env

Se debe crear el archivo .env para poner las variables de entorno con las siguienes variables:

DATABASE_URL=postgresql://usuario:password@localhost:5432/petpay-users
DB_USER=usuario
DB_PASSWORD=password
DB_NAME=petpay-users
PORT=puerto

todo debe coincidir para evitar confictos

## Se está usando drizzle ORM y postgresql

para generar migraciones

> [!Important]
> Antes de usar docker es importante usar este comando para generar las migraciones debido a que no es posible hacerlo desde docker, solo ejecuta ese comando para generar la carpeta drizzle que es la que contiene el SQL necesario para ejecutar la migración

```
npx drizzle-kit generate
```

y para aplicarlas

```
npx drizzle-kit migrate
```

## Docker
Trabajando en modo watch
para que la imagen siga en tiempo real las modificaciones

```
docker compose up --build --watch
```
> [!Important]
> Se deben ejecutar las migraciones con el siguiente comando:

```
docker exec -it auth-microservice-db bun migrate.ts
```

## Si tu quieres consultar tu base de datos postgres en el contenedor

> [!Note]
> Usar los mismos que usaste en el archivo .env

```
docker exec -it auth-microservice-db psql -U <DB_USER> -d <DB_NAME>
```

dentro del contenedor ejecutar los comandos:

- \dt ->	Lista todas las tablas en el schema actual (generalmente public).	`Schema
- \d -> nombre_tabla	Describe la estructura de una tabla específica. Muestra columnas, tipos de datos, índices, y restricciones.	`Column
- \q ->	Salir del cliente psql y volver a la terminal de tu host.	