/**
 * Subotiz A/B 测试管理后台 - 原型应用
 * 用于产品设计与 PRD 参考
 */

// 模拟数据
const mockExperiments = [
  {
    id: 'exp-001',
    name: '定价页标题 A/B 测试',
    createdAt: '2025-03-10 14:30',
    createdBy: 'zhangsan@example.com',
    updatedAt: '2025-03-15 09:20',
    updatedBy: 'zhangsan@example.com',
    target: '自定义',
    targetLabel: '新注册引导流程优化',
    goal: '验证新注册引导流程对用户激活率与功能使用深度的影响',
    customData: {
      direct: [
        { key: 'page_view', displayName: '页面访问数', aggregate: 'count' },
        { key: 'signup_complete', displayName: '注册完成数', aggregate: 'unique_users' },
        { key: 'session_duration', displayName: '平均会话时长', aggregate: 'mean' }
      ],
      derived: [
        { type: 'conversion', displayName: '注册转化率', numeratorKey: 'signup_complete' },
        { type: 'retention', displayName: '次日留存率', retentionPeriod: 'd1', basisKey: 'signup_complete' }
      ]
    },
    duration: '14 天',
    userCount: 1248,
    status: 'active',
    startedAt: '2025-03-10 09:00:00'
  },
  {
    id: 'exp-002',
    name: '价格表 CTA 按钮文案',
    createdAt: '2025-03-05 09:00',
    createdBy: 'lisi@example.com',
    updatedAt: '2025-03-14 16:45',
    updatedBy: 'lisi@example.com',
    target: '价格表',
    targetLabel: '月度价格表 (/pricing/monthly)',
    duration: '7 天',
    userCount: 562,
    status: 'draft'
  },
  {
    id: 'exp-003',
    name: '年付折扣展示方式',
    createdAt: '2025-02-28 16:00',
    createdBy: 'wangwu@example.com',
    updatedAt: '2025-03-21 18:00',
    updatedBy: 'wangwu@example.com',
    target: '定价',
    targetLabel: '年度套餐 (price_yyy)',
    duration: '21 天',
    userCount: 2103,
    status: 'ended',
    startedAt: '2025-02-28 17:00:00',
    endedAt: '2025-03-21 18:00:00'
  },
  {
    id: 'exp-004',
    name: '结算页 CTA 文案测试',
    createdAt: '2025-03-12 10:00',
    createdBy: 'lisi@example.com',
    updatedAt: '2025-03-18 11:30',
    updatedBy: 'zhangsan@example.com',
    target: '价格表',
    targetLabel: '月度价格表 (/pricing/monthly)',
    duration: '7 天',
    userCount: 856,
    status: 'paused',
    startedAt: '2025-03-12 11:00:00'
  }
];

// 原型：根据店铺近 30 天日均用户数计算「达到用户数后停止」的默认值（正式环境由接口返回日均后再计算）
function getDefaultEndUserCount(dailyAvg) {
  if (dailyAvg < 500) return 2000;
  if (dailyAvg < 5000) return 10000;
  return 50000;
}
const MOCK_SHOP_DAILY_AVG_LAST_30 = 800;

// 单个实验完整配置（详情页用）
function formatDetailTime(ts) {
  if (ts == null || ts === '') return '—';
  return String(ts);
}

function formatNowStamp() {
  const now = new Date();
  return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0') + ' ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ':' + String(now.getSeconds()).padStart(2, '0');
}

function buildDetailGroupsForExperiment(exp) {
  const base = [
    { name: '对照组', traffic: 34, isControl: true },
    { name: '实验组 A', traffic: 33 },
    { name: '实验组 B', traffic: 33 }
  ];
  if (!exp) {
    return base.map(g => ({ ...g, variable: '', meaning: '' }));
  }
  if (exp.target === '定价') {
    return base.map((g, i) => ({
      ...g,
      variable: i === 0 ? 'price_xxx' : i === 1 ? 'price_yyy' : 'price_xxx',
      meaning: ''
    }));
  }
  if (exp.target === '价格表') {
    return base.map(g => ({ ...g, variable: '/pricing/monthly', meaning: '' }));
  }
  return base.map((g, i) => ({ ...g, variable: `value${i + 1}`, meaning: '' }));
}

function getFormTargetTypeKey(exp) {
  if (!exp) return '';
  if (exp.target === '定价') return 'pricing';
  if (exp.target === '价格表') return 'price_table';
  return 'custom';
}

/** 合并 legacy customMetrics 与新版 customData */
function normalizeCustomData(exp) {
  if (!exp) return { direct: [], derived: [] };
  if (exp.customData && Array.isArray(exp.customData.direct)) {
    return {
      direct: exp.customData.direct.map(d => ({ ...d })),
      derived: Array.isArray(exp.customData.derived) ? exp.customData.derived.map(d => ({ ...d })) : []
    };
  }
  if (exp.customMetrics && exp.customMetrics.length) {
    return { direct: exp.customMetrics.map(m => ({ ...m })), derived: [] };
  }
  return { direct: [], derived: [] };
}

function getRetentionDaysFromDerived(der) {
  if (!der || der.type !== 'retention') return 1;
  if (der.retentionPeriod === 'd1') return 1;
  if (der.retentionPeriod === 'd7') return 7;
  if (der.retentionPeriod === 'd30') return 30;
  if (der.retentionPeriod === 'custom' && der.customDays != null) {
    const n = parseInt(String(der.customDays), 10);
    if (Number.isInteger(n)) return Math.max(2, Math.min(90, n));
  }
  return 1;
}

function defaultRetentionDisplayName(der) {
  if (!der || der.type !== 'retention') return '次日留存率';
  const n = getRetentionDaysFromDerived(der);
  if (der.retentionPeriod === 'd1') return '次日留存率';
  if (der.retentionPeriod === 'd7') return '7 日留存率';
  if (der.retentionPeriod === 'd30') return '30 日留存率';
  if (der.retentionPeriod === 'custom') return `${n} 日留存率`;
  return '次日留存率';
}

const getExperimentDetail = (id) => {
  const userAssignments = (() => {
    const groups = ['对照组', '实验组 A', '实验组 B'];
    const list = [];
    for (let i = 1; i <= 25; i++) {
      const n = String(i).padStart(3, '0');
      const base = ['abc', 'def', 'ghi', 'jkl', 'mno'][(i - 1) % 5] + n;
      const experimentUid = 'expuid_' + base;
      let customerIds = ['cust_' + n];
      let payerIds = ['payer_' + n + '_' + (1000 + i)];
      if (i % 4 === 0) {
        customerIds = ['cust_' + n, 'cust_legacy_' + n, 'cust_merge_' + n];
      }
      if (i % 5 === 0) {
        payerIds = ['payer_' + n + '_' + (1000 + i), 'payer_shop2_' + n];
      }
      if (i === 7) {
        customerIds = ['cust_007', 'cust_backup_007', 'cust_staging_007'];
        payerIds = ['payer_007', 'payer_alt_007'];
      }
      list.push({
        rowKey: 'usr_' + n,
        experimentUid,
        customerIds,
        payerIds,
        ip: '203.0.113.' + String((i % 200) + 1),
        group: groups[(i - 1) % 3],
        assignedAt: '2025-03-10 14:' + String(30 + (i % 30)).padStart(2, '0')
      });
    }
    return list;
  })();
  const exp = experiments.find(e => e.id === id);
  const commonRules = [
    { dimension: '国家', value: '美国、英国' },
    { dimension: '来源渠道', value: 'organic' }
  ];
  if (!exp) {
    return {
      goal: '提升定价页下单转化率',
      targetType: '定价',
      targetName: '专业版定价',
      targetId: 'price_xxx',
      endUserStop: 10000,
      endRunDays: 30,
      userScope: '定向',
      userScopeRules: commonRules,
      groups: buildDetailGroupsForExperiment(null),
      userAssignments
    };
  }
  const ttLabel = exp.target === '定价' ? '定价' : exp.target === '价格表' ? '价格表' : '自定义';
  const nameMatch = exp.targetLabel.match(/^([^(]+)/);
  const targetName = nameMatch ? nameMatch[1].trim() : exp.targetLabel;
  const idMatch = exp.targetLabel.match(/\(([^)]+)\)/);
  return {
    ...exp,
    goal: exp.goal || '提升定价页下单转化率',
    targetType: ttLabel,
    targetName,
    targetId: idMatch ? idMatch[1] : '',
    endUserStop: exp.endUserStop != null ? exp.endUserStop : 10000,
    endRunDays: exp.endRunDays != null ? exp.endRunDays : 30,
    userScope: exp.userScopeSaved || '定向',
    userScopeRules: exp.userScopeRulesSaved || commonRules,
    groups: (exp.savedGroups && exp.savedGroups.length) ? exp.savedGroups : buildDetailGroupsForExperiment(exp),
    customData: normalizeCustomData(exp),
    userAssignments
  };
};

// 实验数据（数据 Tab 用）- 5 层转化漏斗，转化率由数据列计算
const conversionFormulas = [
  '发起结账用户数 ÷ 浏览用户数',
  '提交订单用户数 ÷ 发起结账用户数',
  '完成支付操作用户数 ÷ 提交订单用户数',
  '支付成功用户数 ÷ 完成支付操作用户数',
  '支付成功用户数 ÷ 浏览用户数'
];
/** 自定义指标聚合方式：与表单 option value 一致 */
const CUSTOM_AGGREGATE_META = {
  count: { label: '计数（触发次数）', short: '计数' },
  unique_users: { label: '去重用户数', short: '去重用户' },
  sum: { label: '求和', short: '求和' },
  mean: { label: '均值', short: '均值' }
};

/** 留存率计算依据：非业务事件 key，表示 SDK 初始化时上报用户标识对应的浏览用户口径 */
const RETENTION_BASIS_SDK_INIT_BROWSE = '__sdk_init_browse__';
const RETENTION_BASIS_SDK_INIT_BROWSE_LABEL = '浏览用户（SDK 初始化口径）';

function getAggregateShort(agg) {
  return (CUSTOM_AGGREGATE_META[agg] && CUSTOM_AGGREGATE_META[agg].short) || agg;
}

const DIRECT_TOOLTIP_BY_AGG = {
  count: '统计该事件被触发的总次数',
  unique_users: '统计触发过该事件的唯一用户数',
  sum: '对该事件上报的 value 值累计求和',
  mean: '对该事件上报的 value 值求算术平均'
};

function buildDirectTooltip(agg) {
  return DIRECT_TOOLTIP_BY_AGG[agg] || '';
}

function buildDerivedTooltip(der, keyToLabel) {
  if (der.type === 'ratio') {
    const a = keyToLabel[der.numeratorKey] || der.numeratorKey;
    const b = keyToLabel[der.denominatorKey] || der.denominatorKey;
    return `${a} ÷ ${b}`;
  }
  if (der.type === 'conversion') {
    const a = keyToLabel[der.numeratorKey] || der.numeratorKey;
    return `${a} ÷ 分组总用户数`;
  }
  if (der.type === 'retention') {
    const n = getRetentionDaysFromDerived(der);
    if (der.basisKey === RETENTION_BASIS_SDK_INIT_BROWSE) {
      return `首日按 SDK 初始化口径识别的浏览用户中，第 ${n} 日再次活跃的用户占比，基于用户 ID 计算`;
    }
    const evt = keyToLabel[der.basisKey] || der.basisKey;
    return `首日触发过「${evt}」的用户中，第 ${n} 日再次触发的用户占比，基于用户 ID 计算`;
  }
  return '';
}

function buildCustomDataColumnsMeta(exp) {
  const cd = normalizeCustomData(exp);
  const keyToLabel = {};
  cd.direct.forEach(d => {
    if (d.key) keyToLabel[d.key] = d.displayName || d.key;
  });
  const cols = [];
  cd.direct.forEach(d => {
    cols.push({
      kind: 'direct',
      key: d.key,
      displayName: d.displayName,
      aggregate: d.aggregate,
      tooltip: buildDirectTooltip(d.aggregate)
    });
  });
  cd.derived.forEach((der, i) => {
    cols.push({
      kind: 'derived',
      derivedType: der.type,
      index: i,
      displayName: der.displayName,
      tooltip: buildDerivedTooltip(der, keyToLabel)
    });
  });
  return cols;
}

/** 实验数据 Tab：自定义实验可附带 customDataColumns / customDataRows */
function getExperimentData(id) {
  const exp = experiments.find(e => e.id === id);
  const data = {
    duration: '14 天',
    participantCount: 1248,
    metricLabels: ['浏览用户数', '发起结账用户数', '提交订单用户数', '完成支付操作用户数', '支付成功用户数'],
    conversionLabels: ['浏览结账率', '订单提交率', '支付操作完成率', '支付成功率', '浏览转化率'],
    rows: [
      { group: '对照组', values: [420, 168, 126, 105, 84], browseConversionConfidence: null },
      { group: '实验组 A', values: [408, 183, 146, 122, 98], browseConversionConfidence: 0.93 },
      { group: '实验组 B', values: [420, 176, 123, 98, 74], browseConversionConfidence: 0.84 }
    ],
    revenueRows: [
      { group: '对照组', payingUsers: 84, orderCount: 105, gmv: 12500, arpu: 148.8, renewalRate: 0.85, refundRate: 0.021, chargebackRate: 0.003, confidence: null },
      { group: '实验组 A', payingUsers: 98, orderCount: 122, gmv: 15800, arpu: 161.2, renewalRate: 0.88, refundRate: 0.018, chargebackRate: 0.002, confidence: [0.98, 0.88, 0.85, 0.90, 0.78] },
      { group: '实验组 B', payingUsers: 74, orderCount: 98, gmv: 11200, arpu: 151.4, renewalRate: 0.82, refundRate: 0.025, chargebackRate: 0.004, confidence: [0.82, 0.90, 0.75, 0.92, 0.80] }
    ]
  };
  const cd = exp && normalizeCustomData(exp);
  if (exp && exp.target === '自定义' && cd && (cd.direct.length || cd.derived.length)) {
    data.customDataColumns = buildCustomDataColumnsMeta(exp);
    data.customDataRows = buildMockCustomDataRows(exp, data.customDataColumns);
  }
  return data;
}

/** 自定义数据 Tab 行：与列顺序对齐；派生类为 0～1 小数；均值为未加单位数字 */
function buildMockCustomDataRows(exp, columns) {
  const n = (columns && columns.length) || 0;
  if (exp.id === 'exp-001' && n >= 5) {
    return [
      { group: '对照组', values: [1240, 312, 118, 0.252, 0.384] },
      { group: '实验组 A', values: [1198, 401, 143, 0.335, 0.476] },
      { group: '实验组 B', values: [1260, 288, 109, 0.229, 0.341] }
    ];
  }
  const groups = (exp.savedGroups && exp.savedGroups.length) ? exp.savedGroups : buildDetailGroupsForExperiment(exp);
  return groups.map(g => ({
    group: g.name,
    values: Array.from({ length: n }, () => null)
  }));
}

function formatCustomDataCellDisplay(raw, col) {
  if (raw == null || raw === '') return '—';
  if (!col) return String(raw);
  if (col.kind === 'direct') {
    if (col.aggregate === 'mean') return String(raw) + 's';
    return String(raw);
  }
  if (col.kind === 'derived') {
    const num = Number(raw);
    if (Number.isNaN(num)) return '—';
    if (col.derivedType === 'ratio' || col.derivedType === 'conversion' || col.derivedType === 'retention') {
      return (num * 100).toFixed(1) + '%';
    }
  }
  return String(raw);
}

