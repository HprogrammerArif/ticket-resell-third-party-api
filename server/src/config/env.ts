import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(8000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  TN_CONSUMER_KEY: z.string().min(1, 'TN_CONSUMER_KEY is required'),
  TN_CONSUMER_SECRET: z.string().min(1, 'TN_CONSUMER_SECRET is required'),
  TN_WCID: z.coerce.number().default(12498),
  TN_BASE_URL: z.string().default('https://sandbox.tn-apis.com/catalog/v2'),
  TN_TOKEN_URL: z.string().default('https://key-manager.tn-apis.com/oauth2/token'),
  TN_REVOKE_URL: z.string().default('https://key-manager.tn-apis.com/oauth2/revoke'),

  // Optional on purpose. Without it the Ticketmaster branch is skipped and
  // imagery resolves through Wikimedia exactly as it did before, which is both
  // the local default and the automatic degradation if the key is withdrawn.
  TICKETMASTER_API_KEY: z.string().optional(),
});

const result = envSchema.safeParse(process.env);
if (!result.success) {
  console.error('Invalid environment variables:', result.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = result.data;
export type Env = typeof result.data;
