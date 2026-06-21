import type { StringValue } from 'ms';

export const jwtConstants = {
  secret: process.env.JWT_SECRET ?? 'fallback-dev-secret-change-me',
  expiresIn: (process.env.JWT_EXPIRES_IN ?? '1d') as StringValue,
};