function escapeHtmlText(s) {
  if (s == null || s === '') return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function pickMultiValueDisplayIndex(values, searchLower) {
  if (!values || values.length === 0) return 0;
  const sl = String(searchLower || '').trim().toLowerCase();
  if (!sl) return 0;
  const i = values.findIndex(v => String(v).toLowerCase().includes(sl));
  return i >= 0 ? i : 0;
}

/** customer id / payer id 多值：单值纯文本，多值用下拉；搜索命中时默认选中匹配项 */
function htmlDetailMultiValueCell(values, searchLower, dataMultiKind) {
  const arr = Array.isArray(values) ? values.filter(v => v != null && String(v).trim() !== '') : (values != null && String(values).trim() !== '' ? [values] : []);
  if (arr.length === 0) return '<td>—</td>';
  if (arr.length === 1) {
    return `<td>${escapeHtmlText(String(arr[0]))}</td>`;
  }
  const selIdx = pickMultiValueDisplayIndex(arr, searchLower);
  const opts = arr.map((v, i) =>
    `<option value="${escapeHtmlAttr(String(v))}"${i === selIdx ? ' selected' : ''}>${escapeHtmlText(String(v))}</option>`
  ).join('');
  return `<td><select class="detail-multi-select" data-multi="${escapeHtmlAttr(dataMultiKind)}" aria-label="多个值，可切换查看">${opts}</select></td>`;
}

function userAssignmentMatchesSearch(u, searchLower) {
  if (!searchLower) return true;
  const sl = String(searchLower).trim().toLowerCase();
  const parts = [];
  if (u.experimentUid) parts.push(String(u.experimentUid));
  (u.customerIds || []).forEach(x => parts.push(String(x)));
  (u.payerIds || []).forEach(x => parts.push(String(x)));
  if (u.ip) parts.push(String(u.ip));
  return parts.some(p => p.toLowerCase().includes(sl));
}

function htmlDirectMetricRow(key, displayName, aggregate, readOnly) {
  const ro = readOnly ? ' readonly class="is-readonly-input"' : '';
  const roSel = readOnly ? ' disabled class="is-readonly-select"' : '';
  const opts = Object.keys(CUSTOM_AGGREGATE_META).map(k =>
    `<option value="${k}"${(aggregate || 'count') === k ? ' selected' : ''}>${CUSTOM_AGGREGATE_META[k].label}</option>`
  ).join('');
  return `
    <div class="direct-metric-row custom-metric-row">
      <input type="text" class="direct-metric-key custom-metric-key" placeholder="signup_complete" value="${escapeHtmlAttr(key || '')}"${ro} />
      <input type="text" class="direct-metric-label custom-metric-label" placeholder="注册完成数" value="${escapeHtmlAttr(displayName || '')}"${ro} />
      <select class="direct-metric-agg custom-metric-agg"${roSel}>${opts}</select>
      <button type="button" class="btn-text-direct-metric-del btn-text-custom-metric-del"${readOnly ? ' disabled' : ''}>删除</button>
    </div>
  `;
}

function htmlDerivedMetricRowShell(readOnly) {
  const dis = readOnly ? ' disabled' : '';
  return `
    <div class="derived-metric-row">
      <div class="derived-metric-grid">
        <span class="derived-field-label">派生类型</span>
        <select class="derived-type-select"${dis}>
          <option value="">请选择</option>
          <option value="ratio">比率（数据项 ÷ 数据项）</option>
          <option value="conversion">转化率（数据项 ÷ 分组用户数）</option>
          <option value="retention">留存率</option>
        </select>
        <div class="derived-type-fields"></div>
        <button type="button" class="btn-text-derived-metric-del"${dis}>删除</button>
      </div>
    </div>
  `;
}

function getCompleteDirectListFromForm(form) {
  const rows = form.querySelectorAll('#directMetricsRows .direct-metric-row');
  const list = [];
  rows.forEach(row => {
    const key = row.querySelector('.direct-metric-key')?.value.trim();
    const label = row.querySelector('.direct-metric-label')?.value.trim();
    const agg = row.querySelector('.direct-metric-agg')?.value;
    if (key && label && agg) list.push({ key, displayName: label, aggregate: agg });
  });
  return list;
}

function buildDirectKeyOptionsHtml(directList, selected, filterFn) {
  const list = filterFn ? directList.filter(filterFn) : directList;
  return list.map(d =>
    `<option value="${escapeHtmlAttr(d.key)}"${d.key === selected ? ' selected' : ''}>${escapeHtmlText(d.displayName || d.key)}</option>`
  ).join('');
}

function buildRetentionBasisOptionsHtml(directList, selected) {
  const sel = selected || '';
  const sdkSel = sel === RETENTION_BASIS_SDK_INIT_BROWSE ? ' selected' : '';
  const sdkOpt = `<option value="${escapeHtmlAttr(RETENTION_BASIS_SDK_INIT_BROWSE)}"${sdkSel}>${escapeHtmlText(RETENTION_BASIS_SDK_INIT_BROWSE_LABEL)}</option>`;
  const directSel = sel === RETENTION_BASIS_SDK_INIT_BROWSE ? '' : sel;
  return sdkOpt + buildDirectKeyOptionsHtml(directList, directSel);
}

function updateRetentionHintForRow(row, n) {
  const fields = row?.querySelector('.derived-type-fields');
  const hint = fields?.querySelector('.derived-retention-hint');
  if (!hint || !row) return;
  const basis = row.querySelector('.derived-retention-basis')?.value;
  if (basis === RETENTION_BASIS_SDK_INIT_BROWSE) {
    hint.textContent = `基于 SDK 初始化时上报的用户标识，判断第 ${n} 日是否再次活跃；SDK 需传入用户 ID（浏览用户为 SDK 初始化口径）`;
  } else {
    hint.textContent = `基于用户 ID 判断首日触发该事件的用户在第 ${n} 日是否再次触发，SDK 需传入用户 ID`;
  }
}

function renderDerivedFieldsHtml(type, der, directList, readOnly) {
  const ro = readOnly ? ' readonly' : '';
  const roSel = readOnly ? ' disabled' : '';
  const d = der || {};
  if (type === 'ratio') {
    return `
      <div class="derived-fields-inner derived-fields-ratio">
        <input type="text" class="derived-display-name" placeholder="展示名称" value="${escapeHtmlAttr(d.displayName || '')}"${ro} />
        <select class="derived-ratio-num"${roSel}>${buildDirectKeyOptionsHtml(directList, d.numeratorKey)}</select>
        <span class="derived-slash">÷</span>
        <select class="derived-ratio-den"${roSel}>${buildDirectKeyOptionsHtml(directList, d.denominatorKey)}</select>
      </div>`;
  }
  if (type === 'conversion') {
    return `
      <div class="derived-fields-inner derived-fields-conversion">
        <input type="text" class="derived-display-name" placeholder="展示名称" value="${escapeHtmlAttr(d.displayName || '')}"${ro} />
        <select class="derived-conv-num"${roSel}>${buildDirectKeyOptionsHtml(directList, d.numeratorKey, x => x.aggregate === 'unique_users')}</select>
        <span class="derived-fixed-den">分组总用户数</span>
      </div>`;
  }
  if (type === 'retention') {
    const period = d.retentionPeriod || 'd1';
    const customDays = d.customDays != null ? d.customDays : 7;
    const basis = d.basisKey || '';
    const n = getRetentionDaysFromDerived({ type: 'retention', retentionPeriod: period, customDays });
    const customVisible = period === 'custom' ? '' : ' style="display:none"';
    const isSdkBrowse = basis === RETENTION_BASIS_SDK_INIT_BROWSE;
    const hint = isSdkBrowse
      ? `基于 SDK 初始化时上报的用户标识，判断第 ${n} 日是否再次活跃；SDK 需传入用户 ID（浏览用户为 SDK 初始化口径）`
      : `基于用户 ID 判断首日触发该事件的用户在第 ${n} 日是否再次触发，SDK 需传入用户 ID`;
    return `
      <div class="derived-fields-inner derived-fields-retention">
        <input type="text" class="derived-display-name retention-display-name-input" placeholder="展示名称" value="${escapeHtmlAttr(d.displayName || '')}"${ro} />
        <select class="derived-retention-period"${roSel}>
          <option value="d1"${period === 'd1' ? ' selected' : ''}>次日（1 日）</option>
          <option value="d7"${period === 'd7' ? ' selected' : ''}>7 日</option>
          <option value="d30"${period === 'd30' ? ' selected' : ''}>30 日</option>
          <option value="custom"${period === 'custom' ? ' selected' : ''}>自定义天数</option>
        </select>
        <input type="number" class="derived-retention-custom-days" min="2" max="90" step="1" value="${escapeHtmlAttr(String(customDays))}"${customVisible}${roSel} />
        <label class="derived-basis-label">计算依据</label>
        <select class="derived-retention-basis"${roSel}>${buildRetentionBasisOptionsHtml(directList, basis)}</select>
        <p class="form-hint derived-retention-hint">${escapeHtmlText(hint)}</p>
      </div>`;
  }
  return '';
}

function htmlDerivedRowFromData(der, directList, readOnly) {
  if (!der || !der.type) return htmlDerivedMetricRowShell(readOnly);
  const shell = htmlDerivedMetricRowShell(readOnly);
  const div = document.createElement('div');
  div.innerHTML = shell.trim();
  const row = div.firstElementChild;
  const sel = row.querySelector('.derived-type-select');
  if (sel) {
    sel.value = der.type;
    const fields = row.querySelector('.derived-type-fields');
    if (fields) fields.innerHTML = renderDerivedFieldsHtml(der.type, der, directList, readOnly);
  }
  return row.outerHTML;
}

function collectDerivedRowsFromForm(form) {
  const rows = form.querySelectorAll('#derivedMetricsRows .derived-metric-row');
  const derived = [];
  rows.forEach(row => {
    const type = row.querySelector('.derived-type-select')?.value;
    if (!type) return;
    if (type === 'ratio') {
      const displayName = row.querySelector('.derived-display-name')?.value.trim();
      const numeratorKey = row.querySelector('.derived-ratio-num')?.value;
      const denominatorKey = row.querySelector('.derived-ratio-den')?.value;
      derived.push({ type: 'ratio', displayName, numeratorKey, denominatorKey });
    } else if (type === 'conversion') {
      const displayName = row.querySelector('.derived-display-name')?.value.trim();
      const numeratorKey = row.querySelector('.derived-conv-num')?.value;
      derived.push({ type: 'conversion', displayName, numeratorKey });
    } else if (type === 'retention') {
      const displayName = row.querySelector('.derived-display-name')?.value.trim();
      const retentionPeriod = row.querySelector('.derived-retention-period')?.value || 'd1';
      const basisKey = row.querySelector('.derived-retention-basis')?.value;
      let customDays;
      if (retentionPeriod === 'custom') {
        const c = parseInt(String(row.querySelector('.derived-retention-custom-days')?.value || '').trim(), 10);
        if (Number.isInteger(c)) customDays = Math.max(2, Math.min(90, c));
      }
      derived.push({ type: 'retention', displayName, retentionPeriod, basisKey, customDays });
    }
  });
  return derived;
}

function collectCustomDataFromForm(formEl) {
  if (!formEl || !isCustomMetricsDetailExpanded(formEl)) return { direct: [], derived: [] };
  const directRows = formEl.querySelectorAll('#directMetricsRows .direct-metric-row');
  const direct = [];
  directRows.forEach(row => {
    const key = row.querySelector('.direct-metric-key')?.value.trim();
    const label = row.querySelector('.direct-metric-label')?.value.trim();
    const agg = row.querySelector('.direct-metric-agg')?.value;
    if (key && label && agg) direct.push({ key, displayName: label, aggregate: agg });
  });
  const derived = collectDerivedRowsFromForm(formEl).filter(d => {
    if (d.type === 'ratio') return !!(d.displayName && d.numeratorKey && d.denominatorKey);
    if (d.type === 'conversion') return !!(d.displayName && d.numeratorKey);
    if (d.type === 'retention') return !!(d.displayName && d.basisKey && d.retentionPeriod);
    return false;
  });
  return { direct, derived };
}

function findDerivedRefsToDirectKey(key, derivedList) {
  const names = [];
  (derivedList || []).forEach(d => {
    if (!d || !d.type) return;
    if (d.type === 'ratio' && (d.numeratorKey === key || d.denominatorKey === key)) names.push(d.displayName || '派生指标');
    if (d.type === 'conversion' && d.numeratorKey === key) names.push(d.displayName || '派生指标');
    if (d.type === 'retention' && d.basisKey && d.basisKey !== RETENTION_BASIS_SDK_INIT_BROWSE && d.basisKey === key) names.push(d.displayName || '派生指标');
  });
  return names;
}

function hasCustomDataContent(form) {
  if (!form) return false;
  const rowsD = form.querySelectorAll('#directMetricsRows .direct-metric-row');
  for (let i = 0; i < rowsD.length; i++) {
    const row = rowsD[i];
    const key = row.querySelector('.direct-metric-key')?.value.trim();
    const label = row.querySelector('.direct-metric-label')?.value.trim();
    if (key || label) return true;
  }
  const rowsDer = form.querySelectorAll('#derivedMetricsRows .derived-metric-row');
  for (let i = 0; i < rowsDer.length; i++) {
    const row = rowsDer[i];
    if (row.querySelector('.derived-type-select')?.value) return true;
    if (row.querySelector('.derived-display-name')?.value.trim()) return true;
  }
  return false;
}

function refreshDirectMetricDeleteButtons(form) {
  const scope = form || document;
  const rows = scope.querySelectorAll('#directMetricsRows .direct-metric-row');
  const single = rows.length <= 1;
  rows.forEach(row => {
    const btn = row.querySelector('.btn-text-direct-metric-del');
    if (btn) btn.disabled = single;
  });
}

function formAllowsEmptyDirectRowsForDerived(form) {
  const rows = Array.from(form.querySelectorAll('#derivedMetricsRows .derived-metric-row'));
  if (rows.length === 0) return false;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const t = row.querySelector('.derived-type-select')?.value;
    if (!t) return false;
    if (t === 'ratio' || t === 'conversion') return false;
    if (t !== 'retention') return false;
    const basis = row.querySelector('.derived-retention-basis')?.value;
    if (basis !== RETENTION_BASIS_SDK_INIT_BROWSE) return false;
    const dn = row.querySelector('.derived-display-name')?.value.trim();
    const period = row.querySelector('.derived-retention-period')?.value;
    if (!dn || !period) return false;
    if (period === 'custom') {
      const c = parseInt(String(row.querySelector('.derived-retention-custom-days')?.value || '').trim(), 10);
      if (!Number.isInteger(c) || c < 2 || c > 90) return false;
    }
  }
  return true;
}

function refreshDerivedAddButtonState(form) {
  const btn = form.querySelector('#addDerivedMetricBtn');
  if (!btn) return;
  const list = getCompleteDirectListFromForm(form);
  btn.disabled = false;
  btn.title = list.length === 0
    ? '未配置直接数据时，仅支持添加留存率并将计算依据选为「浏览用户（SDK 初始化口径）」；比率/转化率等需先添加直接数据'
    : '';
}

function refreshDerivedSelectOptionsInForm(form) {
  const directList = getCompleteDirectListFromForm(form);
  form.querySelectorAll('#derivedMetricsRows .derived-metric-row').forEach(row => {
    const type = row.querySelector('.derived-type-select')?.value;
    if (type === 'ratio') {
      ['derived-ratio-num', 'derived-ratio-den'].forEach(cls => {
        const sel = row.querySelector('.' + cls);
        if (!sel) return;
        const cur = sel.value;
        sel.innerHTML = buildDirectKeyOptionsHtml(directList, cur);
      });
    } else if (type === 'conversion') {
      const sel = row.querySelector('.derived-conv-num');
      if (sel) {
        const cur = sel.value;
        sel.innerHTML = buildDirectKeyOptionsHtml(directList, cur, x => x.aggregate === 'unique_users');
      }
    } else if (type === 'retention') {
      const sel = row.querySelector('.derived-retention-basis');
      if (sel) {
        const cur = sel.value;
        sel.innerHTML = buildRetentionBasisOptionsHtml(directList, cur);
      }
    }
  });
}

function refreshCustomMetricDeleteButtons() {
  const createForm = document.getElementById('createForm');
  const editForm = document.getElementById('editExperimentForm');
  if (createForm) refreshDirectMetricDeleteButtons(createForm);
  if (editForm) refreshDirectMetricDeleteButtons(editForm);
}

/** 兼容旧逻辑：仅直接指标列表 */
function collectCustomMetricsFromForm(formEl) {
  return collectCustomDataFromForm(formEl).direct;
}

function isCustomMetricsDetailExpanded(formEl) {
  if (!formEl) return false;
  const d = formEl.querySelector('#customMetricsDetailWrap');
  return !!(d && !d.hidden && d.style.display !== 'none');
}

const CUSTOM_DATA_HINT_POPOVER = `
                <span class="revenue-hint-wrap custom-metrics-info-hint" tabindex="0" aria-label="自定义数据说明">
                  <span class="revenue-hint-icon" aria-hidden="true">?</span>
                  <span class="revenue-hint-popover revenue-hint-popover-wide" role="tooltip">
                    <p class="revenue-hint-popover-body"><strong>何时添加</strong>：当您需要把<strong>商户站内业务事件</strong>（如注册完成、关键按钮点击、停留时长等）与实验分组关联统计、并与默认指标一并查看时，可点击左侧展开配置；前端通过 SDK <code>subotiz.track(key, value)</code> 上报后，后台按实验分组聚合展示在「自定义数据」模块。</p>
                    <p class="revenue-hint-popover-body" style="margin-top:10px;"><strong>不添加自定义数据时</strong>：实验数据 Tab 仍展示 Subotiz 侧默认数据，包括<strong>转化数据</strong>（浏览与各环节转化漏斗）与<strong>收入与风险数据</strong>（GMV、ARPU、续费率、退款率等），来源为平台侧埋点与账单数据。</p>
                  </span>
                </span>`;

function buildCustomDataDetailInnerHtml(exp, readOnly) {
  const cd = normalizeCustomData(exp);
  const directRows = cd.direct.length
    ? cd.direct.map(m => htmlDirectMetricRow(m.key, m.displayName, m.aggregate, readOnly)).join('')
    : '';
  const derivedRows = (cd.derived || []).map(der => htmlDerivedRowFromData(der, cd.direct, readOnly)).join('');
  return `
        <div class="custom-metrics-detail-head">
          <div class="custom-metrics-detail-head-left">
            <span class="form-label custom-metrics-section-label">自定义数据配置</span>
            ${CUSTOM_DATA_HINT_POPOVER}
          </div>
          ${readOnly ? '' : '<button type="button" class="btn-link-text btn-link-text-subtle" id="removeCustomMetricsBtn">移除自定义数据</button>'}
        </div>
        <div class="custom-data-subsection">
          <div class="custom-data-subsection-title">直接数据</div>
          <p class="form-hint">商户通过 SDK 调用 subotiz.track(key, value) 上报，系统按聚合方式汇总后展示在数据 Tab。</p>
          <div class="custom-metrics-table-wrap direct-metrics-table-wrap">
            <div class="custom-metrics-table-header direct-metrics-table-header">
              <span>数据 Key</span>
              <span>展示名称</span>
              <span>聚合方式</span>
              <span class="custom-metrics-th-action"></span>
            </div>
            <div id="directMetricsRows">${directRows}</div>
          </div>
          ${readOnly ? '' : '<button type="button" class="btn btn-ghost btn-sm" id="addDirectMetricBtn">+ 添加直接数据</button>'}
        </div>
        <div class="custom-data-subsection">
          <div class="custom-data-subsection-title">派生数据</div>
          <p class="form-hint">基于已配置的直接数据进行二次计算，无需 SDK 额外上报。</p>
          <div id="derivedMetricsRows">${derivedRows}</div>
          ${readOnly ? '' : '<button type="button" class="btn btn-ghost btn-sm" id="addDerivedMetricBtn" title="">+ 添加派生数据</button>'}
        </div>`;
}

function buildEditCustomMetricsSectionHtml(exp, ttSelectVal, restricted) {
  if (ttSelectVal !== 'custom') return '';
  const cd = normalizeCustomData(exp);
  const hasCfg = cd.direct.length > 0 || (cd.derived && cd.derived.length > 0);
  if (restricted) {
    if (!hasCfg) return '';
    return `
      <div id="customMetricsOptionalWrap" class="form-group custom-metrics-optional-wrap">
        ${buildCustomDataDetailInnerHtml(exp, true)}
      </div>`;
  }
  return `
    <div id="customMetricsOptionalWrap" class="form-group custom-metrics-optional-wrap">
      <div id="customMetricsCollapsedRow" class="custom-metrics-collapsed-row" style="display:${hasCfg ? 'none' : ''};">
        <button type="button" class="btn-link-text btn-link-text-subtle" id="toggleCustomMetricsBtn">添加自定义数据</button>
        ${CUSTOM_DATA_HINT_POPOVER}
      </div>
      <div id="customMetricsDetailWrap" class="custom-metrics-detail-wrap" style="display:${hasCfg ? 'block' : 'none'};" ${hasCfg ? '' : 'hidden'}>
        ${buildCustomDataDetailInnerHtml(exp, false)}
      </div>
    </div>`;
}

function expandCustomMetricsSection(form) {
  const detail = form.querySelector('#customMetricsDetailWrap');
  const collapsed = form.querySelector('#customMetricsCollapsedRow');
  if (collapsed) collapsed.style.display = 'none';
  if (detail) {
    detail.style.display = 'block';
    detail.hidden = false;
  }
  const directHost = form.querySelector('#directMetricsRows');
  if (directHost && !directHost.querySelector('.direct-metric-row')) {
    directHost.innerHTML = htmlDirectMetricRow('', '', 'count', false);
  }
  refreshDirectMetricDeleteButtons(form);
  refreshDerivedAddButtonState(form);
  refreshDerivedSelectOptionsInForm(form);
}

function collapseCustomMetricsSection(form) {
  const detail = form.querySelector('#customMetricsDetailWrap');
  const collapsed = form.querySelector('#customMetricsCollapsedRow');
  if (detail) {
    detail.style.display = 'none';
    detail.hidden = true;
  }
  if (collapsed) collapsed.style.display = '';
  const directHost = form.querySelector('#directMetricsRows');
  if (directHost) directHost.innerHTML = '';
  const derivedHost = form.querySelector('#derivedMetricsRows');
  if (derivedHost) derivedHost.innerHTML = '';
  (form.id === 'createForm' ? clearCreateFormErrors : clearEditFormErrors)();
}

