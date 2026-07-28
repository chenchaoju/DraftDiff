// diff.js - 文本对比算法
// 支持三种模式：逐字 (char) / 逐句 (sentence) / 逐段 (paragraph)
// 输出统一为 segments 数组：[{ type, value, ... }, ...]

/**
 * 切分文本为句子（中英文混合）
 */
export function splitSentences(text) {
  if (!text) return [];
  // 先按换行切分；非空行再用句子终止符细切
  const result = [];
  const lines = text.split(/\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // 中英文终止符：。！？.!?；; 以及全角分号
    const parts = trimmed.split(/(?<=[。！？.!?；;])\s*/);
    for (const p of parts) {
      const t = p.trim();
      if (t) result.push(t);
    }
  }
  return result;
}

/**
 * 切分文本为段落
 */
export function splitParagraphs(text) {
  if (!text) return [];
  return text
    .split(/\n\s*\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
}

/**
 * 切分文本为字符（包含中文和英文）
 */
export function splitChars(text) {
  if (!text) return [];
  // 使用 Array.from 正确处理 Unicode（包括 emoji、中文）
  return Array.from(text);
}

/**
 * LCS 基础 diff
 * @param {string[]} a - 原文单位数组
 * @param {string[]} b - 新文单位数组
 * @returns {{type: string, value: string}[]}
 */
function lcsDiff(a, b) {
  const m = a.length, n = b.length;
  if (m === 0 && n === 0) return [];
  if (m === 0) return b.map(v => ({ type: 'add', value: v }));
  if (n === 0) return a.map(v => ({ type: 'remove', value: v }));

  // 用滚动数组优化空间
  let prev = new Array(n + 1).fill(0);
  let curr = new Array(n + 1).fill(0);

  // 先构建完整 DP 矩阵（用于回溯）。空间 O(m*n)
  // 对超长文本（如 > 5000 段）做降级
  if (m * n > 2_000_000) {
    return greedyDiff(a, b);
  }

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // 回溯
  const result = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      result.unshift({ type: 'same', value: a[i - 1] });
      i--; j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      result.unshift({ type: 'remove', value: a[i - 1] });
      i--;
    } else {
      result.unshift({ type: 'add', value: b[j - 1] });
      j--;
    }
  }
  while (i > 0) { i--; result.unshift({ type: 'remove', value: a[i] }); }
  while (j > 0) { j--; result.unshift({ type: 'add', value: b[j] }); }

  return result;
}

/**
 * 降级方案：贪心匹配（长文本时使用）
 */
function greedyDiff(a, b) {
  const result = [];
  const bSet = new Map();
  b.forEach((v, idx) => {
    if (!bSet.has(v)) bSet.set(v, []);
    bSet.get(v).push(idx);
  });
  const usedB = new Set();
  let lastB = -1;
  // 先匹配相同
  for (let i = 0; i < a.length; i++) {
    const candidates = bSet.get(a[i]) || [];
    let matched = -1;
    for (const idx of candidates) {
      if (!usedB.has(idx)) { matched = idx; break; }
    }
    if (matched >= 0) {
      // 补齐中间未匹配的 b 项为 add
      for (let k = lastB + 1; k < matched; k++) {
        if (!usedB.has(k)) result.push({ type: 'add', value: b[k] });
      }
      lastB = matched;
      usedB.add(matched);
      result.push({ type: 'same', value: a[i] });
    } else {
      result.push({ type: 'remove', value: a[i] });
    }
  }
  // 剩下的 b 都是 add
  for (let k = lastB + 1; k < b.length; k++) {
    if (!usedB.has(k)) result.push({ type: 'add', value: b[k] });
  }
  return result;
}

/**
 * 字符级相似度（用于判断"修改"）
 */
function charSimilarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const aChars = new Set(a);
  const bChars = new Set(b);
  let common = 0;
  for (const c of aChars) if (bChars.has(c)) common++;
  const total = aChars.size + bChars.size;
  if (total === 0) return 0;
  return (common * 2) / total;
}

/**
 * 简单相似度（共同字符数 / 最大长度）
 */
function overlapRatio(a, b) {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  if (a === b) return 1;
  const aChars = {};
  for (const c of a) aChars[c] = (aChars[c] || 0) + 1;
  let common = 0;
  for (const c of b) {
    if (aChars[c] > 0) { common++; aChars[c]--; }
  }
  return common / Math.max(a.length, b.length);
}

/**
 * 把相邻的 remove + add 标记为 modify
 * 长度差异过大的视为纯新增/纯删除，不算 modify
 */
function pairModifications(segments, threshold = 0.4) {
  const result = [];
  for (let i = 0; i < segments.length; i++) {
    const cur = segments[i];
    const next = segments[i + 1];

    const tryPair = (first, second) => {
      const lenA = first.value.length;
      const lenB = second.value.length;
      // 长度差异过大（>50%），视为纯新增或纯删除
      if (lenA === 0 || lenB === 0) return false;
      const ratio = Math.min(lenA, lenB) / Math.max(lenA, lenB);
      if (ratio < 0.5) return false;

      const sim = charSimilarity(first.value, second.value);
      return sim >= threshold;
    };

    // 情况1: remove 后跟 add
    if (cur.type === 'remove' && next && next.type === 'add') {
      if (tryPair(cur, next)) {
        result.push({ type: 'modify', value: next.value, oldValue: cur.value });
        i++;
        continue;
      }
    }

    // 情况2: add 后跟 remove
    if (cur.type === 'add' && next && next.type === 'remove') {
      if (tryPair(cur, next)) {
        result.push({ type: 'modify', value: cur.value, oldValue: next.value });
        i++;
        continue;
      }
    }

    result.push(cur);
  }
  return result;
}

