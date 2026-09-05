import { getSiteOrigin } from '../src/lib/site-metadata.ts';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const origin = getSiteOrigin();
if (!origin || origin.protocol !== 'https:' || /^(localhost|127\.|0\.|\[::1\])/.test(origin.hostname)) {
  console.error('发布需要 NEXT_PUBLIC_SITE_URL：填写真实的 HTTPS 站点根地址，不含路径、查询、账号或密码。');
  process.exitCode = 1;
} else {
  console.log(`Release origin verified: ${origin.origin}`);
}