function showCustomDataCollapseConfirmModal(onConfirm) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'customDataCollapseOverlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:400px;">
      <div class="modal-header"><span class="modal-title">提示</span></div>
      <div class="modal-body"><p style="margin:0;">收起后已填写的自定义数据配置将清空，是否继续？</p></div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" id="customDataCollapseCancel">取消</button>
        <button type="button" class="btn btn-primary" id="customDataCollapseOk">继续</button>
      </div>
    </div>
  `;
  const remove = () => { overlay.remove(); };
  overlay.querySelector('#customDataCollapseCancel').addEventListener('click', remove);
  overlay.querySelector('#customDataCollapseOk').addEventListener('click', () => {
    remove();
    onConfirm();
  });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) remove(); });
  document.body.appendChild(overlay);
}

function bindCustomMetricsInteractions(formSelector) {
  const form = typeof formSelector === 'string' ? document.querySelector(formSelector) : formSelector;
  if (!form || form._customMetricsBound) return;
  form._customMetricsBound = true;

  form.addEventListener('click', (e) => {
    const toggleBtn = e.target.closest('#toggleCustomMetricsBtn');
    if (toggleBtn && form.contains(toggleBtn)) {
      if (!form.querySelector('#customMetricsDetailWrap')) return;
      expandCustomMetricsSection(form);
      return;
    }
    const removeBtn = e.target.closest('#removeCustomMetricsBtn');
    if (removeBtn && form.contains(removeBtn)) {
      if (!hasCustomDataContent(form)) {
        collapseCustomMetricsSection(form);
      } else {
        showCustomDataCollapseConfirmModal(() => collapseCustomMetricsSection(form));
      }
      return;
    }
    const addDirect = e.target.closest('#addDirectMetricBtn');
    if (addDirect && form.contains(addDirect) && !addDirect.disabled) {
      form.querySelector('#directMetricsRows')?.insertAdjacentHTML('beforeend', htmlDirectMetricRow('', '', 'count', false));
      refreshDirectMetricDeleteButtons(form);
      refreshDerivedAddButtonState(form);
      refreshDerivedSelectOptionsInForm(form);
      (form.id === 'createForm' ? clearCreateFormErrors : clearEditFormErrors)();
      return;
    }
    const addDerived = e.target.closest('#addDerivedMetricBtn');
    if (addDerived && form.contains(addDerived) && !addDerived.disabled) {
      form.querySelector('#derivedMetricsRows')?.insertAdjacentHTML('beforeend', htmlDerivedMetricRowShell(false));
      refreshDerivedAddButtonState(form);
      (form.id === 'createForm' ? clearCreateFormErrors : clearEditFormErrors)();
      return;
    }
    const delDirect = e.target.closest('.btn-text-direct-metric-del');
    if (delDirect && form.contains(delDirect) && !delDirect.disabled) {
      const row = delDirect.closest('.direct-metric-row');
      const key = row?.querySelector('.direct-metric-key')?.value.trim();
      const derived = collectDerivedRowsFromForm(form);
      if (key) {
        const refs = findDerivedRefsToDirectKey(key, derived);
        if (refs.length) {
          const name = refs[0];
          alert(`该数据已被派生指标「${name}」引用，请先删除对应派生指标`);
          return;
        }
      }
      row?.remove();
      refreshDirectMetricDeleteButtons(form);
      refreshDerivedAddButtonState(form);
      refreshDerivedSelectOptionsInForm(form);
      (form.id === 'createForm' ? clearCreateFormErrors : clearEditFormErrors)();
      return;
    }
    const delDerived = e.target.closest('.btn-text-derived-metric-del');
    if (delDerived && form.contains(delDerived) && !delDerived.disabled) {
      delDerived.closest('.derived-metric-row')?.remove();
      refreshDerivedAddButtonState(form);
      (form.id === 'createForm' ? clearCreateFormErrors : clearEditFormErrors)();
    }
  });

  form.addEventListener('change', (e) => {
    const typeSel = e.target.closest('.derived-type-select');
    if (typeSel && form.contains(typeSel)) {
      const row = typeSel.closest('.derived-metric-row');
      const fields = row?.querySelector('.derived-type-fields');
      const type = typeSel.value;
      if (fields) {
        const directList = getCompleteDirectListFromForm(form);
        fields.innerHTML = type ? renderDerivedFieldsHtml(type, {}, directList, false) : '';
        if (type === 'retention') {
          const inp = fields.querySelector('.retention-display-name-input');
          const der = { type: 'retention', retentionPeriod: 'd1' };
          if (inp) inp.value = defaultRetentionDisplayName(der);
        }
      }
      refreshDerivedAddButtonState(form);
      (form.id === 'createForm' ? clearCreateFormErrors : clearEditFormErrors)();
      return;
    }
    const rp = e.target.closest('.derived-retention-period');
    if (rp && form.contains(rp)) {
      const row = rp.closest('.derived-metric-row');
      const fields = row?.querySelector('.derived-type-fields');
      const period = rp.value;
      const customInp = fields?.querySelector('.derived-retention-custom-days');
      if (customInp) {
        customInp.style.display = period === 'custom' ? '' : 'none';
      }
      const der = { type: 'retention', retentionPeriod: period, customDays: customInp ? parseInt(customInp.value, 10) : undefined };
      const nameInp = fields?.querySelector('.retention-display-name-input');
      if (nameInp && document.activeElement !== nameInp) {
        nameInp.value = defaultRetentionDisplayName(der);
      }
      const n = getRetentionDaysFromDerived(der);
      updateRetentionHintForRow(row, n);
      (form.id === 'createForm' ? clearCreateFormErrors : clearEditFormErrors)();
      return;
    }
    const basisSel = e.target.closest('.derived-retention-basis');
    if (basisSel && form.contains(basisSel)) {
      const row = basisSel.closest('.derived-metric-row');
      const fields = row?.querySelector('.derived-type-fields');
      const period = row?.querySelector('.derived-retention-period')?.value || 'd1';
      const customEl = row?.querySelector('.derived-retention-custom-days');
      const der = {
        type: 'retention',
        retentionPeriod: period,
        customDays: period === 'custom' && customEl ? parseInt(String(customEl.value || '').trim(), 10) : undefined
      };
      const n = getRetentionDaysFromDerived(der);
      updateRetentionHintForRow(row, n);
      refreshDerivedAddButtonState(form);
      (form.id === 'createForm' ? clearCreateFormErrors : clearEditFormErrors)();
      return;
    }
    const directInp = e.target.closest('#directMetricsRows .direct-metric-key, #directMetricsRows .direct-metric-label, #directMetricsRows .direct-metric-agg');
    if (directInp && form.contains(directInp)) {
      refreshDerivedSelectOptionsInForm(form);
      refreshDerivedAddButtonState(form);
    }
  });

  form.addEventListener('input', (e) => {
    const customDays = e.target.closest('.derived-retention-custom-days');
    if (customDays && form.contains(customDays)) {
      const row = customDays.closest('.derived-metric-row');
      const fields = row?.querySelector('.derived-type-fields');
      const period = row?.querySelector('.derived-retention-period')?.value;
      const der = { type: 'retention', retentionPeriod: period || 'custom', customDays: parseInt(customDays.value, 10) };
      const nameInp = fields?.querySelector('.retention-display-name-input');
      if (period === 'custom' && nameInp && document.activeElement !== nameInp) {
        nameInp.value = defaultRetentionDisplayName(der);
      }
      const n = getRetentionDaysFromDerived(der);
      updateRetentionHintForRow(row, n);
    }
    if (e.target.closest('#directMetricsRows .direct-metric-key, #directMetricsRows .direct-metric-label, #directMetricsRows .direct-metric-agg')) {
      refreshDerivedSelectOptionsInForm(form);
      refreshDerivedAddButtonState(form);
    }
  });
}

// 根据 values[浏览用户, 发起结账用户, 提交订单用户, 完成支付操作用户, 支付成功用户] 计算各转化率
function getConversionRates(values) {
  if (!values || values.length < 5) return { step: [], overall: 0 };
  const [enter, checkout, order, payOp, success] = values;
  const step = [
    enter ? (checkout / enter) : 0,
    checkout ? (order / checkout) : 0,
    order ? (payOp / order) : 0,
    payOp ? (success / payOp) : 0
  ];
  const overall = enter ? (success / enter) : 0;
  return { step, overall };
}

// 根据实验数据生成 AI 解读文案（原型用 Mock）
function getAIInsight(data) {
  const rows = data.rows || [];
  if (rows.length < 2) return '参与分组数据不足，暂无解读。';
  const withOverall = rows.map(r => ({
    group: r.group,
    overall: getConversionRates(r.values || []).overall,
    values: r.values || []
  }));
  const best = withOverall.slice(1).reduce((a, b) => (b.overall > a.overall ? b : a), withOverall[1]);
  const control = withOverall[0];
  const bestGain = control.overall > 0 ? ((best.overall - control.overall) / control.overall * 100).toFixed(1) : '0';
  return `本实验共 ${data.participantCount || 0} 名用户参与，实验时长 ${data.duration || '-'}。\n\n` +
    `**整体表现**：${best.group} 浏览转化率最高（${(best.overall * 100).toFixed(1)}%），较对照组提升 ${bestGain}%。建议优先考虑采用该组的定价或价格表配置以提升收入。\n\n` +
    `**漏斗洞察**：各实验组在「发起结账 → 提交订单」「提交订单 → 完成支付」等环节的转化率差异，可帮助识别用户流失节点，后续可针对低转化环节做单独优化。`;
}

// 对比对照组增长的百分比：(当前 - 对照) / 对照 * 100，返回 { text, direction: 'up'|'down'|'same' }
function getCompare(currentRate, controlRate) {
  if (controlRate === 0) return { text: '', direction: 'same' };
  const pct = ((currentRate - controlRate) / controlRate) * 100;
  if (pct === 0) return { text: '0%', direction: 'same' };
  const sign = pct > 0 ? '+' : '';
  return {
    text: `${sign}${pct.toFixed(1)}%`,
    direction: pct > 0 ? 'up' : 'down'
  };
}

// 状态
let experiments = [...mockExperiments];
let currentExperimentId = null;
let detailUserPage = 1;
let detailUserSearch = '';
let lastDetailExperimentId = null;
const DETAIL_USER_PAGE_SIZE = 10;
// 实验列表页：搜索、状态筛选、分页
let listSearch = '';
let listStatusFilter = '';
let listPage = 1;
const LIST_PAGE_SIZE = 10;

// 从定价/价格表页跳转创建实验时的预填数据
window.__abCreatePreset = null;

// 定价、价格表 Mock 列表（供商品下二级页使用）
const mockPricings = [
  { id: 'price_xxx', name: '专业版定价', desc: 'price_xxx' },
  { id: 'price_yyy', name: '年度套餐', desc: 'price_yyy' }
];
const mockPriceTables = [
  { id: '/pricing/monthly', name: '月度价格表', desc: '/pricing/monthly' },
  { id: '/pricing/yearly', name: '年度价格表', desc: '/pricing/yearly' }
];

function escapeHtmlAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function getIso3166Countries() {
  return Array.isArray(window.__ISO3166_COUNTRIES_ZH) ? window.__ISO3166_COUNTRIES_ZH : [];
}

/** 从已保存的定向规则中取出「国家」维度的展示串（多条合并为顿号） */
function getCountryValueFromScopeList(list) {
  const items = (list || []).filter(s => s.dimension === '国家');
  if (items.length === 0) return '';
  return items.map(s => s.value).join('、');
}

function getPresetForScopeMount(dim, scopeList) {
  if (dim === '国家') return { countryValue: getCountryValueFromScopeList(scopeList) };
  return {};
}

function parseCountrySelectionToCodes(existingValueStr) {
  const countries = getIso3166Countries();
  const parts = String(existingValueStr || '').split(/[,，、]/).map(s => s.trim()).filter(Boolean);
  const selectedCodes = new Set();
  parts.forEach(p => {
    const up = p.toUpperCase();
    const byCode = countries.find(c => c.code === up);
    if (byCode) {
      selectedCodes.add(byCode.code);
      return;
    }
    const byName = countries.find(c => c.name === p);
    if (byName) selectedCodes.add(byName.code);
  });
  return selectedCodes;
}

/** 默认收起（details），多选为复选框；勾选变化由外层事件同步到标签 */
function buildCountryPickerHtml(existingValueStr) {
  const countries = getIso3166Countries();
  const selectedCodes = parseCountrySelectionToCodes(existingValueStr);
  const rows = countries.map(({ code, name }) => {
    const checked = selectedCodes.has(code) ? ' checked' : '';
    const searchKey = `${name} ${code}`.toLowerCase();
    return `<label class="scope-country-row" data-search="${escapeHtmlAttr(searchKey)}"><input type="checkbox" class="scope-country-cb" value="${escapeHtmlAttr(code)}"${checked} />${escapeHtmlText(name)}（${escapeHtmlAttr(code)}）</label>`;
  }).join('');
  return (
    '<div class="scope-country-picker">' +
    '<details class="scope-country-details">' +
    '<summary class="scope-country-summary">选择国家/地区（多选）</summary>' +
    '<div class="scope-country-panel">' +
    '<input type="search" class="scope-country-filter" placeholder="搜索国家或代码…" autocomplete="off" />' +
    `<div class="scope-country-checkboxes">${rows}</div>` +
    '</div></details></div>'
  );
}

function buildScopeValueHostHtml(dim, preset) {
  const d = dim || '国家';
  const p = preset || {};
  if (d === '国家') {
    return buildCountryPickerHtml(p.countryValue != null ? p.countryValue : '');
  }
  if (d === '来源渠道') {
    const v = p.channelValue != null ? p.channelValue : '';
    return `<input type="text" id="scopeValueChannel" class="scope-value-channel" placeholder="填写来源渠道，如 organic" value="${escapeHtmlAttr(v)}" />`;
  }
  if (d === '设备') {
    const val = p.deviceValue != null ? p.deviceValue : '';
    return `<select id="scopeValueDevice" class="scope-value-device">
      <option value="">请选择</option>
      <option value="全部"${val === '全部' ? ' selected' : ''}>全部</option>
      <option value="PC"${val === 'PC' ? ' selected' : ''}>PC</option>
      <option value="移动端"${val === '移动端' ? ' selected' : ''}>移动端</option>
    </select>`;
  }
  return '';
}

function mountScopeValueHost(dim, preset) {
  const host = document.getElementById('scopeValueHost');
  if (!host) return;
  host.innerHTML = buildScopeValueHostHtml(dim, preset);
  const addBtn = document.getElementById('addScope');
  if (addBtn) addBtn.hidden = dim === '国家';
}

function readCountryScopeValueFromHost(hostEl) {
  const host = hostEl || document.getElementById('scopeValueHost');
  if (!host) return '';
  const countries = getIso3166Countries();
  const names = Array.from(host.querySelectorAll('.scope-country-cb:checked')).map(cb => {
    const code = cb.value;
    const c = countries.find(x => x.code === code);
    return c ? c.name : code;
  });
  return names.join('、');
}

function readScopeValueFromHost(dim) {
  const d = dim || document.getElementById('scopeDim')?.value || '国家';
  if (d === '国家') {
    return readCountryScopeValueFromHost();
  }
  if (d === '来源渠道') {
    return document.getElementById('scopeValueChannel')?.value.trim() || '';
  }
  if (d === '设备') {
    return document.getElementById('scopeValueDevice')?.value.trim() || '';
  }
  return '';
}

function clearScopeValueHost(dim) {
  const d = dim || document.getElementById('scopeDim')?.value;
  if (d === '国家') {
    const host = document.getElementById('scopeValueHost');
    if (host) host.querySelectorAll('.scope-country-cb').forEach(cb => { cb.checked = false; });
  } else if (d === '来源渠道') {
    const inp = document.getElementById('scopeValueChannel');
    if (inp) inp.value = '';
  } else if (d === '设备') {
    const s = document.getElementById('scopeValueDevice');
    if (s) s.selectedIndex = 0;
  }
}

/** 创建实验：在「月度 / 年度」两个可选项基础上增加 1 个置灰项，演示「已被其他实验占用」（原型 Mock） */
const PRICE_TABLE_DISABLED_OPTION_DEMO = {
  value: '/pricing/demo-occupied',
  label: '企业版价格表 (/pricing/demo-occupied)',
  /** tooltip：该选项已在实验「…」内 */
  takenByExperimentName: '价格表 CTA 按钮文案'
};

function buildPriceTableOptionsHtml() {
  const tip = `该选项已在实验「${PRICE_TABLE_DISABLED_OPTION_DEMO.takenByExperimentName}」内`;
  return (
    '<option value="">请选择价格表</option>' +
    '<option value="/pricing/monthly">月度价格表 (/pricing/monthly)</option>' +
    '<option value="/pricing/yearly">年度价格表 (/pricing/yearly)</option>' +
    `<option value="${escapeHtmlAttr(PRICE_TABLE_DISABLED_OPTION_DEMO.value)}" disabled title="${escapeHtmlAttr(tip)}">${PRICE_TABLE_DISABLED_OPTION_DEMO.label}</option>`
  );
}

function buildPricingSelectHtmlSelected(selectedValue) {
  const opts = [
    { v: '', t: '请选择定价' },
    { v: 'price_xxx', t: '专业版定价 (price_xxx)' },
    { v: 'price_yyy', t: '年度套餐 (price_yyy)' }
  ];
  return opts.map(o => `<option value="${escapeHtmlAttr(o.v)}"${o.v === selectedValue ? ' selected' : ''}>${o.t}</option>`).join('');
}

function buildPriceTableSelectHtmlSelected(selectedValue) {
  const tip = `该选项已在实验「${PRICE_TABLE_DISABLED_OPTION_DEMO.takenByExperimentName}」内`;
  let html = '<option value="">请选择价格表</option>';
  mockPriceTables.forEach(pt => {
    html += `<option value="${escapeHtmlAttr(pt.id)}"${pt.id === selectedValue ? ' selected' : ''}>${pt.name} (${pt.desc})</option>`;
  });
  html += `<option value="${escapeHtmlAttr(PRICE_TABLE_DISABLED_OPTION_DEMO.value)}" disabled title="${escapeHtmlAttr(tip)}">${PRICE_TABLE_DISABLED_OPTION_DEMO.label}</option>`;
  return html;
}

function buildEditTargetCellHtml(tKey, value, disabled) {
  const d = disabled ? ' disabled' : '';
  if (tKey === 'custom') {
    return `<input type="text" class="target-custom-input" value="${escapeHtmlAttr(value)}"${d} />`;
  }
  if (tKey === 'pricing') {
    return `<select class="target-select"${d}>${buildPricingSelectHtmlSelected(value)}</select>`;
  }
  if (tKey === 'price_table') {
    return `<select class="target-select"${d}>${buildPriceTableSelectHtmlSelected(value)}</select>`;
  }
  return `<select class="target-select"${d}><option value="">请先选择实验对象</option></select>`;
}

// 路由
function getRoute() {
  const hash = (location.hash || '#/experiments').slice(1);
  const [path, id, sub] = hash.split('/').filter(Boolean);
  return { path: path || 'experiments', id, sub };
}

function render() {
  const view = document.getElementById('router-view');
  if (!view) return;
  const { path, id, sub } = getRoute();
  const headerLeft = document.getElementById('headerLeft');
  if (headerLeft) headerLeft.innerHTML = '';

  document.querySelectorAll('.nav-section').forEach(section => {
    const sectionName = section.dataset.section;
    const isDataActive = path === 'experiments';
    const isProductsActive = path === 'products';
    section.classList.toggle('active', (sectionName === 'data' && isDataActive) || (sectionName === 'products' && isProductsActive));
  });
  document.querySelectorAll('.nav-item').forEach(el => {
    const href = (el.getAttribute('href') || '').slice(1);
    const isExp = path === 'experiments' && (href === 'experiments' || (id === 'new' && href === 'experiments'));
    const isProducts = path === 'products' && (
      (href === 'products' && !id) || (href === 'products/pricing' && id === 'pricing') || (href === 'products/price-table' && id === 'price-table')
    );
    el.classList.toggle('active', isExp || isProducts);
  });

  if (path === 'experiments' && !id) {
    view.innerHTML = renderExperimentList();
    bindListEvents();
    document.getElementById('pageTitle').textContent = 'A/B 测试';
    return;
  }

  if (path === 'experiments' && id === 'new') {
    view.innerHTML = renderCreateExperiment();
    if (headerLeft) headerLeft.innerHTML = '<button type="button" class="btn btn-ghost btn-sm back-btn" id="createPageBackBtn">← 返回</button>';
    bindCreateFormEvents();
    document.getElementById('pageTitle').textContent = '创建实验';
    return;
  }

  if (path === 'experiments' && id && sub === 'edit') {
    const exp = experiments.find(e => e.id === id);
    if (!exp || exp.status === 'ended') {
      location.hash = '#/experiments/' + id;
      return;
    }
    currentExperimentId = id;
    view.innerHTML = renderEditExperiment(id);
    if (headerLeft) headerLeft.innerHTML = '<button type="button" class="btn btn-ghost btn-sm back-btn" id="editPageBackBtn">← 返回</button>';
    bindEditFormEvents(id);
    document.getElementById('pageTitle').textContent = '编辑实验';
    return;
  }

  if (path === 'experiments' && id) {
    currentExperimentId = id;
    if (headerLeft) headerLeft.innerHTML = '<a href="#/experiments" class="btn btn-ghost btn-sm back-btn">← 返回</a>';
    const tab = sub || 'detail';
    view.innerHTML = renderExperimentDetail(id, tab);
    bindDetailEvents(id, tab);
    document.getElementById('pageTitle').textContent = '实验详情';
    return;
  }

  if (path === 'docs' && id === 'custom-abtest-config') {
    view.innerHTML = renderCustomAbtestDoc();
    if (headerLeft) headerLeft.innerHTML = '';
    document.getElementById('pageTitle').textContent = '自定义 A/B Test 实验配置说明';
    return;
  }

  if (path === 'products') {
    if (!id) {
      view.innerHTML = renderProductsHome();
      document.getElementById('pageTitle').textContent = '商品';
      return;
    }
    if (id === 'pricing') {
      view.innerHTML = renderPricingList();
      bindProductListEvents('pricing');
      document.getElementById('pageTitle').textContent = '定价';
      return;
    }
    if (id === 'price-table') {
      view.innerHTML = renderPriceTableList();
      bindProductListEvents('price_table');
      document.getElementById('pageTitle').textContent = '价格表';
      return;
    }
  }

  view.innerHTML = renderExperimentList();
  bindListEvents();
}

function renderCustomAbtestDoc() {
  return `
    <div class="card doc-card">
      <div class="card-header">自定义 A/B Test 实验配置说明</div>
      <div class="card-body doc-body">
        <p>本文档说明如何在后台配置自定义实验，以及在前端通过 SDK 使用<strong>实验 ID</strong>获取用户分组数据并处理不同策略。</p>
        <h4>1. 创建实验时选择「自定义」</h4>
        <p>在实验对象中选择「自定义」，保存草稿后系统会生成实验 ID；前端在实验节点调用 SDK 时传入该<strong>实验 ID</strong>即可拉取当前用户在该实验下的分组与「实验对象值」。</p>
        <h4>2. 为各分组填写实验对象值</h4>
        <p>在「实验分组与流量」表格的「实验对象值」列中，为对照组和每个实验组填写对应的值（如 <code>default</code>、<code>variant_a</code>）。用户落入某分组后，SDK 将返回该分组对应的值。</p>
        <h4>3. 前端集成与使用</h4>
        <p>在需要做实验的节点（如结算页、按钮文案等），调用 SDK 方法传入<strong>实验 ID</strong>，获取当前用户在该实验下的分组数据（即您配置的某一行的「实验对象值」）。根据返回值在页面中执行不同策略（如展示不同 UI、跳转不同流程等）。</p>
      </div>
    </div>
  `;
}

function renderProductsHome() {
  return `
    <div class="card">
      <div class="card-body">
        <p class="experiment-meta">请从左侧选择「定价」或「价格表」管理对应配置，并可为单个定价/价格表创建 A/B 实验。</p>
      </div>
    </div>
  `;
}

function renderPricingList() {
  const rows = mockPricings.map(p => `
    <tr>
      <td><strong>${p.name}</strong></td>
      <td class="experiment-meta">${p.desc}</td>
      <td><button type="button" class="btn btn-primary btn-sm" data-action="create-ab" data-target-type="pricing" data-control-id="${p.id}" data-control-label="${p.name} (${p.desc})">创建 A/B 实验</button></td>
    </tr>
  `).join('');
  return `
    <div class="card">
      <div class="card-header">定价列表</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>定价名称</th><th>定价 ID</th><th>操作</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;
}

