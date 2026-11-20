import { PUBLIC_NOTES } from './public-notes.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const COOKIE = 'visitor_id';
const encoder = new TextEncoder();

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), { status, headers: {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', ...extra,
  } });
}
function error(status, code, message, extra) { return json({ error: { code, message } }, status, extra); }
function idFromCookie(request) {
  const match = (request.headers.get('cookie') || '').match(/(?:^|;\s*)visitor_id=([^;]*)/);
  return match && UUID.test(match[1]) ? match[1].toLowerCase() : null;
}
function cookie(id, url) {
  return `${COOKIE}=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${url.protocol === 'https:' ? '; Secure' : ''}`;
}
function allowedOrigin(request, url) {
  const origin = request.headers.get('Origin');
  return origin === url.origin && request.headers.get('Sec-Fetch-Site') !== 'cross-site';
}
async function readBody(request) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) throw new Error('content_type');
  const length = request.headers.get('content-length');
  if (length && (!/^\d+$/.test(length) || Number(length) > 8192)) throw new Error('too_large');
  if (!request.body) throw new Error('invalid_json');
  const reader = request.body.getReader(); let size = 0; const chunks = [];
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    size += value.length; if (size > 8192) { await reader.cancel(); throw new Error('too_large'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); if (!value || Array.isArray(value) || typeof value !== 'object') throw 0; return value; }
  catch { throw new Error('invalid_json'); }
}
function display(row) { return { id: row.id, nickname: row.nickname, body: row.body, createdAt: row.created_at }; }
function encodeCursor(row) { return btoa(JSON.stringify([row.created_at, row.id])); }
function decodeCursor(s) {
  try {
    if (s.length > 256 || !/^[A-Za-z0-9+/=]+$/.test(s)) return null;
    const v = JSON.parse(atob(s));
    if (!Array.isArray(v) || v.length !== 2 || typeof v[0] !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v[0]) || !UUID.test(v[1])) return null;
    return v;
  } catch { return null; }
}
async function hashIP(request, now) {
  // The daily scope permits automatic expiry; this is a pseudonymous rate-limit key, not anonymisation.
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(`${now.slice(0, 10)}|${ip}`));
  return Array.from(new Uint8Array(hash), n => n.toString(16).padStart(2, '0')).join('');
}
async function countLikes(db, slug, visitor) {
  const row = await db.prepare('SELECT COUNT(*) AS likes, COALESCE(MAX(CASE WHEN visitor_id = ? THEN 1 ELSE 0 END), 0) AS liked FROM visitor_likes WHERE slug = ?').bind(visitor, slug).first();
  return { likes: Number(row.likes), liked: !!row.liked };
}
async function countComments(db, slug) { const row = await db.prepare('SELECT COUNT(*) AS n FROM visitor_comments WHERE slug = ?').bind(slug).first(); return Number(row.n); }
async function existingComment(db, slug, visitor, requestId) {
  return db.prepare('SELECT id, nickname, body, created_at FROM visitor_comments WHERE slug = ? AND visitor_id = ? AND request_id = ?').bind(slug, visitor, requestId).first();
}

