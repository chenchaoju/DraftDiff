// GET /api/articles - 获取文章列表（支持搜索和分类筛选）
// POST /api/articles - 创建新文章
// POST /api/articles/bulk - 批量导入

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

function ok(data) { return json({ success: true, data }); }
function fail(msg, code = 400) { return json({ success: false, error: msg }, { status: code }); }

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
  const { request, env } = context;
  const url = new URL(request.url);
  const search = url.searchParams.get('search') || '';
  const category = url.searchParams.get('category') || '';

  let query = 'SELECT id, title, source, category, tags, word_count, created_at, updated_at, last_compared_at FROM articles';
  const conditions = [];
  const params = [];

  if (search) {
    conditions.push('(title LIKE ? OR content LIKE ? OR source LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (category) {
    conditions.push('category = ?');
    params.push(category);
  }
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY created_at DESC LIMIT 500';

  try {
    const { results } = await env.DB.prepare(query).bind(...params).all();
    const data = results.map(r => ({
      ...r,
      tags: safeParseJSON(r.tags, []),
    }));
    return ok(data);
  } catch (e) {
    return fail('查询失败: ' + e.message, 500);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const isBulk = url.pathname.endsWith('/bulk');

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return fail('无效的 JSON');
  }

  if (isBulk) {
    // 批量导入
    if (!Array.isArray(body.articles) || body.articles.length === 0) {
      return fail('请提供 articles 数组');
    }
    const now = Date.now();
    const stmt = env.DB.prepare(`
      INSERT INTO articles (title, content, source, category, tags, word_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const results = [];
    for (const a of body.articles) {
      const wordCount = (a.content || '').replace(/\s/g, '').length;
      const r = await stmt.bind(
        a.title || '未命名',
        a.content || '',
        a.source || '',
        a.category || '未分类',
        JSON.stringify(a.tags || []),
        wordCount,
        now,
        now
      ).run();
      results.push(r.meta.last_row_id);
    }
    return ok({ inserted: results.length, ids: results });
  }

  // 单条新增
  if (!body.title || !body.content) {
    return fail('标题和内容不能为空');
  }
  const now = Date.now();
  const wordCount = (body.content || '').replace(/\s/g, '').length;
  try {
    const r = await env.DB.prepare(`
      INSERT INTO articles (title, content, source, category, tags, word_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.title,
      body.content,
      body.source || '',
      body.category || '未分类',
      JSON.stringify(body.tags || []),
      wordCount,
      now,
      now
    ).run();

    return ok({
      id: r.meta.last_row_id,
      title: body.title,
      content: body.content,
      source: body.source || '',
      category: body.category || '未分类',
      tags: body.tags || [],
      word_count: wordCount,
      created_at: now,
      updated_at: now,
    });
  } catch (e) {
    return fail('保存失败: ' + e.message, 500);
  }
}

function safeParseJSON(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}