function renderPriceTableList() {
  const rows = mockPriceTables.map(p => `
    <tr>
      <td><strong>${p.name}</strong></td>
      <td class="experiment-meta">${p.desc}</td>
      <td><button type="button" class="btn btn-primary btn-sm" data-action="create-ab" data-target-type="price_table" data-control-id="${p.id}" data-control-label="${p.name} (${p.desc})">创建 A/B 实验</button></td>
    </tr>
  `).join('');
  return `
    <div class="card">
      <div class="card-header">价格表列表</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>价格表名称</th><th>价格表链接</th><th>操作</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;
}

function bindProductListEvents(targetType) {
  document.querySelectorAll('[data-action="create-ab"]').forEach(btn => {
    btn.addEventListener('click', () => {
      window.__abCreatePreset = {
        targetType: btn.dataset.targetType,
        controlTarget: btn.dataset.controlId,
        controlLabel: btn.dataset.controlLabel || ''
      };
      location.hash = '#/experiments/new';
    });
  });
}

function renderExperimentList() {
  const empty = experiments.length === 0;
  const defaultStateBlock = `
    <div class="card default-state-card">
      <div class="default-state-label">缺省状态</div>
      <div class="default-state-figure">
        <svg width="120" height="72" viewBox="0 0 120 72" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M8 56 L28 44 L48 48 L68 32 L88 28 L112 12" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>
          <circle cx="8" cy="56" r="3" fill="var(--primary)" opacity="0.8"/>
          <circle cx="112" cy="12" r="4" fill="var(--primary)"/>
          <path d="M20 20 L20 52 L44 52 L44 20 Z" stroke="var(--primary)" stroke-width="1.5" stroke-dasharray="4 2" opacity="0.5" fill="none"/>
          <path d="M56 20 L56 52 L80 52 L80 20 Z" stroke="var(--primary)" stroke-width="1.5" stroke-dasharray="4 2" opacity="0.5" fill="none"/>
          <text x="38" y="38" font-size="10" fill="var(--primary)" opacity="0.8" text-anchor="middle" font-weight="600">A</text>
          <text x="74" y="38" font-size="10" fill="var(--primary)" opacity="0.8" text-anchor="middle" font-weight="600">B</text>
        </svg>
      </div>
      <div class="default-state-body">
        <p class="default-state-desc">A/B Test 系统可以创建实验来验证不同策略对转化率的影响，帮助您优化配置，<span class="default-state-desc-nowrap">提升转化率。</span></p>
        <button class="btn btn-primary" data-action="create">创建实验</button>
      </div>
    </div>
  `;
  if (empty) {
    return `
      <div class="card">
        <div class="card-header">
          <span>实验列表</span>
          <button class="btn btn-primary btn-sm" data-action="create">+ 创建实验</button>
        </div>
        <div class="empty-state">
          <div class="empty-state-icon">🧪</div>
          <h3>还没有任何实验</h3>
          <p>创建第一个 A/B 实验，验证定价或价格表配置对转化率与收入的影响。</p>
          <button class="btn btn-primary" data-action="create">创建实验</button>
        </div>
      </div>
      ${defaultStateBlock}
    `;
  }
  const searchLower = listSearch.trim().toLowerCase();
  const filtered = experiments.filter(e => {
    const matchSearch = !searchLower || (e.name || '').toLowerCase().includes(searchLower) || (e.id || '').toLowerCase().includes(searchLower);
    const matchStatus = !listStatusFilter || e.status === listStatusFilter;
    return matchSearch && matchStatus;
  });
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / LIST_PAGE_SIZE));
  listPage = Math.min(Math.max(1, listPage), totalPages);
  const start = (listPage - 1) * LIST_PAGE_SIZE;
  const pageData = filtered.slice(start, start + LIST_PAGE_SIZE);
  const rows = pageData.map(e => `
    <li class="experiment-item" data-id="${e.id}">
      <div class="copyable-cell">
        <span class="copyable-value"><span class="experiment-name">${e.name}</span><div class="experiment-meta">${e.targetLabel}</div></span>
        <button type="button" class="copy-btn" title="复制" data-copy="${(e.name || '').replace(/"/g, '&quot;')}">复制</button>
      </div>
      <div class="copyable-cell">
        <span class="copyable-value">${e.id}</span>
        <button type="button" class="copy-btn" title="复制" data-copy="${(e.id || '').replace(/"/g, '&quot;')}">复制</button>
      </div>
      <span class="experiment-meta">${e.createdAt}</span>
      <span class="experiment-meta">${e.createdBy}</span>
      <span class="experiment-meta">${e.target}</span>
      <span class="experiment-meta">${e.duration}</span>
      <span class="experiment-meta">${e.userCount} 人</span>
      <span class="badge badge-${e.status}">${e.status === 'active' ? '运行中' : e.status === 'draft' ? '草稿' : e.status === 'paused' ? '已暂停' : '已结束'}</span>
    </li>
  `).join('');
  const listEmptyTip = total === 0 ? '<div class="list-filter-empty">无匹配实验，请调整搜索或筛选条件</div>' : '';
  const paginationHtml = total > 0 ? `
    <div class="list-pagination">
      <span class="list-pagination-total">共 ${total} 条</span>
      <div class="list-pagination-btns">
        <button type="button" class="btn btn-secondary btn-sm list-page-btn" data-page="prev" ${listPage <= 1 ? 'disabled' : ''}>上一页</button>
        <span class="list-pagination-info">第 ${listPage} / ${totalPages} 页</span>
        <button type="button" class="btn btn-secondary btn-sm list-page-btn" data-page="next" ${listPage >= totalPages ? 'disabled' : ''}>下一页</button>
      </div>
    </div>
  ` : '';
  return `
    <div class="card">
      <div class="card-header">
        <span>实验列表</span>
        <button class="btn btn-primary btn-sm" data-action="create">+ 创建实验</button>
      </div>
      <div class="list-toolbar">
        <span class="list-toolbar-label">搜索</span>
        <input type="text" id="listSearchInput" class="list-search-input" placeholder="按实验名称或实验 ID 搜索" value="${(listSearch || '').replace(/"/g, '&quot;')}" />
        <span class="list-toolbar-label">实验状态</span>
        <select id="listStatusFilter" class="list-status-filter">
          <option value="" ${listStatusFilter === '' ? 'selected' : ''}>全部状态</option>
          <option value="draft" ${listStatusFilter === 'draft' ? 'selected' : ''}>草稿</option>
          <option value="active" ${listStatusFilter === 'active' ? 'selected' : ''}>运行中</option>
          <option value="paused" ${listStatusFilter === 'paused' ? 'selected' : ''}>已暂停</option>
          <option value="ended" ${listStatusFilter === 'ended' ? 'selected' : ''}>已结束</option>
        </select>
      </div>
      ${listEmptyTip}
      <ul class="experiment-list" style="${total === 0 ? 'display:none' : ''}">
        <li class="experiment-item experiment-list-header">
          <div>实验名称</div>
          <div>实验 id</div>
          <div>创建时间</div>
          <div>创建人</div>
          <div>实验对象</div>
          <div>实验时长</div>
          <div>实验用户量</div>
          <div>状态</div>
        </li>
        ${rows}
      </ul>
      ${paginationHtml}
    </div>
    ${defaultStateBlock}
  `;
}

function bindListEvents() {
  document.querySelectorAll('[data-action="create"]').forEach(el => {
    el.addEventListener('click', () => { location.hash = '#/experiments/new'; });
  });
  const searchInput = document.getElementById('listSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      listSearch = searchInput.value || '';
      listPage = 1;
      render();
    });
  }
  const statusFilter = document.getElementById('listStatusFilter');
  if (statusFilter) {
    statusFilter.addEventListener('change', () => {
      listStatusFilter = statusFilter.value || '';
      listPage = 1;
      render();
    });
  }
  document.querySelectorAll('.list-page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const page = btn.dataset.page;
      if (page === 'prev') listPage = Math.max(1, listPage - 1);
      else if (page === 'next') listPage = listPage + 1;
      render();
    });
  });
  document.querySelectorAll('.experiment-item[data-id]').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.copy-btn')) return;
      location.hash = '#/experiments/' + el.dataset.id;
    });
  });
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const value = btn.getAttribute('data-copy') || '';
      if (!value) return;
      navigator.clipboard.writeText(value).then(() => {
        const t = btn.textContent;
        btn.textContent = '已复制';
        setTimeout(() => { btn.textContent = t; }, 1500);
      }).catch(() => {});
    });
  });
}

/** 创建实验「实验分组与流量」删除行按钮：垃圾桶图标 */
const TRASH_ICON_SVG = '<svg class="btn-trash-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>';

function renderCreateExperiment() {
  return `
    <div class="card">
      <div class="card-header">创建实验</div>
      <div class="card-body">
        <form id="createForm">
          <div class="form-group">
            <label class="form-label">实验名称 <span style="color:var(--danger);">*</span></label>
            <input type="text" name="name" placeholder="用于在后台区分不同实验，如：定价页标题 A/B 测试" />
          </div>
          <div class="form-group">
            <label class="form-label">实验对象</label>
            <select name="targetType" id="targetType">
              <option value="">请选择</option>
              <option value="pricing">定价</option>
              <option value="price_table">价格表</option>
              <option value="custom">自定义</option>
            </select>
            <p class="form-hint" id="customTargetHintWrap" style="display:none; margin-top:12px;">自定义实验支持商户自行定义实验对象与业务逻辑。A/B 测试系统仅负责为参与实验的用户分配分组并返回分组结果，不同分组对应的执行逻辑由商户自行处理。<a href="#/docs/custom-abtest-config" target="_blank" rel="noopener" class="link-btn">了解详情</a></p>
          </div>
          <div class="form-group">
            <label class="form-label">实验结束配置</label>
            <p class="form-hint">实验优先按照达到测试用户数自动结束，可选设置达到运行时长也自动结束（实验用户越多结果越准确）</p>
            <div class="end-config-line">
              <span class="end-config-label">实验达到</span>
              <input type="number" name="endUserCount" id="endUserCount" class="end-config-input" min="501" max="10000000" step="1" value="${getDefaultEndUserCount(MOCK_SHOP_DAILY_AVG_LAST_30)}" />
              <span class="end-config-suffix">用户数后自动停止</span>
            </div>
            <button type="button" class="end-config-add-trigger" id="addMaxRunDurationBtn">添加实验最大运行时长</button>
            <div id="endRunDaysWrap" class="end-config-line end-config-run-wrap" aria-hidden="true">
              <span class="end-config-label">实验运行</span>
              <input type="number" name="endRunDays" id="endRunDays" class="end-config-input" min="1" max="365" step="1" value="30" />
              <span class="end-config-suffix">天后自动结束</span>
              <button type="button" class="end-config-remove" id="removeMaxRunDurationBtn" title="移除运行时长限制">移除</button>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">实验用户范围</label>
            <select name="userScope" id="userScope">
              <option value="all">全部用户</option>
              <option value="targeted">定向范围</option>
            </select>
            <div id="scopeRules" style="margin-top:12px; display:none;">
              <div class="scope-tags" id="scopeTags"></div>
              <div class="add-scope-row">
                <select id="scopeDim">
                  <option value="国家">国家</option>
                  <option value="来源渠道">来源渠道</option>
                  <option value="设备">设备</option>
                </select>
                <div id="scopeValueHost" class="scope-value-host"></div>
                <button type="button" class="btn btn-secondary btn-sm" id="addScope">添加</button>
              </div>
            </div>
          </div>
          <div class="form-group traffic-module" id="trafficModuleWrap">
            <label class="form-label">实验分组与流量</label>
            <p class="form-hint">对照组不可删除；至少保留一个实验组，实验组多于一个时可删除多余组，总流量需为 100%。</p>
            <div class="traffic-table-header">
              <span class="th-name">实验分组名称</span>
              <span class="th-target">分组变量</span>
              <span class="th-meaning">分组说明</span>
              <span class="th-traffic">流量 %</span>
              <span class="th-action"></span>
            </div>
            <div id="trafficGroups">
              <div class="traffic-row" data-is-control="true">
                <input type="text" placeholder="实验分组名称" value="对照组" readonly />
                <div class="target-cell"><select class="target-select"><option value="">请先选择实验对象</option></select></div>
                <div class="target-meaning-cell"><input type="text" class="meaning-input" placeholder="记录该分组的业务逻辑（选填）" /></div>
                <input type="number" min="0" max="100" value="34" placeholder="流量%" />
                <span class="traffic-row-action"></span>
              </div>
              <div class="traffic-row">
                <input type="text" placeholder="实验分组名称" value="实验组 A" />
                <div class="target-cell"><select class="target-select"><option value="">请先选择实验对象</option></select></div>
                <div class="target-meaning-cell"><input type="text" class="meaning-input" placeholder="记录该分组的业务逻辑（选填）" /></div>
                <input type="number" min="0" max="100" value="33" placeholder="流量%" />
                <span class="traffic-row-action"><button type="button" class="btn btn-ghost btn-sm btn-remove-group" title="删除该实验组" aria-label="删除该实验组">${TRASH_ICON_SVG}</button></span>
              </div>
              <div class="traffic-row">
                <input type="text" placeholder="实验分组名称" value="实验组 B" />
                <div class="target-cell"><select class="target-select"><option value="">请先选择实验对象</option></select></div>
                <div class="target-meaning-cell"><input type="text" class="meaning-input" placeholder="记录该分组的业务逻辑（选填）" /></div>
                <input type="number" min="0" max="100" value="33" placeholder="流量%" />
                <span class="traffic-row-action"><button type="button" class="btn btn-ghost btn-sm btn-remove-group" title="删除该实验组" aria-label="删除该实验组">${TRASH_ICON_SVG}</button></span>
              </div>
            </div>
            <p class="control-group-hint" id="controlGroupHint" style="display:none;">商户站点前端集成的价格或价格表需要与对照组保持一致</p>
            <p class="traffic-total">总流量：<span id="trafficTotal">100</span>%</p>
            <button type="button" class="btn btn-ghost btn-sm add-group-btn" id="addGroup">+ 添加实验组</button>
          </div>
          <div class="form-group">
            <label class="form-label">实验目标与方案描述</label>
            <textarea name="goal" placeholder="填写您做测试的目的，并且说明下对照组和每个实验组的不同逻辑 ，选填；" rows="3"></textarea>
          </div>
          <div id="customMetricsOptionalWrap" class="form-group custom-metrics-optional-wrap" style="display:none;">
            <div id="customMetricsCollapsedRow" class="custom-metrics-collapsed-row">
              <button type="button" class="btn-link-text btn-link-text-subtle" id="toggleCustomMetricsBtn">添加自定义数据</button>
              ${CUSTOM_DATA_HINT_POPOVER}
            </div>
            <div id="customMetricsDetailWrap" class="custom-metrics-detail-wrap" style="display:none;" hidden>
              ${buildCustomDataDetailInnerHtml({ customData: { direct: [], derived: [] } }, false)}
            </div>
          </div>
          <div class="action-bar" style="margin-top:24px;">
            <button type="submit" class="btn btn-primary">保存为草稿</button>
            <a href="#/experiments" class="btn btn-secondary">取消</a>
          </div>
        </form>
      </div>
    </div>
  `;
}

function escTextareaContent(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderEditExperiment(id) {
  const detail = getExperimentDetail(id);
  const exp = experiments.find(e => e.id === id);
  const restricted = Boolean(exp && (exp.status === 'active' || exp.status === 'paused'));
  const tKey = getFormTargetTypeKey(exp);
  const ttSelectVal = tKey;
  const endOpen = Boolean(exp && exp.endRunDays != null && Number(exp.endRunDays) > 0);
  const userScopeVal = detail.userScope === '全部' ? 'all' : 'targeted';
  const scopeVisible = userScopeVal === 'targeted';
  const trafficSum = (detail.groups || []).reduce((s, g) => s + (Number(g.traffic) || 0), 0);

  const rowsHtml = (detail.groups || []).map((g, idx) => {
    const isControl = g.isControl || idx === 0;
    const targetCell = buildEditTargetCellHtml(tKey, g.variable, restricted);
    const delCell = restricted
      ? `<span class="traffic-row-action"><button type="button" class="btn btn-ghost btn-sm btn-remove-group" disabled title="当前状态不可删除分组">${TRASH_ICON_SVG}</button></span>`
      : `<span class="traffic-row-action">${!isControl ? `<button type="button" class="btn btn-ghost btn-sm btn-remove-group" title="删除该实验组" aria-label="删除该实验组">${TRASH_ICON_SVG}</button>` : ''}</span>`;
    return `
      <div class="traffic-row" ${isControl ? 'data-is-control="true"' : ''}>
        <input type="text" placeholder="实验分组名称" value="${escapeHtmlAttr(g.name)}" />
        <div class="target-cell">${targetCell}</div>
        <div class="target-meaning-cell"><input type="text" class="meaning-input" placeholder="记录该分组的业务逻辑（选填）" value="${escapeHtmlAttr(g.meaning || '')}" /></div>
        <input type="number" min="0" max="100" value="${g.traffic}" placeholder="流量%" />
        ${delCell}
      </div>
    `;
  }).join('');

  const ttDisabled = restricted ? ' disabled' : '';
  const usDisabled = restricted ? ' disabled' : '';
  const addGroupBtn = restricted
    ? `<button type="button" class="btn btn-ghost btn-sm add-group-btn" id="addGroup" disabled title="当前状态不可添加实验组">+ 添加实验组</button>`
    : `<button type="button" class="btn btn-ghost btn-sm add-group-btn" id="addGroup">+ 添加实验组</button>`;

  const scopeTagsReadonly = restricted && scopeVisible
    ? (detail.userScopeRules || []).map(r => `<span class="scope-tag">${r.dimension}: ${r.value}</span>`).join('')
    : '';
  const scopeTagsDraft = !restricted && scopeVisible
    ? (detail.userScopeRules || []).map((r, i) => `<span class="scope-tag">${r.dimension}: ${r.value} <span class="remove" data-i="${i}">×</span></span>`).join('')
    : '';

  const scopeRulesBlock = restricted
    ? `<div id="scopeRules" style="margin-top:12px; display:${scopeVisible ? 'block' : 'none'};">
         <div class="scope-tags" id="scopeTags">${scopeTagsReadonly}</div>
       </div>`
    : `<div id="scopeRules" style="margin-top:12px; display:${scopeVisible ? 'block' : 'none'};">
         <div class="scope-tags" id="scopeTags">${scopeTagsDraft}</div>
         <div class="add-scope-row">
           <select id="scopeDim"><option value="国家">国家</option><option value="来源渠道">来源渠道</option><option value="设备">设备</option></select>
           <div id="scopeValueHost" class="scope-value-host"></div>
           <button type="button" class="btn btn-secondary btn-sm" id="addScope">添加</button>
         </div>
       </div>`;

  return `
    <div class="card">
      <div class="card-header">编辑实验</div>
      <div class="card-body">
        <form id="editExperimentForm" data-edit-id="${escapeHtmlAttr(id)}" data-restricted="${restricted ? '1' : '0'}">
          <div class="form-group">
            <label class="form-label">实验名称 <span style="color:var(--danger);">*</span></label>
            <input type="text" name="name" value="${escapeHtmlAttr(detail.name)}" />
          </div>
          <div class="form-group">
            <label class="form-label">实验对象</label>
            <select name="targetType" id="targetType"${ttDisabled}${restricted ? ' class="is-readonly-select"' : ''}>
              <option value="">请选择</option>
              <option value="pricing"${ttSelectVal === 'pricing' ? ' selected' : ''}>定价</option>
              <option value="price_table"${ttSelectVal === 'price_table' ? ' selected' : ''}>价格表</option>
              <option value="custom"${ttSelectVal === 'custom' ? ' selected' : ''}>自定义</option>
            </select>
            <p class="form-hint" id="customTargetHintWrap" style="display:${ttSelectVal === 'custom' ? 'block' : 'none'}; margin-top:12px;">自定义实验支持商户自行定义实验对象与业务逻辑。A/B 测试系统仅负责为参与实验的用户分配分组并返回分组结果，不同分组对应的执行逻辑由商户自行处理。<a href="#/docs/custom-abtest-config" target="_blank" rel="noopener" class="link-btn">了解详情</a></p>
            ${restricted ? '<p class="form-hint">运行中或已暂停时不可修改实验对象。</p>' : ''}
          </div>
          <div class="form-group">
            <label class="form-label">实验结束配置</label>
            <p class="form-hint">实验优先按照达到测试用户数自动结束，可选设置达到运行时长也自动结束（实验用户越多结果越准确）</p>
            <div class="end-config-line">
              <span class="end-config-label">实验达到</span>
              <input type="number" name="endUserCount" id="endUserCount" class="end-config-input" min="501" max="10000000" step="1" value="${detail.endUserStop != null ? detail.endUserStop : getDefaultEndUserCount(MOCK_SHOP_DAILY_AVG_LAST_30)}" />
              <span class="end-config-suffix">用户数后自动停止</span>
            </div>
            <button type="button" class="end-config-add-trigger" id="addMaxRunDurationBtn"${endOpen ? ' hidden' : ''}>添加实验最大运行时长</button>
            <div id="endRunDaysWrap" class="end-config-line end-config-run-wrap${endOpen ? ' is-open' : ''}" aria-hidden="${endOpen ? 'false' : 'true'}">
              <span class="end-config-label">实验运行</span>
              <input type="number" name="endRunDays" id="endRunDays" class="end-config-input" min="1" max="365" step="1" value="${exp && exp.endRunDays != null ? exp.endRunDays : 30}" />
              <span class="end-config-suffix">天后自动结束</span>
              <button type="button" class="end-config-remove" id="removeMaxRunDurationBtn" title="移除运行时长限制">移除</button>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">实验用户范围</label>
            <select name="userScope" id="userScope"${usDisabled}${restricted ? ' class="is-readonly-select"' : ''}>
              <option value="all"${userScopeVal === 'all' ? ' selected' : ''}>全部用户</option>
              <option value="targeted"${userScopeVal === 'targeted' ? ' selected' : ''}>定向范围</option>
            </select>
            ${scopeRulesBlock}
          </div>
          <div class="form-group traffic-module" id="trafficModuleWrap">
            <label class="form-label">实验分组与流量</label>
            <p class="form-hint">对照组不可删除；至少保留一个实验组，实验组多于一个时可删除多余组，总流量需为 100%。${restricted ? '（运行中/已暂停：不可添加或删除分组，不可修改分组变量）' : ''}</p>
            <div class="traffic-table-header">
              <span class="th-name">实验分组名称</span>
              <span class="th-target">分组变量</span>
              <span class="th-meaning">分组说明</span>
              <span class="th-traffic">流量 %</span>
              <span class="th-action"></span>
            </div>
            <div id="trafficGroups">${rowsHtml}</div>
            <p class="control-group-hint" id="controlGroupHint" style="display:${(tKey === 'pricing' || tKey === 'price_table') ? 'block' : 'none'};">商户站点前端集成的价格或价格表需要与对照组保持一致</p>
            <p class="traffic-total">总流量：<span id="trafficTotal">${trafficSum}</span>%</p>
            ${addGroupBtn}
          </div>
          <div class="form-group">
            <label class="form-label">实验目标与方案描述</label>
            <textarea name="goal" placeholder="填写您做测试的目的，并且说明下对照组和每个实验组的不同逻辑 ，选填；" rows="3"${restricted ? ' readonly class="is-readonly-textarea"' : ''}>${escTextareaContent(detail.goal || '')}</textarea>
            ${restricted ? '<p class="form-hint">运行中或已暂停时不可修改实验目标与方案描述。</p>' : ''}
          </div>
          ${buildEditCustomMetricsSectionHtml(exp, ttSelectVal, restricted)}
          <div class="action-bar" style="margin-top:24px;">
            <button type="submit" class="btn btn-primary">保存</button>
            <a href="#/experiments/${escapeHtmlAttr(id)}" class="btn btn-secondary">取消</a>
          </div>
        </form>
      </div>
    </div>
  `;
}

const PRICING_OPTIONS = '<option value="">请选择定价</option><option value="price_xxx">专业版定价 (price_xxx)</option><option value="price_yyy">年度套餐 (price_yyy)</option>';
const EDIT_ERROR_MSG_ID = 'editFormFirstErrorMsg';

function clearEditFormErrors() {
  const form = document.getElementById('editExperimentForm');
  if (!form) return;
  form.querySelectorAll('.' + CREATE_FIELD_ERROR).forEach(el => el.classList.remove(CREATE_FIELD_ERROR));
  document.getElementById(EDIT_ERROR_MSG_ID)?.remove();
}

function placeFirstEditFormErrorMessage(firstEl) {
  document.getElementById(EDIT_ERROR_MSG_ID)?.remove();
  const p = document.createElement('p');
  p.id = EDIT_ERROR_MSG_ID;
  p.className = 'form-hint create-form-field-error-msg';
  p.textContent = '请完成此项配置';
  const trafficRow = firstEl.closest('.traffic-row');
  const customMetricRow = firstEl.closest('.custom-metric-row');
  const derivedMetricRow = firstEl.closest('.derived-metric-row');
  const endLine = firstEl.closest('.end-config-line');
  if (trafficRow) trafficRow.insertAdjacentElement('afterend', p);
  else if (derivedMetricRow) derivedMetricRow.insertAdjacentElement('afterend', p);
  else if (customMetricRow) customMetricRow.insertAdjacentElement('afterend', p);
  else if (endLine) endLine.insertAdjacentElement('afterend', p);
  else firstEl.insertAdjacentElement('afterend', p);
}

function validateCustomDataExpanded(form) {
  const errorEls = [];
  if (!form || !isCustomMetricsDetailExpanded(form)) return errorEls;
  const directRows = form.querySelectorAll('#directMetricsRows .direct-metric-row');
  let completeDirect = 0;
  directRows.forEach(row => {
    const keyEl = row.querySelector('.direct-metric-key');
    const labelEl = row.querySelector('.direct-metric-label');
    const aggEl = row.querySelector('.direct-metric-agg');
    const key = keyEl && String(keyEl.value || '').trim();
    const label = labelEl && String(labelEl.value || '').trim();
    const agg = aggEl && aggEl.value;
    if (!key && !label && !agg) return;
    if (!key) errorEls.push(keyEl);
    else if (!label) errorEls.push(labelEl);
    else if (!agg) errorEls.push(aggEl);
    else completeDirect++;
  });
  if (completeDirect === 0 && !formAllowsEmptyDirectRowsForDerived(form)) {
    const fk = form.querySelector('#directMetricsRows .direct-metric-key');
    if (fk) errorEls.push(fk);
  }
  form.querySelectorAll('#derivedMetricsRows .derived-metric-row').forEach(row => {
    const type = row.querySelector('.derived-type-select')?.value;
    if (!type) return;
    if (type === 'ratio') {
      const dn = row.querySelector('.derived-display-name');
      const nu = row.querySelector('.derived-ratio-num');
      const de = row.querySelector('.derived-ratio-den');
      if (!String(dn?.value || '').trim()) errorEls.push(dn);
      if (!nu?.value) errorEls.push(nu);
      if (!de?.value) errorEls.push(de);
    } else if (type === 'conversion') {
      const dn = row.querySelector('.derived-display-name');
      const nu = row.querySelector('.derived-conv-num');
      if (!String(dn?.value || '').trim()) errorEls.push(dn);
      if (!nu?.value) errorEls.push(nu);
    } else if (type === 'retention') {
      const dn = row.querySelector('.derived-display-name');
      const basis = row.querySelector('.derived-retention-basis');
      const period = row.querySelector('.derived-retention-period')?.value;
      const customEl = row.querySelector('.derived-retention-custom-days');
      if (!String(dn?.value || '').trim()) errorEls.push(dn);
      if (!basis?.value) errorEls.push(basis);
      if (period === 'custom') {
        const c = parseInt(String(customEl?.value || '').trim(), 10);
        if (!Number.isInteger(c) || c < 2 || c > 90) errorEls.push(customEl);
      }
    }
  });
  return errorEls;
}

function validateEditForm(restricted) {
  clearEditFormErrors();
  const errorEls = [];
  const q = (sel) => document.querySelector(`#editExperimentForm ${sel}`);

  const nameInput = q('[name="name"]');
  if (!nameInput || !String(nameInput.value || '').trim()) {
    if (nameInput) errorEls.push(nameInput);
  }

  if (!restricted) {
    const targetTypeEl = document.getElementById('targetType');
    if (!targetTypeEl || !targetTypeEl.value) {
      if (targetTypeEl) errorEls.push(targetTypeEl);
    }
  }

  const endUserEl = document.getElementById('endUserCount');
  const n = parseInt(String(endUserEl?.value || '').trim(), 10);
  if (!endUserEl || !Number.isInteger(n) || n <= 500 || n > 10000000) {
    if (endUserEl) errorEls.push(endUserEl);
  }

  const endRunDaysWrap = document.getElementById('endRunDaysWrap');
  const endDaysEl = document.getElementById('endRunDays');
  if (endRunDaysWrap && endRunDaysWrap.classList.contains('is-open') && endDaysEl) {
    const raw = String(endDaysEl.value || '').trim();
    if (raw !== '') {
      const d = parseInt(raw, 10);
      if (!Number.isInteger(d) || d < 1 || d > 365) {
        errorEls.push(endDaysEl);
      }
    }
  }

  if (!restricted) {
    const userScopeEl = document.getElementById('userScope');
    if (userScopeEl && userScopeEl.value === 'targeted') {
      const tagCount = document.querySelectorAll('#editExperimentForm #scopeTags .scope-tag').length;
      if (tagCount === 0) {
        const scopeRules = document.getElementById('scopeRules');
        if (scopeRules) errorEls.push(scopeRules);
      }
    }
    const ttCustom = document.getElementById('targetType');
    const editFormEl = document.getElementById('editExperimentForm');
    if (ttCustom && ttCustom.value === 'custom' && isCustomMetricsDetailExpanded(editFormEl)) {
      validateCustomDataExpanded(editFormEl).forEach(el => errorEls.push(el));
    }
  }

  document.querySelectorAll('#editExperimentForm #trafficGroups .traffic-row').forEach(row => {
    const nameEl = row.querySelector('input[type="text"]');
    if (nameEl && !String(nameEl.value || '').trim()) {
      errorEls.push(nameEl);
    }
    if (!restricted) {
      const targetSel = row.querySelector('.target-select');
      const targetCustom = row.querySelector('.target-custom-input');
      if (targetSel) {
        if (!targetSel.value) errorEls.push(targetSel);
      } else if (targetCustom) {
        if (!String(targetCustom.value || '').trim()) errorEls.push(targetCustom);
      }
    }
  });

  const numInputs = document.querySelectorAll('#editExperimentForm #trafficGroups input[type="number"]');
  let sum = 0;
  numInputs.forEach(inp => {
    sum += parseInt(String(inp.value || '').trim(), 10) || 0;
  });
  if (sum !== 100) {
    numInputs.forEach(inp => errorEls.push(inp));
  }

  const seen = new Set();
  const unique = [];
  errorEls.forEach(el => {
    if (el && !seen.has(el)) {
      seen.add(el);
      unique.push(el);
    }
  });

  if (unique.length === 0) return true;

  unique.forEach(el => el.classList.add(CREATE_FIELD_ERROR));
  const first = findFirstElInVisualOrder(unique);
  if (first) {
    placeFirstEditFormErrorMessage(first);
    first.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  return false;
}

