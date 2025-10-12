import { createLogger, format, transports } from 'winston'
import type { TransformableInfo } from 'logform'

const { combine, timestamp, printf, colorize } = format

// Formato personalizado
const myFormat = printf((info: TransformableInfo): string => {
  const { level, message, timestamp, stack } = info

  // Convertimos level y message a string de forma segura.
  const levelStr = String(level)
  const messageStr = String(message)

  // 💡 CORRECCIÓN 1 (Línea 19:20): Se usa una verificación explícita de null/undefined (nullish check)
  // en lugar de depender de la 'truthiness' de la variable 'stack', que es de tipo desconocido.
  const stackStr = (stack != null) ? String(stack) : ''

  // 💡 CORRECCIÓN 2 (Línea 25:62): Se usa una comparación numérica explícita (length > 0)
  // en lugar de la comparación de cadena (stackStr !== '') para satisfacer la regla estricta.
  const shouldPrintStack = stackStr.length > 0

  return `${String(timestamp)} [${levelStr}]: ${messageStr}${shouldPrintStack ? '\n' + stackStr : ''}`
})

export const logger = createLogger({
  // 💡 CORRECCIÓN 3: Si 'process.env.NODE_ENV' no existe, le damos un valor por defecto ('development')
  // para que la comparación sea segura, aunque la regla se aplica a la condición de 'stack'.
  level: (process.env.NODE_ENV ?? 'development') === 'production' ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }), // Para logs de errores completos
    myFormat
  ),
  transports: [
    // 1. Logs a la Consola
    new transports.Console({
      format: combine(
        colorize(), // Colores en la consola
        myFormat
      )
    })
    // 2. Logs a Archivos (ej. para producción)
    // new transports.File({ filename: 'logs/error.log', level: 'error' }),
    // new transports.File({ filename: 'logs/combined.log' })
  ]
})
