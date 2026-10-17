import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const here = dirname(fileURLToPath(import.meta.url));
const sources = [
  resolve(here, '../app.js'),
  resolve(here, '../android/assets/app.js'),
].map((path) => readFileSync(path, 'utf8'));

test('both queue renderers use text nodes for track metadata', () => {
  for (const source of sources) {
    assert.match(source, /title\.textContent\s*=\s*String\(track\.title/);
    assert.match(source, /artist\.textContent\s*=/);
    const templates = [...source.matchAll(/\.innerHTML\s*=\s*`([\s\S]*?)`/g)].map((match) => match[1]);
    for (const html of templates) assert.doesNotMatch(html, /\$\{[^}]*track\.(?:title|name|artist|album|picture|id)/);
  }
});

test('artwork only permits embedded images or the active loopback art endpoint', () => {
  for (const source of sources) {
    assert.match(source, /pictureUrl\.hostname === '127\.0\.0\.1'/);
    assert.match(source, /pictureUrl\.port === bridgePort/);
    assert.match(source, /pictureUrl\.pathname === '\/art'/);
  }
});

test('release build reads signing inputs from the environment', () => {
  const build = readFileSync(resolve(here, '../build.ps1'), 'utf8');
  assert.match(build, /DOTMUSIC_STORE_PASSWORD/);
  assert.match(build, /DOTMUSIC_KEY_PASSWORD/);
  assert.doesNotMatch(build, /--ks-pass\s+pass:/i);
});
