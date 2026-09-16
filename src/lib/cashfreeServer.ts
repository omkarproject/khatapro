import fs from 'fs';
import path from 'path';

export interface CashfreeConfig {
  appId: string;
  secretKey: string;
  env: 'sandbox' | 'production';
}

declare global {
  // eslint-disable-next-line no-var
  var __cashfree_config: CashfreeConfig | undefined;
}

function getConfigPath(): string {
  try {
    if (process.platform !== 'win32') {
      return '/tmp/cashfree_config.json';
    }
    return path.join(process.cwd(), '.next', 'cashfree_config.json');
  } catch {
    return '/tmp/cashfree_config.json';
  }
}

export function getCashfreeConfig(): CashfreeConfig {
  if (globalThis.__cashfree_config && globalThis.__cashfree_config.appId) {
    return globalThis.__cashfree_config;
  }

  try {
    const filePath = getConfigPath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.appId || parsed.secretKey)) {
        globalThis.__cashfree_config = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading Cashfree server config:', e);
  }

  const envConfig: CashfreeConfig = {
    appId: process.env.CASHFREE_APP_ID || '',
    secretKey: process.env.CASHFREE_SECRET_KEY || '',
    env: (process.env.CASHFREE_ENV as 'sandbox' | 'production') || 'sandbox',
  };

  return envConfig;
}

export function saveCashfreeConfig(config: CashfreeConfig): void {
  globalThis.__cashfree_config = config;
  try {
    const filePath = getConfigPath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing Cashfree server config:', e);
  }
}
