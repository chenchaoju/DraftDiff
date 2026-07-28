// GET    /api/articles/[id] - 获取单篇文章
// PUT    /api/articles/[id] - 更新文章
// DELETE /api/articles/[id] - 删除文章
// POST   /api/articles/[id]/compare - 记录对比时间

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      ...(init.headers || {}),
    },
  });
}
const ok = (d) => json({ success: true, data: d });
const fail = (m, c = 400) => json({ success: false, error: m }, { status: c });

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function onRequestGet(context) {
  const { env, params } = context;
  try {
    const article = await env.DB.prepare(
      'SELECT * FROM articles WHERE id = ?'
    ).bind(params.id).first();

    if (!article) return fail('文章不存在', 404);

    return ok({
      ...article,
      tags: safeParseJSON(article.tags, []),
    });
  } catch (e) {
    return fail('查询失败: ' + e.message, 500);
  }
}

export async function onRequestPut(context) {
  const { request, env, params } = context;
  let body;
  try { body = await request.json(); } catch { return fail('无效的 JSON'); }

  if (!body.title || !body.content) return fail('标题和内容不能为空');

  const now = Date.now();
  const wordCount = (body.content || '').replace(/\s/g, '').length;

  try {
    await env.DB.prepare(`
      UPDATE articles
      SET title = ?, content = ?, source = ?, category = ?, tags = ?, word_count = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      body.title,
      body.content,
      body.source || '',
      body.category || '未分类',
      JSON.stringify(body.tags || []),
      wordCount,
      now,
      params.id
    ).run();
    return ok({ id: Number(params.id), updated_at: now });
  } catch (e) {
    return fail('更新失败: ' + e.message, 500);
  }
}

export async function onRequestDelete(context) {
  const { env, params } = context;
  try {
    await env.DB.prepare('DELETE FROM articles WHERE id = ?').bind(params.id).run();
    return ok({ id: Number(params.id) });
  } catch (e) {
    return fail('删除失败: ' + e.message, 500);
  }
}

function safeParseJSON(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}
