import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const pageSource = fs.readFileSync(new URL('../../src/app/page.tsx', import.meta.url), 'utf8');

test('enterprise footer stays outside the sidebar/content flex row', () => {
  assert.match(
    pageSource,
    /<\/main>\s*<\/div>\s*\{\/\* Global Enterprise Footer \*\/\}/,
    'the footer must render after the horizontal sidebar/content wrapper closes',
  );
});
