import express, { type Request, type Response } from 'express';
import 'dotenv/config';

// 1. Inicializar la aplicación Express
const app = express();
const PORT = 3000;

// Middleware para parsear JSON (opcional pero recomendado)
app.use(express.json());
app.disable('x-powered-by');

app.get('/', (req: Request, res: Response) => {
    res.send('¡Hola desde Express y Bun! 🚀');
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor Express corriendo en http://localhost:${PORT}`);
});
