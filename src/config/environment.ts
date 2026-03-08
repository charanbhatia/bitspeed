export interface EnvironmentConfig {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function loadEnvironment(): EnvironmentConfig {
  return {
    NODE_ENV: process.env['NODE_ENV'] ?? 'development',
    PORT: parseInt(process.env['PORT'] ?? '3000', 10),
    DATABASE_URL: requireEnv('DATABASE_URL'),
  };
}
