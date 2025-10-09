const ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const ENCODING_LEN = 32;
const TIME_MAX = Math.pow(2, 48) - 1;
const TIME_LEN = 10;
const RANDOM_LEN = 16;

let lastTime = 0;
let lastRandom: number[] = [];

export const generateULID = (): string => {
    const now = Date.now();
    
    if (now === lastTime) {
        // Incrementar random para mantener orden
        for (let i = RANDOM_LEN - 1; i >= 0; i--) {
            if (lastRandom[i] === ENCODING_LEN - 1) {
                lastRandom[i] = 0;
            } else {
                lastRandom[i] = (lastRandom[i] || 0) + 1;
                break;
            }
        }
    } else {
        lastTime = now;
        // Generar nuevo random
        lastRandom = Array.from({ length: RANDOM_LEN }, () => 
            Math.floor(Math.random() * ENCODING_LEN)
        );
    }

    return encodeTime(now) + encodeRandom(lastRandom);
};

const encodeTime = (time: number): string => {
    let str = "";
    for (let i = TIME_LEN - 1; i >= 0; i--) {
        str = ENCODING[time % ENCODING_LEN] + str;
        time = Math.floor(time / ENCODING_LEN);
    }
    return str;
};

const encodeRandom = (random: number[]): string => {
    return random.map(n => ENCODING[n]).join("");
};