function serializeEditFormGroups() {
  const rows = document.querySelectorAll('#editExperimentForm #trafficGroups .traffic-row');
  const arr = [];
  rows.forEach(row => {
    const nameInp = row.querySelector('input[type="text"]');
    const trafficInp = row.querySelector('input[type="number"]');
    const meaningInp = row.querySelector('.meaning-input');
    const sel = row.querySelector('.target-select');
    const cust = row.querySelector('.target-custom-input');
    arr.push({
      name: (nameInp && nameInp.value) ? nameInp.value.trim() : '',
      traffic: trafficInp ? parseInt(trafficInp.value || '0', 10) || 0 : 0,
      meaning: meaningInp ? meaningInp.value : '',
      variable: sel ? sel.value : (cust ? cust.value : ''),
      isControl: row.dataset.isControl === 'true'
    });
  });
  return arr;
}

function applyEditSave(id) {
  const exp = experiments.find(e => e.id === id);
  if (!exp) return;
  const form = document.getElementById('editExperimentForm');
  const restricted = form && form.dataset.restricted === '1';
  exp.name = (form.querySelector('[name="name"]')?.value || '').trim() || exp.name;
  if (!restricted) {
    exp.goal = form.querySelector('[name="goal"]')?.value || '';
  }
  const n = parseInt(String(document.getElementById('endUserCount')?.value || '').trim(), 10);
  if (Number.isInteger(n) && n > 500 && n <= 10000000) exp.endUserStop = n;
  const endWrap = document.getElementById('endRunDaysWrap');
  if (endWrap && endWrap.classList.contains('is-open')) {
    const raw = String(document.getElementById('endRunDays')?.value || '').trim();
    exp.endRunDays = raw === '' ? null : parseInt(raw, 10);
  } else {
    exp.endRunDays = null;
  }
  if (!restricted) {
    const tt = document.getElementById('targetType')?.value;
    exp.target = tt === 'pricing' ? '定价' : tt === 'price_table' ? '价格表' : '自定义';
    if (tt === 'custom') {
      const cd = collectCustomDataFromForm(form);
      if (cd.direct.length || cd.derived.length) exp.customData = cd;
      else delete exp.customData;
      delete exp.customMetrics;
    } else {
      delete exp.customData;
      delete exp.customMetrics;
    }
    const us = document.getElementById('userScope')?.value;
    exp.userScopeSaved = us === 'all' ? '全部' : '定向';
    if (us === 'targeted' && typeof window.__editScopeList !== 'undefined' && window.__editScopeList) {
      exp.userScopeRulesSaved = window.__editScopeList.map(s => ({ dimension: s.dimension, value: s.value }));
    } else if (us === 'all') {
      exp.userScopeRulesSaved = [];
    }
  }
  exp.savedGroups = serializeEditFormGroups();
  exp.updatedAt = formatNowStamp().slice(0, 16);
  exp.updatedBy = 'zhangsan@example.com';
}

