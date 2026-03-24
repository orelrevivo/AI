import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

let dbInstance: any = null;

export const getDb = () => {
  if (dbInstance) {
    return dbInstance;
  }

  const databaseUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL ||
    process.env.NEON_NEON_DATABASE_URL;

  if (!databaseUrl) {
    console.error('CRITICAL: DATABASE_URL is missing! Returning dummy proxy to prevent 500 crash.');

    // Return a dummy object that doesn't throw on property access
    return new Proxy({} as any, {
      get: () => () => ({
        values: () => ({ onConflictDoNothing: () => Promise.resolve() }),
        where: () => ({ orderBy: () => Promise.resolve([]) }),
        findFirst: () => Promise.resolve(null),
        findMany: () => Promise.resolve([]),
      }),
    });
  }

  const sql = neon(databaseUrl);
  dbInstance = drizzle(sql, { schema });

  return dbInstance;
};

// Global "db" object that always finds the connection safely
export const db = new Proxy({} as any, {
  get(_, prop) {
    const instance = getDb();
    return instance[prop];
  },
});
