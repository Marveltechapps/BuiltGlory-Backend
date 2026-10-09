/**
 * Start the local backend plus a public Cloudflare tunnel.
 *
 * Usage:
 *   npm run dev:tunnel
 *
 * Copy the printed https://...trycloudflare.com URL into
 * BuiltGlory-App/.env as EXPO_PUBLIC_TUNNEL_API_URL when you want to test
 * your local backend from a phone that is on a different network.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const API_PORT = process.env.PORT || '5001';

const CLOUDFLARED_CANDIDATES = [
  process.env.CLOUDFLARED_PATH,
  path.join(process.env['ProgramFiles(x86)'] || '', 'cloudflared', 'cloudflared.exe'),
  path.join(process.env.ProgramFiles || '', 'cloudflared', 'cloudflared.exe'),
  'cloudflared',
].filter(Boolean);

function findCloudflared() {
  for (const candidate of CLOUDFLARED_CANDIDATES) {
    if (candidate === 'cloudflared' || fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return 'cloudflared';
}

function waitForServerReady(child) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error(`Backend did not start on port ${API_PORT} in time`));
      }
    }, 60_000);

    const onChunk = (buf) => {
      const text = buf.toString();
      process.stdout.write(text);
      if (text.includes(`BuiltGlory API running on port ${API_PORT}`) && !settled) {
        settled = true;
        clearTimeout(timeout);
        resolve();
      }
    };

    child.stdout.on('data', onChunk);
    child.stderr.on('data', onChunk);
    child.on('error', (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(err);
      }
    });
    child.on('exit', (code) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(new Error(`Backend exited early (code ${code})`));
      }
    });
  });
}

function startCloudflared() {
  const bin = findCloudflared();
  return new Promise((resolve, reject) => {
    const child = spawn(bin, ['tunnel', '--url', `http://127.0.0.1:${API_PORT}`], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill();
        reject(new Error('cloudflared did not print a public URL in time'));
      }
    }, 60_000);

    const onChunk = (buf) => {
      const text = buf.toString();
      process.stderr.write(text);
      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
      if (match && !settled) {
        settled = true;
        clearTimeout(timeout);
        resolve({ child, url: match[0] });
      }
    };

    child.stdout.on('data', onChunk);
    child.stderr.on('data', onChunk);
    child.on('error', (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(
          new Error(
            `Failed to start cloudflared (${bin}). Install from https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/ - ${err.message}`,
          ),
        );
      }
    });
    child.on('exit', (code) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(new Error(`cloudflared exited early (code ${code})`));
      }
    });
  });
}

async function main() {
  const backend = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev'], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });

  await waitForServerReady(backend);

  console.log('\nStarting Cloudflare tunnel for backend...\n');
  const { child: tunnel, url } = await startCloudflared();
  console.log(`Backend tunnel ready: ${url}`);
  console.log('Set BuiltGlory-App/.env EXPO_PUBLIC_TUNNEL_API_URL to this URL for off-network testing.\n');

  const shutdown = () => {
    try {
      tunnel.kill();
    } catch {}
    try {
      backend.kill();
    } catch {}
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  backend.on('exit', (code) => {
    try {
      tunnel.kill();
    } catch {}
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
