// app.js - 主应用逻辑

import { api } from './api.js';
import { diffText, segmentsToHTML, segmentsToText } from './diff.js';

// ===========================================
// 状态
// ===========================================
const state = {
  articles: [],
  categories: [],
  currentArticleId: null,
  search: '',
  filterCategory: '',
  currentMode: 'sentence',
  lastResult: null,
};

// ===========================================
// 工具
// ===========================================
const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

function toast(msg, type = '') {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    t.className = 'toast hidden';
  }, 2400);
}

function formatDate(ts) {
  if (!ts) return '-';
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return Math.floor(diff / 60_000) + ' 分钟前';
  if (diff < 86_400_000) return Math.floor(diff / 3_600_000) + ' 小时前';
  if (diff < 7 * 86_400_000) return Math.floor(diff / 86_400_000) + ' 天前';
  return d.toLocaleDateString('zh-CN');
}

function escapeHTML(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function wordCount(s) {
  return (s || '').replace(/\s/g, '').length;
}

// ===========================================
// 文章列表
// ===========================================
async function loadArticles() {
  try {
    const { data } = await api.listArticles({
      search: state.search,
      category: state.filterCategory,
    });
    state.articles = data;
    renderArticleList();
  } catch (e) {
    toast(e.message, 'error');
    $('articles-ul').innerHTML = `<li class="empty-hint">加载失败：${escapeHTML(e.message)}</li>`;
  }
}

async function loadCategories() {
  try {
    const { data } = await api.listCategories();
    state.categories = data;
    renderCategoryFilter();
    renderCategoryDatalist();
  } catch (e) {
    console.error('分类加载失败', e);
  }
}

function renderCategoryFilter() {
  const sel = $('category-filter');
  const current = sel.value;
  sel.innerHTML = '<option value="">全部分类</option>' +
    state.categories.map(c =>
      `<option value="${escapeHTML(c.category)}">${escapeHTML(c.category)} (${c.count})</option>`
    ).join('');
  sel.value = current;
}

function renderCategoryDatalist() {
  const dl = $('category-suggestions');
  dl.innerHTML = state.categories.map(c =>
    `<option value="${escapeHTML(c.category)}">`
  ).join('');
}

function renderArticleList() {
  const ul = $('articles-ul');
  if (state.articles.length === 0) {
    ul.innerHTML = `<li class="empty-hint">${state.search || state.filterCategory ? '没有匹配的文章' : '还没有文章，点击右上角 + 新增'}</li>`;
    return;
  }
  ul.innerHTML = state.articles.map(a => `
    <li data-id="${a.id}" class="${a.id === state.currentArticleId ? 'active' : ''}">
      <div class="article-item-title">${escapeHTML(a.title)}</div>
      <div class="article-item-meta">
        <span>${a.word_count} 字</span>
        ${a.source ? `<span>· ${escapeHTML(a.source)}</span>` : ''}
        <span>· ${formatDate(a.created_at)}</span>
        ${a.category ? `<span class="tag">${escapeHTML(a.category)}</span>` : ''}
      </div>
      <div class="article-item-actions">
        <button class="edit" data-action="edit" data-id="${a.id}" title="编辑">✎</button>
        <button class="delete" data-action="delete" data-id="${a.id}" title="删除">×</button>
      </div>
    </li>
  `).join('');
}

// ===========================================
// 文章操作
// ===========================================
async function loadArticleToRef(id) {
  try {
    const { data } = await api.getArticle(id);
    state.currentArticleId = id;
    $('ref-title').value = data.title;
    $('ref-content').value = data.content;
    updateWordCount();
    renderArticleList();
    toast(`已加载：${data.title}`);
  } catch (e) {
    toast(e.message, 'error');
  }
}

function openArticleModal(article = null) {
  $('modal-article-title').textContent = article ? '编辑文章' : '新增文章';
  $('edit-id').value = article ? article.id : '';
  $('edit-title').value = article ? article.title : '';
  $('edit-source').value = article ? (article.source || '') : '';
  $('edit-category').value = article ? (article.category || '') : '';
  $('edit-tags').value = article && article.tags ? article.tags.join(', ') : '';
  $('edit-content').value = article ? article.content : '';
  $('modal-article').classList.remove('hidden');
  setTimeout(() => $('edit-title').focus(), 50);
}

async function saveArticle() {
  const id = $('edit-id').value;
  const data = {
    title: $('edit-title').value.trim(),
    source: $('edit-source').value.trim(),
    category: $('edit-category').value.trim() || '未分类',
    tags: $('edit-tags').value.split(/[,，]/).map(s => s.trim()).filter(Boolean),
    content: $('edit-content').value,
  };
  if (!data.title || !data.content) {
    toast('标题和内容不能为空', 'error');
    return;
  }
  try {
    if (id) {
      await api.updateArticle(id, data);
      toast('已更新');
    } else {
      const { data: created } = await api.createArticle(data);
      state.currentArticleId = created.id;
      $('ref-title').value = data.title;
      $('ref-content').value = data.content;
      updateWordCount();
      toast('已保存');
    }
    $('modal-article').classList.add('hidden');
    await loadArticles();
    await loadCategories();
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function deleteArticle(id) {
  if (!confirm('确定要删除这篇文章吗？')) return;
  try {
    await api.deleteArticle(id);
    if (state.currentArticleId === id) {
      state.currentArticleId = null;
      $('ref-title').value = '';
      $('ref-content').value = '';
      updateWordCount();
    }
    toast('已删除');
    await loadArticles();
    await loadCategories();
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function bulkImport() {
  const text = $('bulk-text').value.trim();
  if (!text) {
    toast('请输入内容', 'error');
    return;
  }
  const articles = parseBulkText(text);
  if (articles.length === 0) {
    toast('没有解析出任何文章', 'error');
    return;
  }
  try {
    const { data } = await api.bulkImport(articles);
    toast(`成功导入 ${data.inserted} 篇文章`);
    $('modal-bulk').classList.add('hidden');
    $('bulk-text').value = '';
    await loadArticles();
    await loadCategories();
  } catch (e) {
    toast(e.message, 'error');
  }
}

function parseBulkText(text) {
  const blocks = text.split(/^---\s*$/m);
  const articles = [];
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    const meta = { title: '', source: '', category: '', tags: [] };
    const lines = trimmed.split('\n');
    const contentLines = [];
    let inMeta = true;
    for (const line of lines) {
      if (inMeta) {
        const m = line.match(/^(title|source|category|tags)\s*[:：]\s*(.*)$/i);
        if (m) {
          const key = m[1].toLowerCase();
          const val = m[2].trim();
          if (key === 'tags') {
            meta.tags = val.split(/[,，]/).map(s => s.trim()).filter(Boolean);
          } else {
            meta[key] = val;
          }
        } else if (line.trim() === '') {
          // 空行结束 meta 段
          inMeta = false;
        } else {
          inMeta = false;
          contentLines.push(line);
        }
      } else {
        contentLines.push(line);
      }
    }
    const content = contentLines.join('\n').trim();
    if (!content) continue;
    articles.push({
      title: meta.title || '未命名文章',
      source: meta.source,
      category: meta.category || '未分类',
      tags: meta.tags,
      content,
    });
  }
  return articles;
}

// ===========================================
// 对比
// ===========================================
function updateWordCount() {
  $('ref-word-count').textContent = wordCount($('ref-content').value) + ' 字';
  $('target-word-count').textContent = wordCount($('target-content').value) + ' 字';
}

function getMode() {
  const el = document.querySelector('input[name="mode"]:checked');
  return el ? el.value : 'sentence';
}

function doCompare() {
  const textA = $('ref-content').value;
  const textB = $('target-content').value;
  if (!textA && !textB) {
    toast('参考文章和待对比文章都为空', 'error');
    return;
  }
  const mode = getMode();
  state.currentMode = mode;
  const result = diffText(textA, textB, mode);
  state.lastResult = result;
  renderResult(result);
}

function renderResult(result) {
  // 统计卡片
  $('stats').classList.remove('hidden');
  const pct = (result.stats.similarity * 100).toFixed(1);
  $('stat-similarity').textContent = pct + '%';
  $('stat-added').textContent = result.stats.addedChars + ' 字';
  $('stat-removed').textContent = result.stats.removedChars + ' 字';
  $('stat-modified').textContent = result.stats.modifiedCount + ' 处';
  $('stat-moved').textContent = result.stats.movedCount + ' 段';
  $('stat-same').textContent = result.stats.sameChars + ' 字';

  // 结果
  $('result-section').classList.remove('hidden');
  const modeLabel = { char: '逐字对比', sentence: '逐句对比', paragraph: '逐段对比' }[result.mode];
  $('result-mode').textContent = modeLabel;
  $('result').innerHTML = segmentsToHTML(result.segments, result.mode);
}

function clearAll() {
  if (!confirm('确定清空两篇文章内容吗？')) return;
  $('ref-title').value = '';
  $('ref-content').value = '';
  $('target-title').value = '';
  $('target-content').value = '';
  state.currentArticleId = null;
  updateWordCount();
  $('stats').classList.add('hidden');
  $('result-section').classList.add('hidden');
  renderArticleList();
  toast('已清空');
}

function swapArticles() {
  const refTitle = $('ref-title').value;
  const refContent = $('ref-content').value;
  $('ref-title').value = $('target-title').value;
  $('ref-content').value = $('target-content').value;
  $('target-title').value = refTitle;
  $('target-content').value = refContent;
  updateWordCount();
  if (state.lastResult) doCompare();
  toast('已交换');
}

async function copyResult() {
  if (!state.lastResult) {
    toast('请先执行对比', 'error');
    return;
  }
  const text = segmentsToText(state.lastResult.segments);
  try {
    await navigator.clipboard.writeText(text);
    toast('结果已复制到剪贴板', 'success');
  } catch (e) {
    // 降级方案
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      toast('已复制', 'success');
    } catch (err) {
      toast('复制失败', 'error');
    }
    document.body.removeChild(ta);
  }
}

function saveResult() {
  if (!state.lastResult) {
    toast('请先执行对比', 'error');
    return;
  }
  // 把待对比文章保存为新文章
  const title = $('target-title').value.trim() || '未命名';
  const content = $('target-content').value;
  if (!content) {
    toast('待对比文章为空', 'error');
    return;
  }
  openArticleModal({
    title: title + ' (对比版)',
    source: '对比结果',
    category: '',
    tags: [],
    content,
  });
}

// ===========================================
// 文件上传
// ===========================================
function handleFileUpload(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    $('target-content').value = text;
    if (!$('target-title').value) {
      $('target-title').value = file.name.replace(/\.(txt|md|markdown)$/i, '');
    }
    updateWordCount();
    toast(`已加载文件：${file.name}`);
  };
  reader.onerror = () => toast('文件读取失败', 'error');
  reader.readAsText(file, 'UTF-8');
}

// ===========================================
// 事件绑定
// ===========================================
function bindEvents() {
  // 搜索
  let searchTimer;
  $('search-input').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.search = e.target.value.trim();
      loadArticles();
    }, 300);
  });

  // 分类筛选
  $('category-filter').addEventListener('change', (e) => {
    state.filterCategory = e.target.value;
    loadArticles();
  });

  // 刷新
  $('refresh-btn').addEventListener('click', () => {
    loadArticles();
    loadCategories();
    toast('已刷新');
  });

  // 文章列表点击
  $('articles-ul').addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-action="edit"]');
    const delBtn = e.target.closest('[data-action="delete"]');
    if (editBtn) {
      e.stopPropagation();
      const a = state.articles.find(x => x.id === Number(editBtn.dataset.id));
      if (a) openArticleModal(a);
      return;
    }
    if (delBtn) {
      e.stopPropagation();
      deleteArticle(Number(delBtn.dataset.id));
      return;
    }
    const li = e.target.closest('li[data-id]');
    if (li) loadArticleToRef(Number(li.dataset.id));
  });

  // 新增
  $('new-article-btn').addEventListener('click', () => openArticleModal());
  $('article-save-btn').addEventListener('click', saveArticle);

  // 批量导入
  $('bulk-import-btn').addEventListener('click', () => {
    $('bulk-text').value = '';
    $('modal-bulk').classList.remove('hidden');
  });
  $('bulk-import-btn-confirm').addEventListener('click', bulkImport);

  // 弹窗关闭
  document.querySelectorAll('[data-close]').forEach(el => {
    el.addEventListener('click', () => {
      el.closest('.modal').classList.add('hidden');
    });
  });
  document.querySelectorAll('.modal').forEach(m => {
    m.addEventListener('click', (e) => {
      if (e.target === m) m.classList.add('hidden');
    });
  });

  // 对比操作
  $('compare-btn').addEventListener('click', doCompare);
  $('clear-btn').addEventListener('click', clearAll);
  $('swap-btn').addEventListener('click', swapArticles);
  $('copy-btn').addEventListener('click', copyResult);
  $('save-btn').addEventListener('click', saveResult);

  // 字数统计
  $('ref-content').addEventListener('input', updateWordCount);
  $('target-content').addEventListener('input', updateWordCount);

  // 文件上传
  $('file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFileUpload(file);
    e.target.value = '';
  });

  // 模式切换自动对比
  document.querySelectorAll('input[name="mode"]').forEach(r => {
    r.addEventListener('change', () => {
      if (state.lastResult) doCompare();
    });
  });

  // 拖拽上传
  $('target-content').addEventListener('dragover', (e) => {
    e.preventDefault();
    e.target.style.borderColor = 'var(--primary)';
  });
  $('target-content').addEventListener('dragleave', (e) => {
    e.target.style.borderColor = '';
  });
  $('target-content').addEventListener('drop', (e) => {
    e.preventDefault();
    e.target.style.borderColor = '';
    const file = e.dataTransfer.files[0];
    if (file && /\.(txt|md|markdown)$/i.test(file.name)) {
      handleFileUpload(file);
    } else {
      toast('请上传 .txt 或 .md 文件', 'error');
    }
  });

  // 快捷键：Ctrl/Cmd + Enter 执行对比
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      doCompare();
    }
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal:not(.hidden)').forEach(m => m.classList.add('hidden'));
    }
  });
}

// ===========================================
// 启动
// ===========================================
async function init() {
  bindEvents();
  updateWordCount();
  await loadCategories();
  await loadArticles();
}

init();
