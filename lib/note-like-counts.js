import { PUBLIC_NOTES } from './public-notes.js';

const publicNotes = new Set(PUBLIC_NOTES);
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers },
});
const error = (status, code, message, headers) => json({ error: { code, message } }, status, headers);

export async function handleNoteLikeCounts({ request, env }) {
  if (request.method !== 'GET') return error(405, 'method_not_allowed', '请求方法不支持。', { Allow: 'GET' });
  const params = new URL(request.url).searchParams;
  const values = params.getAll('slugs');
  if (values.length !== 1 || !values[0]) return error(400, 'invalid_input', '请选择需要查询的文章。');
  const entries = values[0].split(',');
  if (entries.length > 50 || entries.some(slug => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))) {
    return error(400, 'invalid_input', '文章列表无效或超过数量限制。');
  }
  const slugs = [...new Set(entries)];
  if (slugs.some(slug => !publicNotes.has(slug))) return error(404, 'not_found', '文章不存在。');
  if (!env.VISITOR_DB) return error(503, 'unavailable', '互动功能暂时不可用，请稍后再试。');
  try {
    const placeholders = slugs.map(() => '?').join(',');
    const result = await env.VISITOR_DB.prepare(`SELECT slug, COUNT(*) AS likes FROM visitor_likes WHERE slug IN (${placeholders}) GROUP BY slug`).bind(...slugs).all();
    const likes = Object.fromEntries(slugs.map(slug => [slug, 0]));
    for (const row of result.results) likes[row.slug] = Number(row.likes);
    return json({ likes });
  } catch (e) {
    console.error('Note like counts error', e);
    return error(503, 'unavailable', '互动功能暂时不可用，请稍后再试。');
  }
}
