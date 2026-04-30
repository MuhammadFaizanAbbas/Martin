import fs from 'node:fs';
import path from 'node:path';

let cachedDotEnv = null;

function parseDotEnv(content) {
  const values = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key) values[key] = value;
  }

  return values;
}

function getDotEnv() {
  if (cachedDotEnv) return cachedDotEnv;

  try {
    const envPath = path.join(process.cwd(), '.env');
    cachedDotEnv = parseDotEnv(fs.readFileSync(envPath, 'utf8'));
  } catch {
    cachedDotEnv = {};
  }

  return cachedDotEnv;
}

export function getEnvValue(...names) {
  const dotEnv = getDotEnv();

  for (const name of names) {
    const value = process.env[name] || dotEnv[name];
    if (String(value || '').trim()) return String(value).trim();
  }

  return '';
}

export function getServiceRole() {
  return getEnvValue('SERVICE_ROLE', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE');
}
