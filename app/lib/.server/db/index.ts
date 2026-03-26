import { neon } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import crypto from 'node:crypto';

let dbInstance: NeonHttpDatabase<typeof schema> | null = null;

export const getDb = (): NeonHttpDatabase<typeof schema> => {
  if (dbInstance) {
    return dbInstance;
  }

  const databaseUrl = process.env.NEON_NEON_DATABASE_URL || process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('CRITICAL: NEON_NEON_DATABASE_URL is missing! Returning dummy proxy to prevent 500 crash.');

    const createRecursiveProxy = (name: string): any => {
      const proxy: any = new Proxy(() => { }, {
        get: (_target, prop) => {
          if (prop === 'then') return undefined;
          return createRecursiveProxy(`${name}.${String(prop)}`);
        },
        apply: (_target, _thisArg, _args) => {
          console.warn(`Database call ignored: ${name}() because NEON_NEON_DATABASE_URL is missing.`);

          if (name.endsWith('findMany') || name.endsWith('where') || name.endsWith('orderBy')) {
            return Promise.resolve([]);
          }
          if (name.endsWith('findFirst')) {
            return Promise.resolve(null);
          }
          if (name.endsWith('returning')) {
            return Promise.resolve([{ id: crypto.randomUUID() }]);
          }

          return {
            values: () => createRecursiveProxy(`${name}.values`),
            set: () => createRecursiveProxy(`${name}.set`),
            where: () => createRecursiveProxy(`${name}.where`),
            orderBy: () => createRecursiveProxy(`${name}.orderBy`),
            returning: () => Promise.resolve([{ id: crypto.randomUUID() }]),
            onConflictDoNothing: () => Promise.resolve({ rows: [] }),
            onConflictDoUpdate: () => Promise.resolve({ rows: [] }),
            execute: () => Promise.resolve({ rows: [] }),
            then: (resolve: any) => resolve([]),
          };
        },
      });
      return proxy;
    };

    return createRecursiveProxy('db');
  }

  const sql = neon(databaseUrl);
  dbInstance = drizzle(sql, { schema });

  return dbInstance;
};

// Global "db" object that always finds the connection safely
export const db = new Proxy({} as any, {
  get(_, prop) {
    const instance = getDb();
    return (instance as any)[prop];
  },
}) as NeonHttpDatabase<typeof schema>;
