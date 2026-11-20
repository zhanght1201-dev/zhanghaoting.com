(() => {
  const root = document.querySelector('[data-note-interactions]');
  if (!root) return;
  const find = (name) => root.querySelector(`[data-${name}]`);
  const status = find('status'), retry = find('retry'), like = find('like');
  const likeCount = find('like-count'), count = find('comment-count');
  const list = find('comments'), empty = find('empty'), more = find('more');
  const moreStatus = find('more-status'), form = find('form');
  const submit = find('submit'), formStatus = find('form-status');
  const nickname = form.elements.nickname, body = form.elements.body;
  const endpoint = `/api/notes/${encodeURIComponent(root.dataset.slug)}`;
  let liked = false, cursor = null, requestId = null, loading = false;
  const seen = new Set();

  async function request(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(url, { credentials: 'same-origin', ...options, signal: controller.signal });
      if (!response.ok) {
        let details = {};
        try { details = (await response.json()).error || {}; } catch (_) { /* Some error responses have no JSON body. */ }
        const error = new Error('request failed');
        error.status = response.status;
        error.code = typeof details.code === 'string' ? details.code : '';
        error.apiMessage = typeof details.message === 'string' ? details.message : '';
        throw error;
      }
      return await response.json();
    } finally { clearTimeout(timer); }
  }

  function friendlyError(error, fallback, hasDraft = false) {
    if (error.status === 403) {
      const message = error.code === 'missing_visitor'
        ? '请确认浏览器允许本站 Cookie，然后刷新页面重试。'
        : '请刷新页面重试；如果仍然失败，请检查浏览器是否允许本站 Cookie。';
      return message + (hasDraft ? '刷新前请先复制留言内容。' : '');
    }
    if (error.status === 429) {
      return error.code === 'rate_limited' && error.apiMessage === '留言太频繁，请稍后再试。'
        ? error.apiMessage : '操作太频繁，请稍后再试。';
    }
    if (error.status === 400 && error.code === 'invalid_input' && error.apiMessage === '请输入 1–30 字昵称和 1–1000 字留言。') return error.apiMessage;
    return fallback;
  }

  function drawLike(value, active) {
    if (!Number.isInteger(value) || value < 0 || typeof active !== 'boolean') throw new Error('invalid response');
    liked = active;
    likeCount.textContent = String(value);
    like.setAttribute('aria-pressed', String(active));
    like.firstChild.textContent = active ? '♥ 已喜欢 ' : '♡ 喜欢 ';
    document.dispatchEvent(new CustomEvent('note-like-change', { detail: { slug: root.dataset.slug, likes: value } }));
  }

  function drawCount(value) {
    if (!Number.isInteger(value) || value < 0) throw new Error('invalid response');
    count.textContent = `（${value}）`;
  }

  function insertComment(comment, prepend = false) {
    if (!comment || comment.id == null || typeof comment.nickname !== 'string' || typeof comment.body !== 'string') throw new Error('invalid comment');
    const id = String(comment.id);
    if (seen.has(id)) return;
    seen.add(id);
    const item = document.createElement('li');
    const header = document.createElement('div');
    const name = document.createElement('strong');
    const date = document.createElement('time');
    const text = document.createElement('p');
    name.textContent = comment.nickname;
    const timestamp = new Date(comment.createdAt);
    if (!Number.isNaN(timestamp.valueOf())) {
      date.dateTime = timestamp.toISOString();
      date.textContent = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }).format(timestamp);
    }
    text.textContent = comment.body;
    header.append(name, date);
    item.append(header, text);
    if (prepend) list.prepend(item); else list.append(item);
    empty.hidden = true;
  }

  function setCursor(value) {
    cursor = typeof value === 'string' && value ? value : null;
    more.hidden = !cursor;
  }

  async function loadInitial() {
    if (loading) return;
    loading = true;
    retry.hidden = true;
    status.textContent = '正在加载互动内容…';
    try {
      const data = await request(endpoint);
      if (!Array.isArray(data.comments)) throw new Error('invalid response');
      drawLike(data.likes, data.liked);
      drawCount(data.commentCount);
      list.replaceChildren();
      seen.clear();
      data.comments.forEach((comment) => insertComment(comment));
      empty.hidden = data.comments.length > 0;
      setCursor(data.nextCursor);
      status.textContent = '';
      like.disabled = false;
      nickname.disabled = false;
      body.disabled = false;
      submit.disabled = false;
    } catch (_) {
      status.textContent = '互动内容暂时不可用，请稍后重试。';
      retry.hidden = false;
    } finally { loading = false; }
  }

  retry.addEventListener('click', loadInitial);
  like.addEventListener('click', async () => {
    like.disabled = true;
    status.textContent = '';
    try {
      const data = await request(`${endpoint}/like`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ liked: !liked }) });
      drawLike(data.likes, data.liked);
    } catch (error) { status.textContent = friendlyError(error, '操作没有完成，请再试一次。', !!body.value.trim()); }
    finally { like.disabled = false; }
  });

  more.addEventListener('click', async () => {
    if (!cursor) return;
    more.disabled = true;
    moreStatus.textContent = '正在加载…';
    try {
      const data = await request(`${endpoint}?before=${encodeURIComponent(cursor)}`);
      if (!Array.isArray(data.comments)) throw new Error('invalid response');
      data.comments.forEach((comment) => insertComment(comment));
      setCursor(data.nextCursor);
      moreStatus.textContent = '';
    } catch (_) { moreStatus.textContent = '加载失败，请再试一次。'; }
    finally { more.disabled = false; }
  });

  function newRequestId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, (v) => v.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  [nickname, body].forEach((input) => input.addEventListener('input', () => { requestId = null; }));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submit.disabled || !form.reportValidity()) return;
    if (!nickname.value.trim() || !body.value.trim()) {
      formStatus.textContent = '请填写昵称和留言。';
      return;
    }
    requestId ||= newRequestId();
    const payload = { nickname: nickname.value, body: body.value, requestId, website: form.elements.website.value };
    nickname.disabled = true;
    body.disabled = true;
    submit.disabled = true;
    formStatus.textContent = '正在发表…';
    try {
      const data = await request(`${endpoint}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      drawCount(data.commentCount);
      insertComment(data.comment, true);
      body.value = '';
      requestId = null;
      formStatus.textContent = '留言已发表。';
    } catch (error) { formStatus.textContent = `${friendlyError(error, '发表失败，请重试。', true)}你的内容仍在这里。`; }
    finally { nickname.disabled = false; body.disabled = false; submit.disabled = false; }
  });
  loadInitial();
})();