function captureEditFormSnapshot() {
  const form = document.getElementById('editExperimentForm');
  if (!form) return '';
  const restricted = form.dataset.restricted === '1';
  const endOpen = document.getElementById('endRunDaysWrap')?.classList.contains('is-open');
  const parts = [
    form.querySelector('[name="name"]')?.value || '',
    form.querySelector('[name="goal"]')?.value || '',
    document.getElementById('endUserCount')?.value || '',
    endOpen ? (document.getElementById('endRunDays')?.value || '') : '__closed__'
  ];
  if (!restricted) {
    parts.push(document.getElementById('targetType')?.value || '');
    parts.push(document.getElementById('userScope')?.value || '');
    parts.push(JSON.stringify(window.__editScopeList || []));
    parts.push(isCustomMetricsDetailExpanded(form) ? '1' : '0');
    parts.push(JSON.stringify(collectCustomDataFromForm(form)));
  }
  parts.push(JSON.stringify(serializeEditFormGroups()));
  return parts.join('\x01');
}

function editFormHasContent() {
  if (!document.getElementById('editExperimentForm')) return false;
  if (typeof window.__editFormInitialSnapshot === 'undefined') return false;
  return captureEditFormSnapshot() !== window.__editFormInitialSnapshot;
}

function createFormHasContent() {
  const name = document.querySelector('#createForm [name="name"]');
  const goal = document.querySelector('#createForm [name="goal"]');
  const targetType = document.getElementById('targetType');
  const scopeTags = document.getElementById('scopeTags');
  const endUserCount = document.getElementById('endUserCount');
  if (name && name.value.trim()) return true;
  if (goal && goal.value.trim()) return true;
  if (targetType && targetType.value) return true;
  if (endUserCount && endUserCount.dataset.initial !== undefined && String(endUserCount.value) !== String(endUserCount.dataset.initial)) return true;
  const endRunWrap = document.getElementById('endRunDaysWrap');
  const endRunDays = document.getElementById('endRunDays');
  if (endRunWrap && endRunWrap.classList.contains('is-open') && endRunDays && endRunDays.dataset.initial !== undefined && String(endRunDays.value) !== String(endRunDays.dataset.initial)) return true;
  if (scopeTags && scopeTags.querySelectorAll('.scope-tag').length > 0) return true;
  const targetCells = document.querySelectorAll('#trafficGroups .target-cell .target-select, #trafficGroups .target-cell .target-custom-input');
  for (let i = 0; i < targetCells.length; i++) {
    if (targetCells[i].value && targetCells[i].value.trim()) return true;
  }
  const cf = document.getElementById('createForm');
  if (isCustomMetricsDetailExpanded(cf) && hasCustomDataContent(cf)) return true;
  return false;
}

function showConfirmExitModal(onConfirm) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'confirmExitOverlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:400px;">
      <div class="modal-header"><span class="modal-title">提示</span></div>
      <div class="modal-body"><p style="margin:0;">退出后填写的内容将丢失，是否继续？</p></div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" id="confirmExitCancel">取消</button>
        <button type="button" class="btn btn-primary" id="confirmExitOk">继续退出</button>
      </div>
    </div>
  `;
  const remove = () => {
    overlay.remove();
  };
  overlay.querySelector('#confirmExitCancel').addEventListener('click', remove);
  overlay.querySelector('#confirmExitOk').addEventListener('click', () => {
    remove();
    onConfirm();
  });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) remove(); });
  document.body.appendChild(overlay);
}

const PAUSE_ACTION_MSG = '暂停状态下将无新用户进入实验，已进入实验用户不受影响';
const END_ACTION_MSG = '终止实验操作不可逆，终止实验后将无新用户进入实验';

function showExperimentActionModal(action, onConfirm) {
  const isPause = action === 'pause';
  const primaryText = isPause ? '暂停实验' : '终止实验';
  const msg = isPause ? PAUSE_ACTION_MSG : END_ACTION_MSG;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'experimentActionOverlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:420px;">
      <div class="modal-header"><span class="modal-title">提示</span></div>
      <div class="modal-body"><p style="margin:0;">${msg}</p></div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" id="expActionCancel">取消</button>
        <button type="button" class="btn btn-primary" id="expActionConfirm">${primaryText}</button>
      </div>
    </div>
  `;
  const remove = () => overlay.remove();
  overlay.querySelector('#expActionCancel').addEventListener('click', remove);
  overlay.querySelector('#expActionConfirm').addEventListener('click', () => {
    remove();
    onConfirm();
  });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) remove(); });
  document.body.appendChild(overlay);
}

/** 价格表实验激活被拦截：仅「确定」，不执行激活 */
function showPriceTableActivateBlockModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'expActivateBlockOverlay';
  const msg = '当前已有正在进行的「价格表」实验，同一时间只能运行一个价格表实验';
  overlay.innerHTML = `
    <div class="modal" style="max-width:420px;">
      <div class="modal-header"><span class="modal-title">提示</span></div>
      <div class="modal-body"><p style="margin:0;">${msg}</p></div>
      <div class="modal-footer">
        <button type="button" class="btn btn-primary" id="expActivateBlockOk">确定</button>
      </div>
    </div>
  `;
  const remove = () => overlay.remove();
  overlay.querySelector('#expActivateBlockOk').addEventListener('click', remove);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) remove(); });
  document.body.appendChild(overlay);
}

function hasOtherNonTerminalPriceTableExperiment(currentId) {
  return experiments.some(e =>
    e.id !== currentId &&
    e.target === '价格表' &&
    e.status !== 'ended'
  );
}

const CREATE_FIELD_ERROR = 'field-has-error';
const CREATE_ERROR_MSG_ID = 'createFormFirstErrorMsg';

function clearCreateFormErrors() {
  const form = document.getElementById('createForm');
  if (!form) return;
  form.querySelectorAll('.' + CREATE_FIELD_ERROR).forEach(el => el.classList.remove(CREATE_FIELD_ERROR));
  document.getElementById(CREATE_ERROR_MSG_ID)?.remove();
}

function findFirstElInVisualOrder(elements) {
  if (!elements.length) return null;
  const list = elements.filter(Boolean);
  if (list.length === 1) return list[0];
  return [...list].sort((a, b) => {
    const ta = a.getBoundingClientRect().top + window.scrollY;
    const tb = b.getBoundingClientRect().top + window.scrollY;
    if (Math.abs(ta - tb) < 2) {
      const ra = a.getBoundingClientRect().left + window.scrollX;
      const rb = b.getBoundingClientRect().left + window.scrollX;
      return ra - rb;
    }
    return ta - tb;
  })[0];
}

function placeFirstCreateFormErrorMessage(firstEl) {
  document.getElementById(CREATE_ERROR_MSG_ID)?.remove();
  const p = document.createElement('p');
  p.id = CREATE_ERROR_MSG_ID;
  p.className = 'form-hint create-form-field-error-msg';
  p.textContent = '请完成此项配置';
  const trafficRow = firstEl.closest('.traffic-row');
  const derivedMetricRow = firstEl.closest('.derived-metric-row');
  const customMetricRow = firstEl.closest('.custom-metric-row');
  const endLine = firstEl.closest('.end-config-line');
  if (trafficRow) {
    trafficRow.insertAdjacentElement('afterend', p);
  } else if (derivedMetricRow) {
    derivedMetricRow.insertAdjacentElement('afterend', p);
  } else if (customMetricRow) {
    customMetricRow.insertAdjacentElement('afterend', p);
  } else if (endLine) {
    endLine.insertAdjacentElement('afterend', p);
  } else {
    firstEl.insertAdjacentElement('afterend', p);
  }
}

/** 除「分组说明」「实验目标与方案描述」「运行天数（可选）」外必填；失败时标红并在首错下展示文案并滚动 */
function validateCreateForm() {
  clearCreateFormErrors();
  const errorEls = [];

  const nameInput = document.querySelector('#createForm [name="name"]');
  if (!nameInput || !String(nameInput.value || '').trim()) {
    if (nameInput) errorEls.push(nameInput);
  }

  const targetTypeEl = document.getElementById('targetType');
  if (!targetTypeEl || !targetTypeEl.value) {
    if (targetTypeEl) errorEls.push(targetTypeEl);
  }

  const endUserEl = document.getElementById('endUserCount');
  const n = parseInt(String(endUserEl?.value || '').trim(), 10);
  if (!endUserEl || !Number.isInteger(n) || n <= 500 || n > 10000000) {
    if (endUserEl) errorEls.push(endUserEl);
  }

  const endRunDaysWrap = document.getElementById('endRunDaysWrap');
  const endDaysEl = document.getElementById('endRunDays');
  if (endRunDaysWrap && endRunDaysWrap.classList.contains('is-open') && endDaysEl) {
    const raw = String(endDaysEl.value || '').trim();
    if (raw !== '') {
      const d = parseInt(raw, 10);
      if (!Number.isInteger(d) || d < 1 || d > 365) {
        errorEls.push(endDaysEl);
      }
    }
  }

  const userScopeEl = document.getElementById('userScope');
  if (userScopeEl && userScopeEl.value === 'targeted') {
    const tagCount = document.querySelectorAll('#scopeTags .scope-tag').length;
    if (tagCount === 0) {
      const scopeRules = document.getElementById('scopeRules');
      if (scopeRules) errorEls.push(scopeRules);
    }
  }

  const targetTypeForCustom = document.getElementById('targetType');
  const createFormEl = document.getElementById('createForm');
  if (targetTypeForCustom && targetTypeForCustom.value === 'custom' && isCustomMetricsDetailExpanded(createFormEl)) {
    validateCustomDataExpanded(createFormEl).forEach(el => errorEls.push(el));
  }

  document.querySelectorAll('#trafficGroups .traffic-row').forEach(row => {
    const nameEl = row.querySelector('input[type="text"]');
    if (nameEl && !nameEl.readOnly && !String(nameEl.value || '').trim()) {
      errorEls.push(nameEl);
    }
    const targetSel = row.querySelector('.target-select');
    const targetCustom = row.querySelector('.target-custom-input');
    if (targetSel) {
      if (!targetSel.value) errorEls.push(targetSel);
    } else if (targetCustom) {
      if (!String(targetCustom.value || '').trim()) errorEls.push(targetCustom);
    }
  });

  const numInputs = document.querySelectorAll('#trafficGroups input[type="number"]');
  let sum = 0;
  numInputs.forEach(inp => {
    sum += parseInt(String(inp.value || '').trim(), 10) || 0;
  });
  if (sum !== 100) {
    numInputs.forEach(inp => errorEls.push(inp));
  }

  const seen = new Set();
  const unique = [];
  errorEls.forEach(el => {
    if (el && !seen.has(el)) {
      seen.add(el);
      unique.push(el);
    }
  });

  if (unique.length === 0) return true;

  unique.forEach(el => el.classList.add(CREATE_FIELD_ERROR));
  const first = findFirstElInVisualOrder(unique);
  if (first) {
    placeFirstCreateFormErrorMessage(first);
    first.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  return false;
}

function bindCreateFormEvents() {
  const targetType = document.getElementById('targetType');
  const controlGroupHint = document.getElementById('controlGroupHint');
  const customTargetHintWrap = document.getElementById('customTargetHintWrap');
  function updateTargetColumn() {
    const v = targetType?.value || '';
    if (controlGroupHint) controlGroupHint.style.display = (v === 'pricing' || v === 'price_table') ? 'block' : 'none';
    if (customTargetHintWrap) customTargetHintWrap.style.display = v === 'custom' ? 'block' : 'none';
    const optWrap = document.getElementById('customMetricsOptionalWrap');
    const detailWrap = document.getElementById('customMetricsDetailWrap');
    const collapsedRow = document.getElementById('customMetricsCollapsedRow');
    const directMetricsRows = document.getElementById('directMetricsRows');
    const derivedMetricsRows = document.getElementById('derivedMetricsRows');
    if (optWrap) {
      optWrap.style.display = v === 'custom' ? 'block' : 'none';
      if (v !== 'custom') {
        if (detailWrap) {
          detailWrap.style.display = 'none';
          detailWrap.hidden = true;
        }
        if (collapsedRow) collapsedRow.style.display = '';
        if (directMetricsRows) directMetricsRows.innerHTML = '';
        if (derivedMetricsRows) derivedMetricsRows.innerHTML = '';
      }
    }
    const cells = document.querySelectorAll('#trafficGroups .target-cell');
    if (v === 'custom') {
      const defaultValues = ['value1', 'value2'];
      cells.forEach((cell, i) => {
        const input = cell.querySelector('.target-custom-input');
        const prevVal = (input && input.value) ? input.value.replace(/"/g, '&quot;').replace(/</g, '&lt;') : '';
        const defaultVal = defaultValues[i];
        const valueAttr = prevVal || (defaultVal || '');
        const placeholder = (prevVal || defaultVal) ? '' : '填写该分组对应的值';
        cell.innerHTML = `<input type="text" class="target-custom-input" placeholder="${placeholder}"${valueAttr ? ` value="${valueAttr}"` : ''}>`;
      });
    } else {
      const opts = v === 'pricing' ? PRICING_OPTIONS : v === 'price_table' ? buildPriceTableOptionsHtml() : '<option value="">请先选择实验对象</option>';
      cells.forEach(cell => {
        const sel = cell.querySelector('.target-select');
        const prevVal = sel ? sel.value : '';
        cell.innerHTML = `<select class="target-select">${opts}</select>`;
        const newSel = cell.querySelector('.target-select');
        if (newSel && prevVal) {
          for (let i = 0; i < newSel.options.length; i++) {
            const o = newSel.options[i];
            if (o.value === prevVal && !o.disabled) {
              newSel.selectedIndex = i;
              break;
            }
          }
        }
      });
    }
  }
  if (targetType) {
    targetType.addEventListener('change', updateTargetColumn);
  }
  if (window.__abCreatePreset) {
    const p = window.__abCreatePreset;
    if (targetType && p.targetType) {
      targetType.value = p.targetType;
      updateTargetColumn();
    }
    const firstRowSelect = document.querySelector('#trafficGroups .traffic-row:first-child .target-select');
    if (firstRowSelect && p.controlTarget) {
      for (let i = 0; i < firstRowSelect.options.length; i++) {
        const o = firstRowSelect.options[i];
        if (o.value === p.controlTarget && !o.disabled) {
          firstRowSelect.selectedIndex = i;
          break;
        }
      }
    }
    window.__abCreatePreset = null;
  }
  const userScope = document.getElementById('userScope');
  const scopeRules = document.getElementById('scopeRules');
  let scopeList = [];
  function renderCreateScopeTags() {
    const el = document.getElementById('scopeTags');
    if (!el) return;
    el.innerHTML = scopeList.map((s, i) =>
      `<span class="scope-tag">${s.dimension}: ${s.value} <span class="remove" data-i="${i}">×</span></span>`
    ).join('');
    el.querySelectorAll('.remove').forEach(elR => {
      elR.onclick = () => {
        scopeList.splice(+elR.dataset.i, 1);
        clearCreateFormErrors();
        renderCreateScopeTags();
        if (document.getElementById('scopeDim')?.value === '国家') {
          mountScopeValueHost('国家', getPresetForScopeMount('国家', scopeList));
        }
      };
    });
  }
  if (userScope) {
    userScope.addEventListener('change', () => {
      const show = userScope.value === 'targeted';
      scopeRules.style.display = show ? 'block' : 'none';
      if (show) {
        const d = document.getElementById('scopeDim')?.value || '国家';
        mountScopeValueHost(d, getPresetForScopeMount(d, scopeList));
      }
    });
  }
  if (scopeRules) {
    scopeRules.addEventListener('change', (e) => {
      const t = e.target;
      if (!t.classList?.contains('scope-country-cb')) return;
      if (document.getElementById('scopeDim')?.value !== '国家') return;
      const form = document.getElementById('createForm');
      if (!form || !form.contains(t)) return;
      const host = document.getElementById('scopeValueHost');
      if (!host || !host.contains(t)) return;
      const val = readCountryScopeValueFromHost(host);
      scopeList = scopeList.filter(s => s.dimension !== '国家');
      if (val) scopeList.push({ dimension: '国家', value: val });
      renderCreateScopeTags();
      clearCreateFormErrors();
    });
    scopeRules.addEventListener('input', (e) => {
      const inp = e.target;
      if (!inp.classList?.contains('scope-country-filter')) return;
      const form = document.getElementById('createForm');
      if (!form || !form.contains(inp)) return;
      const host = document.getElementById('scopeValueHost');
      if (!host || !host.contains(inp)) return;
      const q = inp.value.trim().toLowerCase();
      host.querySelectorAll('.scope-country-row').forEach(row => {
        const hay = (row.getAttribute('data-search') || '').toLowerCase();
        row.style.display = !q || hay.includes(q) ? '' : 'none';
      });
    });
  }
  document.getElementById('scopeDim')?.addEventListener('change', () => {
    const d = document.getElementById('scopeDim').value;
    mountScopeValueHost(d, getPresetForScopeMount(d, scopeList));
  });
  {
    const d0 = document.getElementById('scopeDim')?.value || '国家';
    mountScopeValueHost(d0, getPresetForScopeMount(d0, scopeList));
  }
  document.getElementById('addScope')?.addEventListener('click', () => {
    const dim = document.getElementById('scopeDim').value;
    if (dim === '国家') return;
    const val = readScopeValueFromHost(dim);
    if (!String(val).trim()) return;
    scopeList.push({ dimension: dim, value: val });
    renderCreateScopeTags();
    clearScopeValueHost(dim);
    mountScopeValueHost(dim, getPresetForScopeMount(dim, scopeList));
    clearCreateFormErrors();
  });
  function updateTrafficTotal() {
    const nums = document.querySelectorAll('#trafficGroups input[type="number"]');
    let t = 0;
    nums.forEach(n => { t += parseInt(n.value || 0, 10); });
    const totalEl = document.getElementById('trafficTotal');
    if (totalEl) totalEl.textContent = t;
  }
  function redistributeTrafficEqually() {
    const container = document.getElementById('trafficGroups');
    if (!container) return;
    const inputs = container.querySelectorAll('input[type="number"]');
    const count = inputs.length;
    if (count === 0) return;
    const base = Math.floor(100 / count);
    const remainder = 100 % count;
    inputs.forEach((input, i) => {
      input.value = i < remainder ? base + 1 : base;
    });
    updateTrafficTotal();
  }
  document.querySelectorAll('#trafficGroups input[type="number"]').forEach(el => {
    el.addEventListener('input', updateTrafficTotal);
  });
  function getExperimentRowCount() {
    const container = document.getElementById('trafficGroups');
    if (!container) return 0;
    return container.querySelectorAll('.traffic-row:not([data-is-control="true"])').length;
  }
  function refreshRemoveGroupButtons() {
    const n = getExperimentRowCount();
    document.querySelectorAll('#trafficGroups .traffic-row:not([data-is-control="true"]) .traffic-row-action').forEach(el => {
      el.style.display = n > 1 ? 'inline-flex' : 'none';
    });
  }
  document.getElementById('addGroup')?.addEventListener('click', () => {
    const container = document.getElementById('trafficGroups');
    const count = container.querySelectorAll('.traffic-row').length;
    if (count >= 6) return alert('最多 6 个组（1 对照组 + 5 实验组）');
    const v = document.getElementById('targetType')?.value || '';
    let middleHtml;
    if (v === 'custom') {
      middleHtml = '<div class="target-cell"><input type="text" class="target-custom-input" placeholder="填写该分组对应的值" /></div><div class="target-meaning-cell"><input type="text" class="meaning-input" placeholder="记录该分组的业务逻辑（选填）" /></div>';
    } else {
      const opts = v === 'pricing' ? PRICING_OPTIONS : v === 'price_table' ? buildPriceTableOptionsHtml() : '<option value="">请先选择实验对象</option>';
      middleHtml = `<div class="target-cell"><select class="target-select">${opts}</select></div><div class="target-meaning-cell"><input type="text" class="meaning-input" placeholder="记录该分组的业务逻辑（选填）" /></div>`;
    }
    const row = document.createElement('div');
    row.className = 'traffic-row';
    row.innerHTML = `<input type="text" placeholder="实验分组名称" />${middleHtml}<input type="number" min="0" max="100" value="0" placeholder="流量%" /><span class="traffic-row-action"><button type="button" class="btn btn-ghost btn-sm btn-remove-group" title="删除该实验组" aria-label="删除该实验组">${TRASH_ICON_SVG}</button></span>`;
    container.appendChild(row);
    row.querySelector('input[type="number"]').addEventListener('input', updateTrafficTotal);
    redistributeTrafficEqually();
    refreshRemoveGroupButtons();
  });
  document.getElementById('trafficGroups')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-remove-group');
    if (!btn) return;
    const row = btn.closest('.traffic-row');
    if (!row || row.dataset.isControl === 'true') return;
    if (getExperimentRowCount() <= 1) return;
    row.remove();
    redistributeTrafficEqually();
    updateTrafficTotal();
    refreshRemoveGroupButtons();
  });
  refreshRemoveGroupButtons();
  const endUserEl = document.getElementById('endUserCount');
  const endDaysEl = document.getElementById('endRunDays');
  const endRunDaysWrap = document.getElementById('endRunDaysWrap');
  const addMaxRunBtn = document.getElementById('addMaxRunDurationBtn');
  const removeMaxRunBtn = document.getElementById('removeMaxRunDurationBtn');
  if (endUserEl) endUserEl.dataset.initial = endUserEl.value;
  function expandEndRunDays() {
    if (!endRunDaysWrap || !endDaysEl || !addMaxRunBtn) return;
    endRunDaysWrap.classList.add('is-open');
    endRunDaysWrap.setAttribute('aria-hidden', 'false');
    addMaxRunBtn.hidden = true;
    if (endDaysEl.dataset.initial === undefined) endDaysEl.dataset.initial = endDaysEl.value;
  }
  function collapseEndRunDays() {
    if (!endRunDaysWrap || !endDaysEl || !addMaxRunBtn) return;
    endRunDaysWrap.classList.remove('is-open');
    endRunDaysWrap.setAttribute('aria-hidden', 'true');
    addMaxRunBtn.hidden = false;
    endDaysEl.value = '30';
    delete endDaysEl.dataset.initial;
  }
  addMaxRunBtn?.addEventListener('click', expandEndRunDays);
  removeMaxRunBtn?.addEventListener('click', collapseEndRunDays);
  const createFormEl = document.getElementById('createForm');
  createFormEl?.addEventListener('input', () => clearCreateFormErrors());
  createFormEl?.addEventListener('change', () => clearCreateFormErrors());
  createFormEl?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateCreateForm()) return;
    alert('原型：已保存为草稿。');
    location.hash = '#/experiments';
  });
  document.getElementById('createPageBackBtn')?.addEventListener('click', () => {
    if (createFormHasContent()) {
      showConfirmExitModal(() => { location.hash = '#/experiments'; });
    } else {
      location.hash = '#/experiments';
    }
  });
  bindCustomMetricsInteractions(document.getElementById('createForm'));
  const _cf = document.getElementById('createForm');
  if (_cf) {
    refreshDerivedAddButtonState(_cf);
    refreshDirectMetricDeleteButtons(_cf);
  }
  updateTargetColumn();
}

