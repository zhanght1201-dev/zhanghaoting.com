import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { handleVisitorRequest } from '../lib/visitor-api.js';
import { PUBLIC_NOTES } from '../lib/public-notes.js';

function makeDb() {
  const sql = new DatabaseSync(':memory:');
  sql.exec(readFileSync(new URL('../migrations/0001_visitor.sql', import.meta.url), 'utf8'));
  const db = {
    prepare(query) {
      return { bind(...values) { return {
        first: async () => sql.prepare(query).get(...values) || null,
        all: async () => ({ results: sql.prepare(query).all(...values) }),
        run: async () => ({ meta: { changes: Number(sql.prepare(query).run(...values).changes) } }),
        _execute: () => ({ meta: { changes: Number(sql.prepare(query).run(...values).changes) } }),
      }; } };
    },
    async batch(queries) {
      sql.exec('BEGIN');
      try { const result = queries.map(q => q._execute()); sql.exec('COMMIT'); return result; }
      catch (e) { sql.exec('ROLLBACK'); throw e; }
    },
  };
  return { db, sql };
}
const slug = PUBLIC_NOTES[0];
assert.ok(slug, 'Generate the public notes list before running tests');
function context(db, options = {}) {
  const { method = 'GET', body, cookie, article = slug, before = '', origin = 'https://example.test', ip = '192.0.2.10', type = 'application/json' } = options;
  const headers = { 'CF-Connecting-IP': ip };
  if (method !== 'GET') { headers.Origin = origin; headers['Content-Type'] = type; }
  if (cookie) headers.Cookie = cookie;
  return { request: new Request(`https://example.test/api/notes/${article}${before}`, { method, headers, ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }) }), env: { VISITOR_DB: db }, params: { slug: article } };
}
async function visit(db) {
  const r = await handleVisitorRequest(context(db), 'read');
  assert.equal(r.status, 200);
  return r.headers.get('set-cookie').split(';')[0];
}
const requestId = () => crypto.randomUUID();
const post = (db, cookie, body, extra = {}) => handleVisitorRequest(context(db, { method: 'POST', cookie, body: { nickname: '读者', body, requestId: requestId(), website: '' }, ...extra }), 'comments');

test('per-visitor likes are idempotent, isolated and removable', async () => {
  const { db } = makeDb(); const a = await visit(db), b = await visit(db);
  const put = (c, liked) => handleVisitorRequest(context(db, { method: 'PUT', cookie: c, body: { liked } }), 'like');
  assert.deepEqual(await (await put(a, true)).json(), { likes: 1, liked: true });
  assert.deepEqual(await (await put(a, true)).json(), { likes: 1, liked: true });
  assert.deepEqual(await (await put(b, true)).json(), { likes: 2, liked: true });
  assert.deepEqual(await (await put(a, false)).json(), { likes: 1, liked: false });
  assert.deepEqual(await (await put(b, false)).json(), { likes: 0, liked: false });
  if (PUBLIC_NOTES.length > 1) {
    await put(a, true);
    const other = await (await handleVisitorRequest(context(db, { cookie: a, article: PUBLIC_NOTES[1] }), 'read')).json();
    assert.deepEqual({ likes: other.likes, liked: other.liked, commentCount: other.commentCount }, { likes: 0, liked: false, commentCount: 0 });
  }
});

test('comment duplicate request is safe and content remains plain data', async () => {
  const { db } = makeDb(); const c = await visit(db), id = requestId();
  const input = { nickname: '<img>', body: '<script>alert(1)</script>', requestId: id, website: '' };
  const submit = () => handleVisitorRequest(context(db, { method: 'POST', cookie: c, body: input }), 'comments');
  const [a, b] = await Promise.all([submit(), submit()]);
  assert.ok([200, 201].includes(a.status)); assert.ok([200, 201].includes(b.status));
  assert.equal((await a.json()).comment.id, (await b.json()).comment.id);
  const data = await (await handleVisitorRequest(context(db, { cookie: c }), 'read')).json();
  assert.equal(data.commentCount, 1); assert.equal(data.comments[0].body, input.body);
});

test('validates access, origin, requests, length and missing database', async () => {
  const { db } = makeDb(); const c = await visit(db);
  assert.equal((await handleVisitorRequest(context(db, { article: 'not-a-published-article' }), 'read')).status, 404);
  assert.equal((await handleVisitorRequest(context(null), 'read')).status, 503);
  assert.equal((await handleVisitorRequest(context(db, { method: 'PUT', cookie: c, origin: 'https://evil.test', body: { liked: true } }), 'like')).status, 403);
  assert.equal((await handleVisitorRequest(context(db, { method: 'PUT', body: { liked: true } }), 'like')).status, 403);
  assert.equal((await handleVisitorRequest(context(db, { method: 'PUT', cookie: c, type: 'text/plain', body: '{}' }), 'like')).status, 415);
  assert.equal((await post(db, c, 'x'.repeat(1001))).status, 400);
  assert.equal((await post(db, c, 'x', { body: { nickname: 'x', body: 'x', requestId: requestId(), website: 'bot' } })).status, 400);
  assert.equal((await handleVisitorRequest(context(db, { before: '?before=bad' }), 'read')).status, 400);
});