/**
 * 检测段落移动
 * - 如果 remove 和 add 的内容相同（或高相似），标记为 move
 * - 如果某个 add 段落曾在原文中存在，标记为 move
 */
function detectParagraphMoves(segments) {
  const result = [...segments];

  // 第一步：收集所有 remove 和 add
  const removes = [];
  const adds = [];
  result.forEach((s, idx) => {
    if (s.type === 'remove') removes.push({ idx, value: s.value });
    if (s.type === 'add') adds.push({ idx, value: s.value });
  });

  // 第二步：精确匹配 remove 和 add（内容完全一致）
  const usedRemove = new Set();
  const usedAdd = new Set();
  for (const r of removes) {
    for (const a of adds) {
      if (usedRemove.has(r.idx) || usedAdd.has(a.idx)) continue;
      if (r.value === a.value) {
        result[r.idx] = { type: 'move', value: r.value, from: r.idx, to: a.idx };
        result[a.idx] = { type: 'move', value: a.value, from: r.idx, to: a.idx, placeholder: true };
        usedRemove.add(r.idx);
        usedAdd.add(a.idx);
        break;
      }
    }
  }

  // 第三步：合并成对的 move（去掉 placeholder）
  const merged = [];
  for (let i = 0; i < result.length; i++) {
    if (result[i].type === 'move' && result[i].placeholder) continue;
    merged.push(result[i]);
  }
  return merged;
}

/**
 * 主入口：对比两段文本
 * @param {string} textA - 参考文章
 * @param {string} textB - 待对比文章
 * @param {'char'|'sentence'|'paragraph'} mode
 */
export function diffText(textA, textB, mode = 'sentence') {
  let unitsA, unitsB;
  if (mode === 'char') {
    unitsA = splitChars(textA);
    unitsB = splitChars(textB);
  } else if (mode === 'paragraph') {
    unitsA = splitParagraphs(textA);
    unitsB = splitParagraphs(textB);
  } else {
    unitsA = splitSentences(textA);
    unitsB = splitSentences(textB);
  }

  let segments = lcsDiff(unitsA, unitsB);

  // 句子/段落模式下，识别 modify
  if (mode !== 'char') {
    segments = pairModifications(segments, mode === 'paragraph' ? 0.3 : 0.4);
  }

  // 仅段落模式做 move 检测
  if (mode === 'paragraph') {
    segments = detectParagraphMoves(segments);
  }

  // 合并相邻的同类型段
  segments = mergeAdjacent(segments);

  // 统计
  const stats = computeStats(segments, textA, textB);

  return { segments, stats, mode };
}

/**
 * 合并相邻同类型段（让渲染更整洁）
 */
function mergeAdjacent(segments) {
  if (segments.length === 0) return segments;
  const result = [segments[0]];
  for (let i = 1; i < segments.length; i++) {
    const prev = result[result.length - 1];
    const cur = segments[i];
    if (prev.type === cur.type && cur.type !== 'move' && cur.type !== 'modify') {
      prev.value = prev.value + (prev.value && cur.value ? '' : '') + cur.value;
      // 保留 oldValue 仅在 modify 时
    } else {
      result.push(cur);
    }
  }
  return result;
}

/**
 * 统计各项数据
 */
function computeStats(segments, textA, textB) {
  let added = 0, removed = 0, modified = 0, same = 0, moved = 0;
  for (const s of segments) {
    const len = (s.value || '').length;
    switch (s.type) {
      case 'add': added += len; break;
      case 'remove': removed += len; break;
      case 'modify':
        modified += 1;
        added += (s.value || '').length;
        removed += (s.oldValue || '').length;
        break;
      case 'same': same += len; break;
      case 'move': moved += 1; break;
    }
  }

  // 相似度 = 相同字符 / 最大长度
  const lenA = (textA || '').length;
  const lenB = (textB || '').length;
  const total = Math.max(lenA, lenB, 1);
  const similarity = Math.min(1, same / total);

  return {
    similarity,
    addedChars: added,
    removedChars: removed,
    modifiedCount: modified,
    sameChars: same,
    movedCount: moved,
    totalA: lenA,
    totalB: lenB,
  };
}

/**
 * 把 segments 转为可读文本（用于复制/导出）
 */
export function segmentsToText(segments) {
  const lines = [];
  for (const s of segments) {
    const prefix = {
      add: '[+ 新增] ',
      remove: '[- 删除] ',
      modify: '[~ 修改] ',
      move: '[⇄ 移动] ',
      same: '',
    }[s.type] || '';
    if (s.type === 'same') {
      lines.push(s.value);
    } else if (s.type === 'modify') {
      lines.push(prefix + s.oldValue);
      lines.push(prefix + s.value);
    } else {
      lines.push(prefix + s.value);
    }
  }
  return lines.join('\n');
}

/**
 * 把 segments 转为带颜色 span 的 HTML
 */
export function segmentsToHTML(segments, mode = 'sentence') {
  if (segments.length === 0) return '<div class="result-empty">两篇文章内容相同</div>';

  // 段落模式：用块级渲染
  if (mode === 'paragraph') {
    return segments.map(s => {
      const label = {
        add: '新增',
        remove: '删除',
        modify: '修改',
        move: '位置变化',
        same: '相同',
      }[s.type] || '';
      const safeValue = escapeHTML(s.value);
      return `<div class="diff-paragraph ${s.type}"><span class="diff-paragraph-label ${s.type}">${label}</span>${safeValue}</div>`;
    }).join('');
  }

  // 逐字 / 逐句：用内联 span
  return segments.map(s => {
    const safeValue = escapeHTML(s.value);
    return `<span class="diff-segment ${s.type}">${safeValue}</span>`;
  }).join('');
}

function escapeHTML(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
