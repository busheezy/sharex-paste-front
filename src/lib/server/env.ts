import { building } from "$app/environment";
import { env as privateEnv } from "$env/dynamic/private";
import { z } from "zod";

const envSchema = z.object({
  BACKEND_API_URL: z.url(),
});

const fallbackApiUrl = building ? "http://localhost:3000" : undefined;

export const env = envSchema.parse({
  BACKEND_API_URL: privateEnv.BACKEND_API_URL ?? fallbackApiUrl,
});
