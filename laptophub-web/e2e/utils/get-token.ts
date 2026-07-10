import fs from 'fs';
import path from 'path';

export function getAdminToken(): string {
  const filePath = path.join(process.cwd(), 'e2e/.auth/admin.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  const state = JSON.parse(raw);
  const origin = state.origins.find(
    (o: any) => o.origin === 'http://localhost:3001'
  );
  const item = origin.localStorage.find((i: any) => i.name === 'accessToken');
  return item.value;
}