function bindEditFormEvents(id) {
  const form = document.getElementById('editExperimentForm');
  if (!form) return;
  const restricted = form.dataset.restricted === '1';
  const detail = getExperimentDetail(id);
  let scopeList = (detail.userScopeRules || []).map(r => ({ dimension: r.dimension, value: r.value }));
  window.__editScopeList = scopeList;

  function refreshScopeTagsForEdit() {
    const el = document.getElementById('scopeTags');
    if (!el || restricted) return;
    el.innerHTML = scopeList.map((s, i) =>
      `<span class="scope-tag">${s.dimension}: ${s.value} <span class="remove" data-i="${i}">×</span></span>`
    ).join('');
    el.querySelectorAll('.remove').forEach(elR => {
      elR.onclick = () => {
        scopeList.splice(+elR.dataset.i, 1);
        window.__editScopeList = scopeList;
        refreshScopeTagsForEdit();
        if (document.getElementById('scopeDim')?.value === '国家') {
          mountScopeValueHost('国家', getPresetForScopeMount('国家', scopeList));
        }
        clearEditFormErrors();
      };
    });
  }
  if (!restricted) {
    refreshScopeTagsForEdit();
  }

  const scopeRulesEl = document.getElementById('scopeRules');
  if (!restricted && scopeRulesEl) {
    scopeRulesEl.addEventListener('change', (e) => {
      const t = e.target;
      if (!t.classList?.contains('scope-country-cb')) return;
      if (document.getElementById('scopeDim')?.value !== '国家') return;
      const form = document.getElementById('editExperimentForm');
      if (!form || !form.contains(t)) return;
      const host = document.getElementById('scopeValueHost');
      if (!host || !host.contains(t)) return;
      const val = readCountryScopeValueFromHost(host);
      scopeList = scopeList.filter(s => s.dimension !== '国家');
      if (val) scopeList.push({ dimension: '国家', value: val });
      window.__editScopeList = scopeList;
      refreshScopeTagsForEdit();
      clearEditFormErrors();
    });
    scopeRulesEl.addEventListener('input', (e) => {
      const inp = e.target;
      if (!inp.classList?.contains('scope-country-filter')) return;
      const form = document.getElementById('editExperimentForm');
      if (!form || !form.contains(inp)) return;
      const host = document.getElementById('scopeValueHost');
      if (!host || !host.contains(inp)) return;
      const q = inp.value.trim().toLowerCase();
      host.querySelectorAll('.scope-country-row').forEach(row => {
        const hay = (row.getAttribute('data-search') || '').toLowerCase();
        row.style.display = !q || hay.includes(q) ? '' : 'none';
      });
    });
  }

  const targetType = document.getElementById('targetType');
  const controlGroupHint = document.getElementById('controlGroupHint');
  const customTargetHintWrap = document.getElementById('customTargetHintWrap');
  function updateTargetColumn() {
    const v = targetType?.value || '';
    if (controlGroupHint) controlGroupHint.style.display = (v === 'pricing' || v === 'price_table') ? 'block' : 'none';
    if (customTargetHintWrap) customTargetHintWrap.style.display = v === 'custom' ? 'block' : 'none';
    const editOptWrap = document.querySelector('#editExperimentForm #customMetricsOptionalWrap');
    const editDetailWrap = document.querySelector('#editExperimentForm #customMetricsDetailWrap');
    const editCollapsedRow = document.querySelector('#editExperimentForm #customMetricsCollapsedRow');
    const editDirectRows = document.querySelector('#editExperimentForm #directMetricsRows');
    const editDerivedRows = document.querySelector('#editExperimentForm #derivedMetricsRows');
    if (editOptWrap && !restricted) {
      editOptWrap.style.display = v === 'custom' ? 'block' : 'none';
      if (v !== 'custom') {
        if (editDetailWrap) {
          editDetailWrap.style.display = 'none';
          editDetailWrap.hidden = true;
        }
        if (editCollapsedRow) editCollapsedRow.style.display = '';
        if (editDirectRows) editDirectRows.innerHTML = '';
        if (editDerivedRows) editDerivedRows.innerHTML = '';
      }
    }
    const cells = document.querySelectorAll('#editExperimentForm #trafficGroups .target-cell');
    if (v === 'custom') {
      const defaultValues = ['value1', 'value2'];
      cells.forEach((cell, i) => {
        const input = cell.querySelector('.target-custom-input');
        const prevVal = (input && input.value) ? input.value.replace(/"/g, '&quot;').replace(/</g, '&lt;') : '';
        const defaultVal = defaultValues[i];
        const valueAttr = prevVal || (defaultVal || '');
        const placeholder = (prevVal || defaultVal) ? '' : '填写该分组对应的值';
        cell.innerHTML = `<input type="text" class="target-custom-input" placeholder="${placeholder}"${valueAttr ? ` value="${valueAttr}"` : ''}>`;
      });
    } else {
      const opts = v === 'pricing' ? PRICING_OPTIONS : v === 'price_table' ? buildPriceTableOptionsHtml() : '<option value="">请先选择实验对象</option>';
      cells.forEach(cell => {
        const sel = cell.querySelector('.target-select');
        const prevVal = sel ? sel.value : '';
        cell.innerHTML = `<select class="target-select">${opts}</select>`;
        const newSel = cell.querySelector('.target-select');
        if (newSel && prevVal) {
          for (let i = 0; i < newSel.options.length; i++) {
            const o = newSel.options[i];
            if (o.value === prevVal && !o.disabled) {
              newSel.selectedIndex = i;
              break;
            }
          }
        }
      });
    }
  }
  if (!restricted && targetType) {
    targetType.addEventListener('change', updateTargetColumn);
  }
  const userScope = document.getElementById('userScope');
  const scopeRules = document.getElementById('scopeRules');
  if (!restricted && userScope && scopeRules) {
    userScope.addEventListener('change', () => {
      const show = userScope.value === 'targeted';
      scopeRules.style.display = show ? 'block' : 'none';
      if (show) {
        const d = document.getElementById('scopeDim')?.value || '国家';
        mountScopeValueHost(d, getPresetForScopeMount(d, scopeList));
      }
    });
  }
  if (!restricted) {
    document.getElementById('scopeDim')?.addEventListener('change', () => {
      const d = document.getElementById('scopeDim').value;
      mountScopeValueHost(d, getPresetForScopeMount(d, scopeList));
    });
    {
      const d0 = document.getElementById('scopeDim')?.value || '国家';
      mountScopeValueHost(d0, getPresetForScopeMount(d0, scopeList));
    }
    document.getElementById('addScope')?.addEventListener('click', () => {
      const dim = document.getElementById('scopeDim').value;
      if (dim === '国家') return;
      const val = readScopeValueFromHost(dim);
      if (!String(val).trim()) return;
      scopeList.push({ dimension: dim, value: val });
      window.__editScopeList = scopeList;
      clearScopeValueHost(dim);
      mountScopeValueHost(dim, getPresetForScopeMount(dim, scopeList));
      refreshScopeTagsForEdit();
      clearEditFormErrors();
    });
  }

  function updateTrafficTotal() {
    const nums = document.querySelectorAll('#editExperimentForm #trafficGroups input[type="number"]');
    let t = 0;
    nums.forEach(n => { t += parseInt(n.value || 0, 10); });
    const totalEl = document.getElementById('trafficTotal');
    if (totalEl) totalEl.textContent = t;
  }
  function redistributeTrafficEqually() {
    const container = document.getElementById('trafficGroups');
    if (!container) return;
    const inputs = container.querySelectorAll('input[type="number"]');
    const count = inputs.length;
    if (count === 0) return;
    const base = Math.floor(100 / count);
    const remainder = 100 % count;
    inputs.forEach((input, i) => {
      input.value = i < remainder ? base + 1 : base;
    });
    updateTrafficTotal();
  }
  document.querySelectorAll('#editExperimentForm #trafficGroups input[type="number"]').forEach(el => {
    el.addEventListener('input', updateTrafficTotal);
  });

  function getExperimentRowCount() {
    const container = document.getElementById('trafficGroups');
    if (!container) return 0;
    return container.querySelectorAll('.traffic-row:not([data-is-control="true"])').length;
  }
  function refreshRemoveGroupButtons() {
    if (restricted) return;
    const n = getExperimentRowCount();
    document.querySelectorAll('#trafficGroups .traffic-row:not([data-is-control="true"]) .traffic-row-action').forEach(el => {
      el.style.display = n > 1 ? 'inline-flex' : 'none';
    });
  }

  if (!restricted) {
    document.getElementById('addGroup')?.addEventListener('click', () => {
      const container = document.getElementById('trafficGroups');
      const count = container.querySelectorAll('.traffic-row').length;
      if (count >= 6) return alert('最多 6 个组（1 对照组 + 5 实验组）');
      const v = document.getElementById('targetType')?.value || '';
      let middleHtml;
      if (v === 'custom') {
        middleHtml = '<div class="target-cell"><input type="text" class="target-custom-input" placeholder="填写该分组对应的值" /></div><div class="target-meaning-cell"><input type="text" class="meaning-input" placeholder="记录该分组的业务逻辑（选填）" /></div>';
      } else {
        const opts = v === 'pricing' ? PRICING_OPTIONS : v === 'price_table' ? buildPriceTableOptionsHtml() : '<option value="">请先选择实验对象</option>';
        middleHtml = `<div class="target-cell"><select class="target-select">${opts}</select></div><div class="target-meaning-cell"><input type="text" class="meaning-input" placeholder="记录该分组的业务逻辑（选填）" /></div>`;
      }
      const row = document.createElement('div');
      row.className = 'traffic-row';
      row.innerHTML = `<input type="text" placeholder="实验分组名称" />${middleHtml}<input type="number" min="0" max="100" value="0" placeholder="流量%" /><span class="traffic-row-action"><button type="button" class="btn btn-ghost btn-sm btn-remove-group" title="删除该实验组" aria-label="删除该实验组">${TRASH_ICON_SVG}</button></span>`;
      container.appendChild(row);
      row.querySelector('input[type="number"]').addEventListener('input', updateTrafficTotal);
      redistributeTrafficEqually();
      refreshRemoveGroupButtons();
    });
    document.getElementById('trafficGroups')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-remove-group');
      if (!btn || btn.disabled) return;
      const row = btn.closest('.traffic-row');
      if (!row || row.dataset.isControl === 'true') return;
      if (getExperimentRowCount() <= 1) return;
      row.remove();
      redistributeTrafficEqually();
      updateTrafficTotal();
      refreshRemoveGroupButtons();
    });
  }
  refreshRemoveGroupButtons();

  const endUserEl = document.getElementById('endUserCount');
  const endDaysEl = document.getElementById('endRunDays');
  const endRunDaysWrap = document.getElementById('endRunDaysWrap');
  const addMaxRunBtn = document.getElementById('addMaxRunDurationBtn');
  const removeMaxRunBtn = document.getElementById('removeMaxRunDurationBtn');
  if (endUserEl) endUserEl.dataset.initial = endUserEl.value;
  function expandEndRunDays() {
    if (!endRunDaysWrap || !endDaysEl || !addMaxRunBtn) return;
    endRunDaysWrap.classList.add('is-open');
    endRunDaysWrap.setAttribute('aria-hidden', 'false');
    addMaxRunBtn.hidden = true;
    if (endDaysEl.dataset.initial === undefined) endDaysEl.dataset.initial = endDaysEl.value;
  }
  function collapseEndRunDays() {
    if (!endRunDaysWrap || !endDaysEl || !addMaxRunBtn) return;
    endRunDaysWrap.classList.remove('is-open');
    endRunDaysWrap.setAttribute('aria-hidden', 'true');
    addMaxRunBtn.hidden = false;
    endDaysEl.value = '30';
    delete endDaysEl.dataset.initial;
  }
  addMaxRunBtn?.addEventListener('click', expandEndRunDays);
  removeMaxRunBtn?.addEventListener('click', collapseEndRunDays);

  form.addEventListener('input', () => clearEditFormErrors());
  form.addEventListener('change', () => clearEditFormErrors());
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateEditForm(restricted)) return;
    applyEditSave(id);
    location.hash = '#/experiments/' + id;
  });
  document.getElementById('editPageBackBtn')?.addEventListener('click', () => {
    if (editFormHasContent()) {
      showConfirmExitModal(() => { location.hash = '#/experiments/' + id; });
    } else {
      location.hash = '#/experiments/' + id;
    }
  });
  bindCustomMetricsInteractions(form);
  updateTargetColumn();
  refreshDerivedAddButtonState(form);
  refreshDirectMetricDeleteButtons(form);
  refreshDerivedSelectOptionsInForm(form);
  refreshCustomMetricDeleteButtons();
  window.__editFormInitialSnapshot = captureEditFormSnapshot();
}

