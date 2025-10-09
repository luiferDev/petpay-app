import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

let db: ReturnType<typeof drizzle> | null = null;
let pool: Pool | null = null;

export const getDatabase = () => {
    if (!db) {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL!,
        });
        db = drizzle({ client: pool });
    }
    return db;
};

export const closeDatabase = async () => {
    if (pool) {
        await pool.end();
        pool = null;
        db = null;
    }
};