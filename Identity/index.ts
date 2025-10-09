import express, { Request, Response } from 'express';

// 1. Inicializar la aplicación Express
const app = express();
const PORT = 3000;

// Middleware para parsear JSON (opcional pero recomendado)
app.use(express.json());

// 2. Definir una ruta simple
app.get('/', (req: Request, res: Response) => {
    res.send('¡Hola desde Express y Bun! 🚀');
});

// 3. Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor Express corriendo en http://localhost:${PORT}`);
});