test('comments enforce rate limits and paginate equal timestamps without gaps', async () => {
  const { db, sql } = makeDb(); const c = await visit(db);
  for (let i = 0; i < 5; i++) assert.equal((await post(db, c, `message ${i}`)).status, 201);
  assert.equal((await post(db, c, 'sixth')).status, 429);
  const insert = sql.prepare('INSERT INTO visitor_comments VALUES (?, ?, ?, ?, ?, ?, ?)');
  for (let i = 0; i < 23; i++) insert.run(crypto.randomUUID(), slug, crypto.randomUUID(), crypto.randomUUID(), 'n', `seed ${i}`, '2026-01-01T00:00:00.000Z');
  const one = await (await handleVisitorRequest(context(db, { cookie: c }), 'read')).json();
  const two = await (await handleVisitorRequest(context(db, { cookie: c, before: '?before=' + encodeURIComponent(one.nextCursor) }), 'read')).json();
  assert.equal(one.commentCount, 28); assert.equal(one.comments.length, 20); assert.equal(two.comments.length, 8); assert.equal(two.nextCursor, null);
  assert.equal(new Set([...one.comments, ...two.comments].map(x => x.id)).size, 28);
});

test('concurrent retries at the visitor limit create the fifth comment only once', async () => {
  const { db } = makeDb(); const c = await visit(db);
  for (let i = 0; i < 4; i++) assert.equal((await post(db, c, `message ${i}`)).status, 201);
  const payload = { nickname: '访客', body: 'fifth', requestId: requestId(), website: '' };
  const send = () => handleVisitorRequest(context(db, { method: 'POST', cookie: c, body: payload }), 'comments');
  const [first, second] = await Promise.all([send(), send()]);
  assert.ok([200, 201].includes(first.status)); assert.ok([200, 201].includes(second.status));
  const firstData = await first.json(), secondData = await second.json();
  assert.equal(firstData.comment.id, secondData.comment.id);
  assert.equal((await (await handleVisitorRequest(context(db, { cookie: c }), 'read')).json()).commentCount, 5);
  assert.equal((await post(db, c, 'sixth')).status, 429);
});

test('separate visitors share the IP limit, while another IP remains usable', async () => {
  const { db } = makeDb();
  for (let i = 0; i < 4; i++) {
    const c = await visit(db);
    for (let j = 0; j < 5; j++) assert.equal((await post(db, c, `comment ${i}-${j}`)).status, 201);
  }
  const other = await visit(db);
  assert.equal((await post(db, other, 'blocked at same IP')).status, 429);
  assert.equal((await post(db, other, 'allowed at other IP', { ip: '192.0.2.99' })).status, 201);
});

test('cookies, size limits, response privacy and draft exclusion', async () => {
  const { db } = makeDb();
  const initial = await handleVisitorRequest(context(db), 'read');
  const setCookie = initial.headers.get('set-cookie');
  assert.match(setCookie, /(?:^|;\s*)HttpOnly(?:;|$)/i);
  assert.match(setCookie, /(?:^|;\s*)SameSite=Lax(?:;|$)/i);
  assert.match(setCookie, /(?:^|;\s*)Secure(?:;|$)/i);
  const c = setCookie.split(';')[0];
  const oversized = await handleVisitorRequest(context(db, { method: 'POST', cookie: c, body: JSON.stringify({ padding: 'x'.repeat(8192) }) }), 'comments');
  assert.equal(oversized.status, 413);
  assert.equal((await post(db, c, '可见留言')).status, 201);
  const result = await (await handleVisitorRequest(context(db, { cookie: c }), 'read')).json();
  assert.deepEqual(Object.keys(result).sort(), ['commentCount', 'comments', 'liked', 'likes', 'nextCursor'].sort());
  assert.deepEqual(Object.keys(result.comments[0]).sort(), ['body', 'createdAt', 'id', 'nickname'].sort());
  const encoded = JSON.stringify(result);
  assert.equal(encoded.includes(c.split('=')[1]), false);
  assert.equal(encoded.includes('192.0.2.10'), false);
  assert.equal(encoded.includes('ip_hash'), false);
  assert.equal(PUBLIC_NOTES.includes('reading-template'), false);
  assert.equal((await handleVisitorRequest(context(db, { article: 'reading-template' }), 'read')).status, 404);
});