export async function handleVisitorRequest({ request, env, params }, action) {
  const url = new URL(request.url); const slug = params.slug;
  if (typeof slug !== 'string' || !PUBLIC_NOTES.includes(slug)) return error(404, 'not_found', '文章不存在。');
  if (!env.VISITOR_DB) return error(503, 'unavailable', '互动功能暂时不可用，请稍后再试。');
  const db = env.VISITOR_DB; let visitor = idFromCookie(request); const headers = {};
  const expected = action === 'read' ? 'GET' : action === 'like' ? 'PUT' : 'POST';
  if (request.method !== expected) return error(405, 'method_not_allowed', '请求方法不支持。', { Allow: expected });
  if (action === 'read' && !visitor) { visitor = crypto.randomUUID(); headers['Set-Cookie'] = cookie(visitor, url); }
  if (action !== 'read') {
    if (!allowedOrigin(request, url)) return error(403, 'invalid_origin', '请求来源无效。');
    if (!visitor) return error(403, 'missing_visitor', '请刷新页面后重试。');
  }
  try {
    if (action === 'read') {
      const before = url.searchParams.get('before'); const cursor = before === null ? null : decodeCursor(before);
      if (before !== null && !cursor) return error(400, 'invalid_cursor', '分页参数无效。');
      let q = 'SELECT id, nickname, body, created_at FROM visitor_comments WHERE slug = ?';
      const args = [slug];
      if (cursor) { q += ' AND (created_at < ? OR (created_at = ? AND id < ?))'; args.push(cursor[0], cursor[0], cursor[1]); }
      q += ' ORDER BY created_at DESC, id DESC LIMIT 21';
      const [likes, result, commentCount] = await Promise.all([countLikes(db, slug, visitor), db.prepare(q).bind(...args).all(), countComments(db, slug)]);
      const rows = result.results; const page = rows.slice(0, 20);
      return json({ ...likes, comments: page.map(display), commentCount, nextCursor: rows.length > 20 ? encodeCursor(page[page.length - 1]) : null }, 200, headers);
    }
    const input = await readBody(request);
    if (action === 'like') {
      if (typeof input.liked !== 'boolean') return error(400, 'invalid_input', '点赞状态无效。');
      const sql = input.liked ? 'INSERT OR IGNORE INTO visitor_likes (slug, visitor_id) VALUES (?, ?)' : 'DELETE FROM visitor_likes WHERE slug = ? AND visitor_id = ?';
      await db.prepare(sql).bind(slug, visitor).run();
      return json(await countLikes(db, slug, visitor));
    }
    if (typeof input.nickname !== 'string' || typeof input.body !== 'string' || typeof input.requestId !== 'string' || !UUID.test(input.requestId) || typeof input.website !== 'string') return error(400, 'invalid_input', '留言内容无效。');
    const nickname = input.nickname.trim(), body = input.body.trim();
    if (!nickname || Array.from(nickname).length > 30 || !body || Array.from(body).length > 1000 || input.website.length > 200) return error(400, 'invalid_input', '请输入 1–30 字昵称和 1–1000 字留言。');
    if (input.website) return error(400, 'invalid_input', '留言无法提交。');
    const prior = await existingComment(db, slug, visitor, input.requestId);
    if (prior) return json({ comment: display(prior), commentCount: await countComments(db, slug) });
    const id = crypto.randomUUID(), now = new Date().toISOString();
    const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const ipHash = await hashIP(request, now);
    try {
      const [, inserted] = await db.batch([
        db.prepare('DELETE FROM visitor_comment_limits WHERE created_at < ?').bind(cutoff),
        db.prepare('INSERT INTO visitor_comment_limits (comment_id, visitor_id, ip_hash, created_at) SELECT ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM visitor_comment_limits WHERE visitor_id = ?) < 5 AND (SELECT COUNT(*) FROM visitor_comment_limits WHERE ip_hash = ?) < 20').bind(id, visitor, ipHash, now, visitor, ipHash),
        db.prepare('INSERT INTO visitor_comments (id, slug, visitor_id, request_id, nickname, body, created_at) SELECT ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM visitor_comment_limits WHERE comment_id = ?)').bind(id, slug, visitor, input.requestId, nickname, body, now, id),
      ]);
      if (!inserted.meta.changes) {
        const concurrent = await existingComment(db, slug, visitor, input.requestId);
        if (concurrent) return json({ comment: display(concurrent), commentCount: await countComments(db, slug) });
        return error(429, 'rate_limited', '留言太频繁，请稍后再试。', { 'Retry-After': '600' });
      }
    } catch (e) {
      const concurrent = await existingComment(db, slug, visitor, input.requestId);
      if (concurrent) return json({ comment: display(concurrent), commentCount: await countComments(db, slug) });
      throw e;
    }
    return json({ comment: { id, nickname, body, createdAt: now }, commentCount: await countComments(db, slug) }, 201);
  } catch (e) {
    if (e.message === 'content_type') return error(415, 'content_type', '请使用 JSON 提交。');
    if (e.message === 'too_large') return error(413, 'too_large', '请求内容过长。');
    if (e.message === 'invalid_json') return error(400, 'invalid_json', '请求格式无效。');
    console.error('Visitor API error', e);
    return error(503, 'unavailable', '互动功能暂时不可用，请稍后再试。');
  }
}
