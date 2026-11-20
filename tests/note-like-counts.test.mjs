import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { handleNoteLikeCounts } from '../lib/note-like-counts.js';
import { PUBLIC_NOTES } from '../lib/public-notes.js';

assert.ok(PUBLIC_NOTES.length >= 2, 'Test requires at least two public articles');
function database() {
  const sql = new DatabaseSync(':memory:');
  sql.exec(readFileSync(new URL('../migrations/0001_visitor.sql', import.meta.url), 'utf8'));
  let queries = 0;
  return { sql, get queries() { return queries; }, db: { prepare(query) {
    queries++;
    return { bind(...args) { return { async all() { return { results: sql.prepare(query).all(...args) }; } }; } };
  } } };
}
function call(db, query, method = 'GET') {
  return handleNoteLikeCounts({ request: new Request('https://example.test/api/note-likes' + query, { method }), env: { VISITOR_DB: db } });
}
test('returns grouped counts and zero with one parameterized query and no visitor identity', async () => {
  const fixture = database(); const { db, sql } = fixture;
  const insert = sql.prepare('INSERT INTO visitor_likes (slug, visitor_id) VALUES (?, ?)');
  insert.run(PUBLIC_NOTES[0], 'visitor-1'); insert.run(PUBLIC_NOTES[0], 'visitor-2');
  insert.run('reading-template', 'private-visitor');
  const response = await call(db, `?slugs=${PUBLIC_NOTES[0]},${PUBLIC_NOTES[1]},${PUBLIC_NOTES[0]}`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('set-cookie'), null);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const data = await response.json();
  assert.deepEqual(data, { likes: { [PUBLIC_NOTES[0]]: 2, [PUBLIC_NOTES[1]]: 0 } });
  assert.equal(fixture.queries, 1);
  assert.equal(JSON.stringify(data).includes('visitor-1'), false);
});
test('rejects invalid, oversized, unknown and draft article lists', async () => {
  const { db } = database();
  for (const query of ['', '?slugs=', '?slugs=a,,b', '?slugs=a%27%20OR%201%3D1', '?slugs=a&slugs=b', '?slugs=' + Array(51).fill(PUBLIC_NOTES[0]).join(',')]) {
    assert.equal((await call(db, query)).status, 400, query);
  }
  for (const slug of ['reading-template', 'unknown-article']) assert.equal((await call(db, `?slugs=${PUBLIC_NOTES[0]},${slug}`)).status, 404);
});
test('reports unavailable database and unsupported methods without creating cookies', async () => {
  const r = await call(null, `?slugs=${PUBLIC_NOTES[0]}`);
  assert.equal(r.status, 503); assert.equal(r.headers.get('set-cookie'), null);
  const wrongMethod = await call(null, `?slugs=${PUBLIC_NOTES[0]}`, 'POST');
  assert.equal(wrongMethod.status, 405); assert.equal(wrongMethod.headers.get('allow'), 'GET');
});