function renderExperimentDetail(id, tab) {
  const detail = getExperimentDetail(id);
  const data = getExperimentData(id);
  const isDetail = tab === 'detail';
  return `
    <div class="card">
      <div class="card-header detail-page-header">
        <div class="detail-header-left">
          <span class="detail-exp-name">${detail.name}</span>
          ${detail.status !== 'draft' ? `
            <div class="detail-exp-times">
              <span>实验开始时间：${formatDetailTime(detail.startedAt)}</span>
              ${detail.status === 'ended' ? `<span class="detail-time-sep"> · </span><span>结束时间：${formatDetailTime(detail.endedAt)}</span>` : ''}
            </div>
          ` : ''}
        </div>
        <div class="action-bar">
          ${detail.status !== 'ended' ? `<button class="btn btn-ghost btn-sm" data-action="edit">编辑配置</button>` : ''}
          <span class="badge badge-${detail.status}">${detail.status === 'active' ? '运行中' : detail.status === 'draft' ? '草稿' : detail.status === 'paused' ? '已暂停' : '已结束'}</span>
          ${detail.status === 'draft' ? `
            <div class="dropdown-wrap">
              <button type="button" class="btn btn-secondary btn-sm dropdown-trigger" id="expActionDropdownBtn">操作 <span class="dropdown-arrow">▼</span></button>
              <div class="dropdown-menu" id="expActionDropdownMenu">
                <button type="button" class="dropdown-item" data-action="activate">激活实验</button>
                <button type="button" class="dropdown-item" data-action="end">结束实验</button>
              </div>
            </div>
          ` : ''}
          ${detail.status === 'paused' ? `<button class="btn btn-primary btn-sm" data-action="resume">继续实验</button>` : ''}
          ${detail.status === 'active' ? `
            <div class="dropdown-wrap">
              <button type="button" class="btn btn-secondary btn-sm dropdown-trigger" id="expActionDropdownBtn">操作 <span class="dropdown-arrow">▼</span></button>
              <div class="dropdown-menu" id="expActionDropdownMenu">
                <button type="button" class="dropdown-item" data-action="pause">暂停实验</button>
                <button type="button" class="dropdown-item" data-action="end">结束实验</button>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
      <div class="card-body">
        <div class="tabs">
          <button type="button" class="tab ${isDetail ? 'active' : ''}" data-tab="detail">实验详情 / 管理</button>
          <button type="button" class="tab ${!isDetail ? 'active' : ''} ${detail.status === 'ended' ? 'tab-with-data-hint' : ''}" data-tab="data">
            <span class="tab-data-label">实验数据</span>
            ${detail.status === 'ended' ? `
              <span class="data-tab-hint-wrap" tabindex="0" aria-label="实验数据说明">
                <span class="data-tab-hint-icon" aria-hidden="true">?</span>
                <span class="data-tab-hint-popover" role="tooltip">
                  <p class="data-tab-hint-popover-body">实验结束后，实验不再进入新用户，已进入实验用户的长周期 或 延迟反馈类数据（例如续费率、退款率等）将持续更新。</p>
                </span>
              </span>
            ` : ''}
          </button>
        </div>
        ${isDetail ? renderDetailTab(detail) : renderDataTab(data)}
      </div>
    </div>
  `;
}

function renderDetailTab(detail) {
  if (lastDetailExperimentId !== detail.id) {
    lastDetailExperimentId = detail.id;
    detailUserPage = 1;
    detailUserSearch = '';
  }
  const scopeText = detail.userScope === '全部' ? '全部用户' : (detail.userScopeRules || []).map(r => `${r.dimension}: ${r.value}`).join('；');
  const groupsHtml = (detail.groups || []).map(g => `<div class="detail-item"><label>${g.name}</label><div class="value">${g.traffic}% 流量</div></div>`).join('');
  const allAssignments = detail.userAssignments || [];
  const searchLowerRaw = detailUserSearch.trim();
  const filtered = searchLowerRaw
    ? allAssignments.filter(u => userAssignmentMatchesSearch(u, searchLowerRaw))
    : allAssignments;
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / DETAIL_USER_PAGE_SIZE));
  const page = Math.min(detailUserPage, totalPages);
  const start = (page - 1) * DETAIL_USER_PAGE_SIZE;
  const pageData = filtered.slice(start, start + DETAIL_USER_PAGE_SIZE);
  const tableRows = pageData.map(u => `
    <tr>
      <td>${escapeHtmlText(u.experimentUid != null && u.experimentUid !== '' ? String(u.experimentUid) : '—')}</td>
      ${htmlDetailMultiValueCell(u.customerIds, detailUserSearch, 'customer')}
      ${htmlDetailMultiValueCell(u.payerIds, detailUserSearch, 'payer')}
      <td>${escapeHtmlText(u.ip || '—')}</td>
      <td>
        <select class="select-group" data-row-key="${escapeHtmlAttr(u.rowKey || '')}">
          ${(detail.groups || []).map(g => `<option value="${escapeHtmlAttr(g.name)}"${u.group === g.name ? ' selected' : ''}>${escapeHtmlText(g.name)}</option>`).join('')}
        </select>
      </td>
      <td>${escapeHtmlText(u.assignedAt || '—')}</td>
    </tr>
  `).join('');
  const paginationHtml = `
    <div class="pagination-bar">
      <span class="pagination-total">共 ${total} 条</span>
      <div class="pagination-btns">
        <button type="button" class="btn btn-secondary btn-sm pagination-btn" data-page="prev" ${page <= 1 ? 'disabled' : ''}>上一页</button>
        <span class="pagination-info">第 ${page} / ${totalPages} 页</span>
        <button type="button" class="btn btn-secondary btn-sm pagination-btn" data-page="next" ${page >= totalPages ? 'disabled' : ''}>下一页</button>
      </div>
    </div>
  `;
  return `
    <div class="detail-grid detail-meta-grid" style="margin-bottom:20px;">
      <div class="detail-item"><label>实验创建时间</label><div class="value">${formatDetailTime(detail.createdAt)}</div></div>
      <div class="detail-item"><label>创建人</label><div class="value">${detail.createdBy != null && detail.createdBy !== '' ? detail.createdBy : '—'}</div></div>
      <div class="detail-item"><label>实验更新时间</label><div class="value">${formatDetailTime(detail.updatedAt)}</div></div>
      <div class="detail-item"><label>更新人</label><div class="value">${detail.updatedBy != null && detail.updatedBy !== '' ? detail.updatedBy : '—'}</div></div>
    </div>
    <div class="detail-grid" style="margin-bottom:24px;">
      <div class="detail-item"><label>实验目标与方案描述</label><div class="value">${detail.goal || '-'}</div></div>
      <div class="detail-item"><label>实验对象</label><div class="value">${detail.targetType} · ${detail.targetName || detail.targetLabel}</div></div>
      <div class="detail-item"><label>实验结束配置</label><div class="value">达到 ${(detail.endUserStop != null ? Number(detail.endUserStop).toLocaleString() : '—')} 用户后自动停止；运行 ${detail.endRunDays != null ? detail.endRunDays : '—'} 天后自动结束</div></div>
      <div class="detail-item"><label>实验用户范围</label><div class="value">${scopeText}</div></div>
    </div>
    <div class="form-group">
      <label class="form-label">实验分组与流量</label>
      <div class="detail-grid">${groupsHtml}</div>
    </div>
    <div class="form-group" style="margin-top:24px;">
      <div class="detail-section-header">
        <label class="form-label" style="margin-bottom:0;">用户实验分组数据</label>
        <div class="detail-search-wrap">
          <input type="text" id="detailUserSearchInput" class="detail-search-input" placeholder="输入关键词，按回车或点击框外执行筛选" value="${(detailUserSearch || '').replace(/"/g, '&quot;')}" />
        </div>
      </div>
      <p class="form-hint">展示参与实验用户的 experiment uid、customer id、payer id（后两者可有多值，多值时默认展示一项，可在下拉中切换；搜索命中某值时默认选中该值）。筛选在按回车或输入框失焦后生效，避免每输入一字即刷新列表。支持通过下拉框手动修改某用户的实验分组。</p>
      <div class="table-wrap">
        <table>
          <thead><tr><th>experiment uid</th><th>customer id</th><th>payer id</th><th>IP 地址</th><th>用户分组</th><th>分组时间</th></tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
      ${paginationHtml}
    </div>
  `;
}

function renderCustomDataModuleHtml(data) {
  const columns = data.customDataColumns || [];
  const rows = data.customDataRows || [];
  if (!columns.length || !rows.length) return '';
  const controlVals = rows[0].values || [];
  let thead = '<th class="group-name">实验组</th>';
  columns.forEach(col => {
    const label = escapeHtmlAttr(col.displayName || '');
    const tipPlain = col.tooltip || '';
    const tipBody = escapeHtmlText(tipPlain);
    thead += `<th><span class="revenue-hint-wrap custom-data-col-hint-wrap" tabindex="0" aria-label="${escapeHtmlAttr(tipPlain)}">
      <span class="custom-data-th-label">${label}</span>
      <span class="revenue-hint-popover" role="tooltip"><p class="revenue-hint-popover-body">${tipBody}</p></span>
    </span></th>`;
  });
  let tbody = '';
  rows.forEach((row, ri) => {
    const isControl = ri === 0;
    let cells = `<td class="group-name">${escapeHtmlAttr(row.group)}</td>`;
    columns.forEach((col, mi) => {
      const raw = row.values[mi];
      const c0 = controlVals[mi];
      const display = formatCustomDataCellDisplay(raw, col);
      let extra = '';
      if (!isControl && raw != null && c0 != null) {
        const cur = Number(raw);
        const base = Number(c0);
        if (Number.isFinite(cur) && Number.isFinite(base)) {
          const cmp = getCompare(cur, base);
          if (cmp && cmp.direction !== 'same') {
            extra = `<span class="compare-text compare-${cmp.direction}">${cmp.text}</span>`;
          }
        }
      }
      cells += `<td class="custom-data-cell conversion-cell"><div class="custom-data-val">${display}</div>${extra ? `<div class="custom-data-delta">${extra}</div>` : ''}</td>`;
    });
    tbody += `<tr>${cells}</tr>`;
  });
  return `
    <h3 class="data-module-title">自定义数据</h3>
    <div class="data-table-card">
      <table class="data-table custom-data-table">
        <thead><tr>${thead}</tr></thead>
        <tbody>${tbody}</tbody>
      </table>
    </div>
    <p class="form-hint" style="margin-top:12px;">直接数据来自商户 SDK 上报，派生数据由系统基于直接数据计算得出；实验组数值下方为相对对照组的变化百分比。</p>
  `;
}

function renderDataTab(data) {
  const labels = data.metricLabels || [];
  const convLabels = data.conversionLabels || [];
  const rows = data.rows || [];
  const controlRow = rows[0];
  const controlRates = controlRow ? getConversionRates(controlRow.values) : { step: [], overall: 0 };

  const headerParts = [];
  for (let i = 0; i < labels.length; i++) {
    headerParts.push(`<th>${labels[i]}</th>`);
    if (i >= 1) headerParts.push(`<th title="计算方式：${conversionFormulas[i - 1]}">${convLabels[i - 1]}</th>`);
  }
  headerParts.push(`<th title="计算方式：${conversionFormulas[4]}">${convLabels[4]}</th>`);
  const thead = '<th>实验组</th>' + headerParts.join('');

  let tbody = '';
  rows.forEach(row => {
    const vals = row.values || [];
    const { step, overall } = getConversionRates(vals);
    const isControl = row.group === '对照组';
    const browseConf = row.browseConversionConfidence;
    let cells = `<td class="group-name">${row.group}</td>`;
    for (let i = 0; i < 5; i++) {
      cells += `<td>${vals[i] != null ? vals[i] : '-'}</td>`;
      if (i >= 1) {
        const rate = step[i - 1];
        const rateStr = rate != null ? (rate * 100).toFixed(1) + '%' : '-';
        const compare = isControl ? null : getCompare(rate, controlRates.step[i - 1]);
        const compareCls = compare && compare.direction !== 'same' ? ` compare-${compare.direction}` : '';
        cells += `<td class="conversion-cell">${rateStr}${compare && compare.text ? `<span class="compare-text${compareCls}">${compare.text}</span>` : ''}</td>`;
      }
    }
    const overallStr = overall != null ? (overall * 100).toFixed(1) + '%' : '-';
    const overallCompare = isControl ? null : getCompare(overall, controlRates.overall);
    const overallCls = overallCompare && overallCompare.direction !== 'same' ? ` compare-${overallCompare.direction}` : '';
    const overallConfHtml = (!isControl && browseConf != null) ? `<span class="conversion-confidence">置信度 ${(browseConf * 100).toFixed(0)}%</span>` : '';
    cells += `<td class="conversion-cell">${overallStr}${overallCompare && overallCompare.text ? `<span class="compare-text${overallCls}">${overallCompare.text}</span>` : ''}${overallConfHtml}</td>`;
    tbody += `<tr>${cells}</tr>`;
  });

  const revenueRows = data.revenueRows || [];
  const controlRevenue = revenueRows[0] || {};
  const revenueMetricKeys = [
    { key: 'payingUsers', label: '支付用户数', format: 'number' },
    { key: 'orderCount', label: '支付订单数', format: 'number' },
    { key: 'gmv', label: 'GMV', format: 'currency' },
    { key: 'arpu', label: 'ARPU', format: 'currency' },
    { key: 'renewalRate', label: '订阅续费率', format: 'percent' },
    { key: 'refundRate', label: '退款率', format: 'percent' },
    { key: 'chargebackRate', label: '拒付率', format: 'percent' }
  ];
  function fmtRevenueVal(val, format) {
    if (val == null) return '-';
    if (format === 'percent') return (val * 100).toFixed(1) + '%';
    if (format === 'currency') return '¥' + Number(val).toLocaleString();
    return String(val);
  }
  const renewalRateHeaderHtml = `<th class="revenue-th-renewal">
    <span class="revenue-th-renewal-label">订阅续费率</span>
    <span class="revenue-hint-wrap" tabindex="0" aria-label="关于续费数据的特别说明">
      <span class="revenue-hint-icon" aria-hidden="true">?</span>
      <span class="revenue-hint-popover" role="tooltip">
        <strong class="revenue-hint-popover-title">关于续费数据的特别说明</strong>
        <p class="revenue-hint-popover-body">续费行为发生在订阅周期结束时。当前展示的续费率仅基于已到期的用户样本。为了获得最准确的结论，建议您在实验结束 一个完整订阅周期后（例如：试用7天则延长7天观察，月付产品约 30 天）再进行最终决策。</p>
      </span>
    </span>
  </th>`;
  const revenueThead = '<th class="group-name">实验组</th>' + revenueMetricKeys.map(m =>
    (m.key === 'renewalRate' ? renewalRateHeaderHtml : `<th>${m.label}</th>`)
  ).join('');
  let revenueTableBody = '';
  revenueRows.forEach((r, rowIdx) => {
    const isControl = rowIdx === 0;
    const confidenceList = r.confidence || [];
    let cells = `<td class="group-name">${r.group}</td>`;
    revenueMetricKeys.forEach(({ key, format }, colIdx) => {
      const val = r[key];
      const controlVal = controlRevenue[key];
      const compare = isControl ? null : (typeof val === 'number' && typeof controlVal === 'number' && controlVal !== 0)
        ? getCompare(val, controlVal)
        : null;
      const compareCls = compare && compare.direction !== 'same' ? ` compare-${compare.direction}` : '';
      const compareHtml = compare && compare.text ? `<span class="compare-text${compareCls}">${compare.text}</span>` : '';
      // 支付用户数、支付订单数（colIdx 0、1）不展示置信度；confidence 数组从 GMV 起对应 colIdx 2～6
      const confIdx = colIdx - 2;
      const confVal = confIdx >= 0 ? confidenceList[confIdx] : null;
      const confidenceHtml = (!isControl && colIdx >= 2 && confVal != null) ? `<span class="revenue-confidence">置信度 ${(confVal * 100).toFixed(0)}%</span>` : '';
      cells += `<td class="revenue-cell conversion-cell">${fmtRevenueVal(val, format)}${compareHtml}${confidenceHtml}</td>`;
    });
    revenueTableBody += `<tr>${cells}</tr>`;
  });

  return `
    <div class="data-summary">
      <div class="data-summary-item"><div class="label">实验时长</div><div class="value">${data.duration}</div></div>
      <div class="data-summary-item">
        <div class="label data-summary-inline-hint-label">
          <span>参与用户数</span>
          <span class="revenue-hint-wrap participant-count-stat-hint" tabindex="0" aria-label="关于参与用户数统计口径">
            <span class="revenue-hint-icon" aria-hidden="true">?</span>
            <span class="revenue-hint-popover" role="tooltip">
              <p class="revenue-hint-popover-body">实验用户数基于设备标识（Cookie）统计，与【数据】模块中“用户数”的统计口径不同，数值可能存在差异。该差异不影响实验数据的真实性与准确性。</p>
            </span>
          </span>
        </div>
        <div class="value">${data.participantCount}</div>
      </div>
    </div>
    <h3 class="data-module-title">转化数据</h3>
    <div class="data-table-card">
      <table class="data-table">
        <thead><tr>${thead}</tr></thead>
        <tbody>${tbody}</tbody>
      </table>
    </div>
    <p class="form-hint" style="margin-top:12px;">浏览结账率=发起结账用户数/浏览用户数，订单提交率=提交订单用户数/发起结账用户数，以此类推；浏览转化率=支付成功用户数/浏览用户数。实验组各转化率下方为相对对照组的变化百分比；仅「浏览转化率」旁展示置信度。</p>
    <h3 class="data-module-title">收入与风险数据</h3>
    <div class="data-table-card">
      <table class="data-table revenue-risk-table">
        <thead><tr>${revenueThead}</tr></thead>
        <tbody>${revenueTableBody}</tbody>
      </table>
    </div>
    <p class="form-hint" style="margin-top:12px;">各指标为实验周期内该分组的汇总或比率；实验组下方为相对对照组的变化百分比。支付用户数、支付订单数不展示置信度；其余指标在变化百分比下展示置信度。</p>
    ${renderCustomDataModuleHtml(data)}
    <div class="ai-insight-card">
      <div class="ai-insight-header">
        <span class="ai-insight-icon">◇</span>
        <span class="ai-insight-title">AI 数据解读</span>
      </div>
      <div class="ai-insight-body">${'<p>' + getAIInsight(data).replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') + '</p>'}</div>
    </div>
  `;
}

function bindDetailEvents(id, tab) {
  document.querySelectorAll('.tab').forEach(el => {
    el.addEventListener('click', () => { location.hash = '#/experiments/' + id + '/' + (el.dataset.tab === 'data' ? 'data' : 'detail'); });
  });
  document.querySelector('[data-action="activate"]')?.addEventListener('click', (evt) => {
    evt.stopPropagation();
    document.getElementById('expActionDropdownMenu')?.classList.remove('is-open');
    const exp = experiments.find(e => e.id === id);
    if (!exp) return;
    if (exp.target === '价格表' && hasOtherNonTerminalPriceTableExperiment(exp.id)) {
      showPriceTableActivateBlockModal();
      return;
    }
    exp.status = 'active';
    if (!exp.startedAt) exp.startedAt = formatNowStamp();
    render();
  });
  document.querySelector('[data-action="resume"]')?.addEventListener('click', () => {
    const exp = experiments.find(e => e.id === id);
    if (exp) {
      exp.status = 'active';
      if (!exp.startedAt) exp.startedAt = formatNowStamp();
    }
    render();
  });
  const triggerBtn = document.getElementById('expActionDropdownBtn');
  const menuEl = document.getElementById('expActionDropdownMenu');
  if (triggerBtn && menuEl) {
    triggerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      menuEl.classList.toggle('is-open');
    });
    document.addEventListener('click', (e) => {
      if (!menuEl.contains(e.target) && e.target !== triggerBtn) menuEl.classList.remove('is-open');
    });
  }
  document.querySelector('.dropdown-item[data-action="pause"]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('expActionDropdownMenu')?.classList.remove('is-open');
    showExperimentActionModal('pause', () => {
      const exp = experiments.find(e => e.id === id);
      if (exp) exp.status = 'paused';
      render();
    });
  });
  document.querySelector('.dropdown-item[data-action="end"]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('expActionDropdownMenu')?.classList.remove('is-open');
    const exp = experiments.find(e => e.id === id);
    const doEnd = () => {
      if (exp) {
        exp.status = 'ended';
        exp.endedAt = formatNowStamp();
      }
      render();
    };
    if (exp && exp.status === 'draft') {
      doEnd();
      return;
    }
    showExperimentActionModal('end', doEnd);
  });
  document.querySelector('[data-action="edit"]')?.addEventListener('click', () => {
    location.hash = '#/experiments/' + id + '/edit';
  });
  document.querySelectorAll('.select-group').forEach(sel => {
    sel.addEventListener('change', () => {
      console.log('原型：用户分组已修改', sel.dataset.rowKey, sel.value);
    });
  });
  document.querySelectorAll('.detail-multi-select').forEach(sel => {
    sel.addEventListener('change', () => {
      console.log('原型：多值字段已切换', sel.dataset.multi, sel.value);
    });
  });
  const searchInput = document.getElementById('detailUserSearchInput');
  if (searchInput) {
    searchInput.addEventListener('blur', () => {
      const v = searchInput.value || '';
      if (v === detailUserSearch) return;
      detailUserSearch = v;
      detailUserPage = 1;
      render();
    });
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        detailUserSearch = searchInput.value || '';
        detailUserPage = 1;
        render();
      }
    });
  }
  document.querySelectorAll('.pagination-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const inp = document.getElementById('detailUserSearchInput');
      if (inp) detailUserSearch = inp.value || '';
      if (btn.dataset.page === 'next') detailUserPage++;
      else if (btn.dataset.page === 'prev') detailUserPage--;
      render();
    });
  });
}

// 初始化
window.addEventListener('hashchange', render);
window.addEventListener('load', render);
