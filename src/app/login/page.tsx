import { getGlobalBrandingFromDb } from '@/lib/globalBranding';
import LoginPageClient from './LoginPageClient';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const branding = await getGlobalBrandingFromDb().catch(() => null);
  return <LoginPageClient initialBranding={branding} />;
}
