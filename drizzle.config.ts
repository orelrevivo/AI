import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./app/lib/.server/db/schema.ts",
  out: "./drizzle", // where migration files will be generated
  dbCredentials: {
    url: process.env.NEON_NEON_DATABASE_URL!,
  },
});
