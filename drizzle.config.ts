import { defineConfig } from "drizzle-kit";

const dbUrl = process.env.DATABASE_URL_OVERRIDE || process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

const isExternal =
  !dbUrl.includes("localhost") && !dbUrl.includes("127.0.0.1");

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
    ssl: isExternal ? "require" : false,
  },
});
