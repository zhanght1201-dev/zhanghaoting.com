(() => {
  const badges = [...document.querySelectorAll('[data-note-like-count]')];
  if (!badges.length) return;
  const slugs = [...new Set(badges.map(badge => badge.dataset.noteLikeCount))];
  const revisions = new Map(slugs.map(slug => [slug, 0]));
  let generation = 0;
  const controllers = new Set();

  function draw(slug, count) {
    const available = Number.isSafeInteger(count) && count >= 0;
    for (const badge of badges) {
      if (badge.dataset.noteLikeCount !== slug) continue;
      badge.textContent = available ? `♡ ${count.toLocaleString('zh-CN')}` : '♡ —';
      const label = available ? `${count} 个点赞` : '点赞数暂时无法获取';
      badge.setAttribute('aria-label', label);
      badge.title = label;
    }
  }

  async function refresh() {
    const current = ++generation;
    for (const controller of controllers) controller.abort();
    controllers.clear();
    const versions = new Map(revisions);
    const chunks = [];
    for (let i = 0; i < slugs.length; i += 50) chunks.push(slugs.slice(i, i + 50));
    await Promise.all(chunks.map(async chunk => {
      const controller = new AbortController();
      controllers.add(controller);
      const timer = setTimeout(() => controller.abort(), 10000);
      try {
        const query = new URLSearchParams({ slugs: chunk.join(',') });
        const response = await fetch(`/api/note-likes?${query}`, {
          credentials: 'omit', cache: 'no-store', signal: controller.signal,
        });
        if (!response.ok) throw new Error('unavailable');
        const data = await response.json();
        if (!data.likes || chunk.some(slug => !Object.hasOwn(data.likes, slug)
          || !Number.isSafeInteger(data.likes[slug]) || data.likes[slug] < 0)) throw new Error('invalid counts');
        if (current !== generation) return;
        for (const slug of chunk) {
          if (versions.get(slug) === revisions.get(slug)) draw(slug, data.likes[slug]);
        }
      } catch (_) {
        if (current !== generation) return;
        for (const slug of chunk) {
          if (versions.get(slug) === revisions.get(slug)) draw(slug, null);
        }
      } finally {
        clearTimeout(timer);
        controllers.delete(controller);
      }
    }));
  }

  // A successful like response is newer than any batch read already in flight.
  document.addEventListener('note-like-change', event => {
    const { slug, likes } = event.detail || {};
    if (!revisions.has(slug) || !Number.isSafeInteger(likes) || likes < 0) return;
    revisions.set(slug, revisions.get(slug) + 1);
    draw(slug, likes);
  });
  window.addEventListener('pageshow', event => { if (event.persisted) refresh(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  refresh();
})();
