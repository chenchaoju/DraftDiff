// api.js - 与后端 API 通信

const BASE = '/api';

async function request(path, options = {}) {
  const url = BASE + path;
  const opts = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };
  if (opts.body && typeof opts.body !== 'string') {
    opts.body = JSON.stringify(opts.body);
  }
  try {
    const res = await fetch(url, opts);
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`服务器返回异常响应 (HTTP ${res.status})，可能服务未启动`);
    }
    if (!res.ok || data.success === false) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    return data;
  } catch (e) {
    if (e.message && e.message.startsWith('服务器返回异常')) {
      throw e;
    }
    throw new Error('网络连接失败，请检查服务是否启动');
  }
}

export const api = {
  // 文章列表（支持搜索和分类筛选）
  listArticles(params = {}) {
    const search = new URLSearchParams();
    if (params.search) search.set('search', params.search);
    if (params.category) search.set('category', params.category);
    const qs = search.toString();
    return request('/articles' + (qs ? '?' + qs : ''));
  },

  getArticle(id) {
    return request('/articles/' + id);
  },

  createArticle(data) {
    return request('/articles', { method: 'POST', body: data });
  },

  updateArticle(id, data) {
    return request('/articles/' + id, { method: 'PUT', body: data });
  },

  deleteArticle(id) {
    return request('/articles/' + id, { method: 'DELETE' });
  },

  bulkImport(articles) {
    return request('/articles/bulk', { method: 'POST', body: { articles } });
  },

  listCategories() {
    return request('/categories');
  },
};
