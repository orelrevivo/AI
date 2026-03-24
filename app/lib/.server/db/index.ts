import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

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
    console.error('CRITICAL: DATABASE_URL is missing!');
    throw new Error('DATABASE_URL is not defined in the environment variables. Please check your Vercel Dashboard Settings.');
  }

  const sql = neon(databaseUrl);
  dbInstance = drizzle(sql, { schema });

  return dbInstance;
};

// Legacy export for compatibility, but prefer using getDb()
export const db = new Proxy({} as any, {
  get(_, prop) {
    return (getDb() as any)[prop];
  },
});
