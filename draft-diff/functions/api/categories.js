// GET    /api/categories - 获取所有分类
// POST   /api/categories - 新建分类（仅当文章使用该分类时存在）

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      ...(init.headers || {}),
    },
  });
}
const ok = (d) => json({ success: true, data: d });

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function onRequestGet(context) {
  const { env } = context;
  try {
    const { results } = await env.DB.prepare(`
      SELECT category, COUNT(*) as count
      FROM articles
      WHERE category IS NOT NULL AND category != ''
      GROUP BY category
      ORDER BY count DESC
    `).all();
    return ok(results);
  } catch (e) {
    return json({ success: false, error: e.message }, { status: 500 });
  }
}
