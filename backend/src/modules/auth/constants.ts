import 'dotenv/config';

const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32) {
  throw new Error(
    'JWT_SECRET zaroori hai aur kam se kam 32 characters ka hona chahiye. '
  );
}

const refreshSecret = process.env.JWT_REFRESH_SECRET;
if (!refreshSecret || refreshSecret.length < 32) {
  throw new Error('JWT_REFRESH_SECRET zaroori hai');
}

export const jwtConstants = {
  secret,
  expiresIn: process.env.JWT_ACCESS_EXPIRES ?? '15m',      // access ab short
  refreshSecret,
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES ?? '7d',
};