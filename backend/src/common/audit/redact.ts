const SENSITIVE_KEYS = [
  'password', 'newPassword', 'currentPassword',
  'passwordHash', 'refreshTokenHash', 'token',
];

export function redactBody(body: any): any {
  if (!body || typeof body !== 'object') return body;
  const clone = { ...body };
  for (const key of SENSITIVE_KEYS) {
    if (key in clone) {
      clone[key] = '[REDACTED]';
    }
  }
  return clone;
}