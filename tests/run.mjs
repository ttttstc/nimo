import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const testsDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testsDirectory, '..');
const testSuffixes = ['.test.mjs', '.blackbox.test.mjs'];

function findTestFiles(directory) {
  const files = [];
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'runs') continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...findTestFiles(fullPath));
    } else if (testSuffixes.some((suffix) => entry.name.endsWith(suffix)) && entry.name !== 'check-package.mjs') {
      files.push(path.resolve(fullPath));
    }
  }
  return files;
}

const testFiles = findTestFiles(testsDirectory).sort((left, right) => left.localeCompare(right));
if (testFiles.length === 0) {
  console.error(`No Node test files found under ${testsDirectory}`);
  process.exitCode = 1;
} else {
  const result = spawnSync(process.execPath, ['--test', ...testFiles], {
    cwd: projectRoot,
    stdio: 'inherit',
    windowsHide: true,
  });
  if (result.error) {
    console.error(`Unable to start Node test runner: ${result.error.message}`);
    process.exitCode = 1;
  } else {
    process.exitCode = result.status ?? 1;
  }
}
