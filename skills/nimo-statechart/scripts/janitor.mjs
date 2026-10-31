import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [pid, stage, tmp] = process.argv.slice(2);
process.stdin.resume();
process.stdin.on('end', () => {
  const taskkill = path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'taskkill.exe');
  const child = spawn(taskkill, ['/PID', pid, '/T', '/F'], { stdio: 'ignore', windowsHide: true });
  const cleanup = () => {
    for (const dir of [stage, tmp]) fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  };
  child.once('error', cleanup).once('exit', cleanup);
});
