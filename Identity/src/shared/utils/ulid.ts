// ulid.ts

const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const ENCODING_LEN = 32
const TIME_LEN = 10
const RANDOM_LEN = 16

let lastTime = 0
// Inicializar lastRandom como un array de números para mantener el tipo
let lastRandom: number[] = []

/**
 * Genera un ULID (Universally Unique Lexicographically Sortable Identifier).
 * Si se llama en el mismo milisegundo, incrementa la parte random para mantener el orden.
 */
export const generateULID = (): string => {
  const now = Date.now()
  let randomPart: number[] = []

  if (now === lastTime) {
    // Caso de colisión: Incrementar random para mantener orden
    randomPart = lastRandom

    for (let i = RANDOM_LEN - 1; i >= 0; i--) {
      // ⚠️ Corrección: Asegura que el valor en el índice no es null/undefined antes de comparar
      const currentValue = randomPart[i] ?? 0

      if (currentValue === ENCODING_LEN - 1) {
        randomPart[i] = 0
      } else {
        // ⚠️ Corrección: Usar nullish coalescing para asegurar que sea un número antes de sumar
        // randomPart[i] = (randomPart[i] ?? 0) + 1;
        randomPart[i] = currentValue + 1 // Ya que currentValue ya maneja el caso undefined
        break
      }
    }
  } else {
    // Caso normal: Generar nuevo random
    lastTime = now
    randomPart = Array.from({ length: RANDOM_LEN }, () =>
      Math.floor(Math.random() * ENCODING_LEN)
    )
  }

  // Actualizar la variable estática solo al final
  lastRandom = randomPart

  // ⚠️ Corrección: Eliminar la concatenación directa (+) si hay posibilidad de undefined (Aunque Bun/TS lo infiere)
  // Pero lo manejamos tipando correctamente las funciones
  return encodeTime(now) + encodeRandom(randomPart)
}

/**
 * Codifica la parte del tiempo (48 bits) en 10 caracteres de base32.
 * @param time Tiempo en milisegundos (Date.now()).
 */
const encodeTime = (time: number): string => {
  let str = ''
  for (let i = TIME_LEN - 1; i >= 0; i--) {
    str = (ENCODING[time % ENCODING_LEN] ?? '') + str
    time = Math.floor(time / ENCODING_LEN)
  }
  return str
}

/**
 * Codifica la parte aleatoria (80 bits) en 16 caracteres de base32.
 * @param random Array de números pre-generados.
 */
const encodeRandom = (random: number[]): string => {
  // El tipado number[] aquí asegura que 'n' es un número, resolviendo el problema de '+'.
  return random.map(n => ENCODING[n]).join('')
}
