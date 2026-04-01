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
    createdBy: '张三',
    target: '定价',
    targetLabel: '专业版定价 (price_xxx)',
    duration: '14 天',
    userCount: 1248,
    status: 'active'
  },
  {
    id: 'exp-002',
    name: '价格表 CTA 按钮文案',
    createdAt: '2025-03-05 09:00',
    createdBy: '李四',
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
    createdBy: '王五',
    target: '定价',
    targetLabel: '年度套餐 (price_yyy)',
    duration: '21 天',
    userCount: 2103,
    status: 'ended',
    endedAt: '2025-03-21 18:00:00'
  },
  {
    id: 'exp-004',
    name: '结算页 CTA 文案测试',
    createdAt: '2025-03-12 10:00',
    createdBy: '李四',
    target: '价格表',
    targetLabel: '月度价格表 (/pricing/monthly)',
    duration: '7 天',
    userCount: 856,
    status: 'paused'
  }
];

// 单个实验完整配置（详情页用）
const getExperimentDetail = (id) => ({
  ...mockExperiments.find(e => e.id === id),
  goal: '提升定价页下单转化率',
  targetType: '定价',
  targetId: 'price_xxx',
  targetName: '专业版定价',
  periodStart: '2025-03-10',
  periodEnd: '2025-03-24',
  userScope: '定向',
  userScopeRules: [
    { dimension: '国家', value: '美国、英国' },
    { dimension: '来源渠道', value: 'organic' }
  ],
  groups: [
    { id: 'control', name: '对照组', traffic: 34 },
    { id: 'var-a', name: '实验组 A', traffic: 33 },
    { id: 'var-b', name: '实验组 B', traffic: 33 }
  ],
  userAssignments: (() => {
    const groups = ['对照组', '实验组 A', '实验组 B'];
    const list = [];
    for (let i = 1; i <= 25; i++) {
      const n = String(i).padStart(3, '0');
      list.push({
        uid: 'usr_' + n,
        vid: 'vid_' + ['abc', 'def', 'ghi', 'jkl', 'mno'][(i - 1) % 5] + n,
        group: groups[(i - 1) % 3],
        assignedAt: '2025-03-10 14:' + String(30 + (i % 30)).padStart(2, '0')
      });
    }
    return list;
  })()
});

// 实验数据（数据 Tab 用）- 5 层转化漏斗，转化率由数据列计算
const conversionFormulas = [
  '发起结账数 ÷ 进入页面数',
  '提交订单数 ÷ 发起结账数',
  '完成支付操作数 ÷ 提交订单数',
  '支付成功数 ÷ 完成支付操作数',
  '支付成功数 ÷ 进入页面数'
];
const getExperimentData = (id) => ({
  duration: '14 天',
  participantCount: 1248,
  metricLabels: ['进入页面数', '发起结账数', '提交订单数', '完成支付操作数', '支付成功数'],
  conversionLabels: ['发起结账率', '提交订单转化率', '完成支付操作转化率', '支付成功转化率', '整体转化率'],
  rows: [
    { group: '对照组', values: [420, 168, 126, 105, 84] },
    { group: '实验组 A', values: [408, 183, 146, 122, 98] },
    { group: '实验组 B', values: [420, 176, 123, 98, 74] }
  ]
});

// 根据 values[进入, 发起结账, 提交订单, 完成支付操作, 支付成功] 计算各转化率
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
    `**整体表现**：${best.group} 整体转化率最高（${(best.overall * 100).toFixed(1)}%），较对照组提升 ${bestGain}%。建议优先考虑采用该组的定价或价格表配置以提升收入。\n\n` +
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
        <p>本文档说明如何在后台配置自定义实验变量，以及在前端通过 SDK 获取用户分组并处理不同策略。</p>
        <h4>1. 创建实验时配置变量名</h4>
        <p>在实验对象中选择「自定义」，填写变量名（如 <code>checkout_style</code>）。该变量名将作为前端调用 SDK 时的 key。</p>
        <h4>2. 为各分组填写实验对象值</h4>
        <p>在「实验分组与流量」表格的「自定义实验对象值」列中，为对照组和每个实验组填写对应的值（如 <code>default</code>、<code>variant_a</code>）。用户落入某分组后，SDK 将返回该分组对应的值。</p>
        <h4>3. 前端集成与使用</h4>
        <p>在需要做实验的节点（如结算页、按钮文案等），调用 SDK 方法传入变量名，获取当前用户在该变量下的实验分组数据（即您配置的某一行的「自定义实验对象值」）。根据返回值在页面中执行不同策略（如展示不同 UI、跳转不同流程等）。</p>
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
  const rows = experiments.map(e => `
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
  return `
    <div class="card">
      <div class="card-header">
        <span>实验列表</span>
        <button class="btn btn-primary btn-sm" data-action="create">+ 创建实验</button>
      </div>
      <ul class="experiment-list">
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
    </div>
    ${defaultStateBlock}
  `;
}

function bindListEvents() {
  document.querySelectorAll('[data-action="create"]').forEach(el => {
    el.addEventListener('click', () => { location.hash = '#/experiments/new'; });
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

function renderCreateExperiment() {
  return `
    <div class="card">
      <div class="card-header">创建实验</div>
      <div class="card-body">
        <form id="createForm">
          <div class="form-group">
            <label class="form-label">实验名称 <span style="color:var(--danger);">*</span></label>
            <input type="text" name="name" placeholder="用于在后台区分不同实验，如：定价页标题 A/B 测试" required />
          </div>
          <div class="form-group">
            <label class="form-label">实验目标</label>
            <input type="text" name="goal" placeholder="如：提升定价页下单转化率" />
          </div>
          <div class="form-group">
            <label class="form-label">实验对象</label>
            <select name="targetType" id="targetType">
              <option value="">请选择</option>
              <option value="pricing">定价</option>
              <option value="price_table">价格表</option>
              <option value="custom">自定义</option>
            </select>
            <div id="customVarWrap" class="form-group" style="margin-top:12px; display:none;">
              <label class="form-label">实验变量名</label>
              <input type="text" name="customVarName" id="customVarName" placeholder="如：checkout_style，集成 SDK 后通过该变量名获取当前用户分组对应的值" />
              <p class="form-hint">前端在实验节点调用 SDK 方法获取用户在此变量的实验分组数据，商户根据返回值做出不同实验策略处理。<a href="#/docs/custom-abtest-config" target="_blank" rel="noopener" class="link-btn">了解详情</a></p>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">实验周期</label>
            <div style="display:flex; gap:12px; align-items:center;">
              <input type="date" name="periodStart" />
              <span>至</span>
              <input type="date" name="periodEnd" />
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
                <input type="text" id="scopeValue" placeholder="如：美国、英国" />
                <button type="button" class="btn btn-secondary btn-sm" id="addScope">添加</button>
              </div>
            </div>
          </div>
          <div class="form-group traffic-module" id="trafficModuleWrap">
            <label class="form-label">实验分组与流量</label>
            <p class="form-hint">默认对照组，可添加 1～5 个实验组，总流量需为 100%。</p>
            <div class="traffic-table-header">
              <span class="th-name">组名称</span>
              <span class="th-target" id="targetColumnHeader">定价 / 价格表</span>
              <span class="th-meaning" id="targetMeaningHeader" style="display:none">对象值含义（选填）</span>
              <span class="th-traffic">流量 %</span>
            </div>
            <div id="trafficGroups">
              <div class="traffic-row" data-is-control="true">
                <input type="text" placeholder="组名称" value="对照组" readonly />
                <div class="target-cell"><select class="target-select"><option value="">请先选择实验对象</option></select></div>
                <div class="target-meaning-cell" style="display:none"><input type="text" class="meaning-input" placeholder="记录自定义实验变量值含义，避免遗忘" /></div>
                <input type="number" min="0" max="100" value="34" placeholder="流量%" />
              </div>
              <div class="traffic-row">
                <input type="text" placeholder="组名称" value="实验组 A" />
                <div class="target-cell"><select class="target-select"><option value="">请先选择实验对象</option></select></div>
                <div class="target-meaning-cell" style="display:none"><input type="text" class="meaning-input" placeholder="记录自定义实验变量值含义，避免遗忘" /></div>
                <input type="number" min="0" max="100" value="33" placeholder="流量%" />
              </div>
              <div class="traffic-row">
                <input type="text" placeholder="组名称" value="实验组 B" />
                <div class="target-cell"><select class="target-select"><option value="">请先选择实验对象</option></select></div>
                <div class="target-meaning-cell" style="display:none"><input type="text" class="meaning-input" placeholder="记录自定义实验变量值含义，避免遗忘" /></div>
                <input type="number" min="0" max="100" value="33" placeholder="流量%" />
              </div>
            </div>
            <p class="control-group-hint" id="controlGroupHint" style="display:none;">商户站点前端集成的价格或价格表需要与对照组保持一致</p>
            <p class="control-group-hint" id="customVarHint" style="display:none;">集成 SDK 后，在需要实验的节点通过 SDK 获取该变量名的值，SDK 将按用户分组返回对应列填写的值，请在前端根据返回值自行处理业务逻辑。</p>
            <p class="traffic-total">总流量：<span id="trafficTotal">100</span>%</p>
            <button type="button" class="btn btn-ghost btn-sm add-group-btn" id="addGroup">+ 添加实验组</button>
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

const PRICING_OPTIONS = '<option value="">请选择定价</option><option value="price_xxx">专业版定价 (price_xxx)</option><option value="price_yyy">年度套餐 (price_yyy)</option>';
const PRICE_TABLE_OPTIONS = '<option value="">请选择价格表</option><option value="/pricing/monthly">月度价格表 (/pricing/monthly)</option><option value="/pricing/yearly">年度价格表 (/pricing/yearly)</option>';

function createFormHasContent() {
  const name = document.querySelector('#createForm [name="name"]');
  const goal = document.querySelector('#createForm [name="goal"]');
  const targetType = document.getElementById('targetType');
  const periodStart = document.querySelector('#createForm [name="periodStart"]');
  const periodEnd = document.querySelector('#createForm [name="periodEnd"]');
  const customVarName = document.getElementById('customVarName');
  const scopeTags = document.getElementById('scopeTags');
  if (name && name.value.trim()) return true;
  if (goal && goal.value.trim()) return true;
  if (targetType && targetType.value) return true;
  if (periodStart && periodStart.value) return true;
  if (periodEnd && periodEnd.value) return true;
  if (customVarName && customVarName.value.trim()) return true;
  if (scopeTags && scopeTags.querySelectorAll('.scope-tag').length > 0) return true;
  const targetCells = document.querySelectorAll('#trafficGroups .target-cell .target-select, #trafficGroups .target-cell .target-custom-input');
  for (let i = 0; i < targetCells.length; i++) {
    if (targetCells[i].value && targetCells[i].value.trim()) return true;
  }
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

const PAUSE_ACTION_MSG = '暂停后将不再放量，不影响已参与实验用户';
const END_ACTION_MSG = '自定义对象的实验需要注意处理实验结束的逻辑，避免影响用户体验';

function showExperimentActionModal(action, onConfirm) {
  const isPause = action === 'pause';
  const primaryText = isPause ? '暂停实验' : '结束实验';
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

function bindCreateFormEvents() {
  const targetType = document.getElementById('targetType');
  const targetColumnHeader = document.getElementById('targetColumnHeader');
  const controlGroupHint = document.getElementById('controlGroupHint');
  const customVarWrap = document.getElementById('customVarWrap');
  const customVarHint = document.getElementById('customVarHint');
  const trafficModuleWrap = document.getElementById('trafficModuleWrap');
  const targetMeaningHeader = document.getElementById('targetMeaningHeader');
  function updateTargetColumn() {
    const v = targetType?.value || '';
    if (targetColumnHeader) {
      targetColumnHeader.textContent = v === 'custom' ? '自定义实验对象值' : v === 'pricing' ? '定价' : v === 'price_table' ? '价格表' : '定价 / 价格表';
    }
    if (controlGroupHint) controlGroupHint.style.display = (v === 'pricing' || v === 'price_table') ? 'block' : 'none';
    if (customVarHint) customVarHint.style.display = v === 'custom' ? 'block' : 'none';
    if (customVarWrap) customVarWrap.style.display = v === 'custom' ? 'block' : 'none';
    if (trafficModuleWrap) trafficModuleWrap.classList.toggle('custom-mode', v === 'custom');
    if (targetMeaningHeader) targetMeaningHeader.style.display = v === 'custom' ? '' : 'none';
    document.querySelectorAll('#trafficGroups .target-meaning-cell').forEach(el => {
      el.style.display = v === 'custom' ? '' : 'none';
    });
    const rows = document.querySelectorAll('#trafficGroups .traffic-row');
    const cells = document.querySelectorAll('#trafficGroups .target-cell');
    if (v === 'custom') {
      const defaultValues = ['value1', 'value2'];
      const defaultMeanings = ['价格表无免费试用'];
      cells.forEach((cell, i) => {
        const input = cell.querySelector('.target-custom-input');
        const prevVal = (input && input.value) ? input.value.replace(/"/g, '&quot;').replace(/</g, '&lt;') : '';
        const defaultVal = defaultValues[i];
        const valueAttr = prevVal || (defaultVal || '');
        const placeholder = (prevVal || defaultVal) ? '' : '填写该分组对应的值';
        cell.innerHTML = `<input type="text" class="target-custom-input" placeholder="${placeholder}"${valueAttr ? ` value="${valueAttr}"` : ''}>`;
      });
      const firstMeaningInput = document.querySelector('#trafficGroups .traffic-row:first-child .meaning-input');
      if (firstMeaningInput && !firstMeaningInput.value.trim()) firstMeaningInput.value = (defaultMeanings[0] || '');
    } else {
      const opts = v === 'pricing' ? PRICING_OPTIONS : v === 'price_table' ? PRICE_TABLE_OPTIONS : '<option value="">请先选择实验对象</option>';
      cells.forEach(cell => {
        const sel = cell.querySelector('.target-select');
        const prevVal = sel ? sel.value : '';
        cell.innerHTML = `<select class="target-select">${opts}</select>`;
        const newSel = cell.querySelector('.target-select');
        if (newSel && prevVal) newSel.value = prevVal;
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
    if (firstRowSelect && p.controlTarget) firstRowSelect.value = p.controlTarget;
    window.__abCreatePreset = null;
  }
  const userScope = document.getElementById('userScope');
  const scopeRules = document.getElementById('scopeRules');
  if (userScope) {
    userScope.addEventListener('change', () => {
      scopeRules.style.display = userScope.value === 'targeted' ? 'block' : 'none';
    });
  }
  let scopeList = [];
  document.getElementById('addScope')?.addEventListener('click', () => {
    const dim = document.getElementById('scopeDim').value;
    const val = document.getElementById('scopeValue').value;
    if (!val.trim()) return;
    scopeList.push({ dimension: dim, value: val });
    document.getElementById('scopeTags').innerHTML = scopeList.map((s, i) =>
      `<span class="scope-tag">${s.dimension}: ${s.value} <span class="remove" data-i="${i}">×</span></span>`
    ).join('');
    document.getElementById('scopeValue').value = '';
    document.getElementById('scopeTags').querySelectorAll('.remove').forEach(el => {
      el.onclick = () => { scopeList.splice(+el.dataset.i, 1); bindCreateFormEvents(); };
    });
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
  document.getElementById('addGroup')?.addEventListener('click', () => {
    const container = document.getElementById('trafficGroups');
    const count = container.querySelectorAll('.traffic-row').length;
    if (count >= 6) return alert('最多 6 个组（1 对照组 + 5 实验组）');
    const v = document.getElementById('targetType')?.value || '';
    let middleHtml;
    if (v === 'custom') {
      middleHtml = '<div class="target-cell"><input type="text" class="target-custom-input" placeholder="填写该分组对应的值" /></div><div class="target-meaning-cell"><input type="text" class="meaning-input" placeholder="记录自定义实验变量值含义，避免遗忘" /></div>';
    } else {
      const opts = v === 'pricing' ? PRICING_OPTIONS : v === 'price_table' ? PRICE_TABLE_OPTIONS : '<option value="">请先选择实验对象</option>';
      middleHtml = `<div class="target-cell"><select class="target-select">${opts}</select></div><div class="target-meaning-cell" style="display:none"><input type="text" class="meaning-input" placeholder="记录自定义实验变量值含义，避免遗忘" /></div>`;
    }
    const row = document.createElement('div');
    row.className = 'traffic-row';
    row.innerHTML = `<input type="text" placeholder="组名称" />${middleHtml}<input type="number" min="0" max="100" value="0" placeholder="流量%" />`;
    container.appendChild(row);
    row.querySelector('input[type="number"]').addEventListener('input', updateTrafficTotal);
    redistributeTrafficEqually();
  });
  document.getElementById('createForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
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
}

function renderExperimentDetail(id, tab) {
  const detail = getExperimentDetail(id);
  const data = getExperimentData(id);
  const isDetail = tab === 'detail';
  return `
    <div class="card">
      <div class="card-header" style="flex-wrap:wrap; gap:12px;">
        <span>${detail.name}</span>
        <div class="action-bar">
          ${detail.status !== 'ended' ? `<button class="btn btn-ghost btn-sm" data-action="edit">编辑配置</button>` : ''}
          ${detail.status === 'ended' ? `<span class="detail-ended-text">实验于 ${detail.endedAt || '—'} 已结束</span>` : ''}
          <span class="badge badge-${detail.status}">${detail.status === 'active' ? '运行中' : detail.status === 'draft' ? '草稿' : detail.status === 'paused' ? '已暂停' : '已结束'}</span>
          ${detail.status === 'draft' ? `<button class="btn btn-primary btn-sm" data-action="activate">激活实验</button>` : ''}
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
          <button class="tab ${isDetail ? 'active' : ''}" data-tab="detail">实验详情 / 管理</button>
          <button class="tab ${!isDetail ? 'active' : ''}" data-tab="data">实验数据</button>
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
  const searchLower = detailUserSearch.trim().toLowerCase();
  const filtered = searchLower
    ? allAssignments.filter(u => (u.uid && u.uid.toLowerCase().includes(searchLower)) || (u.vid && u.vid.toLowerCase().includes(searchLower)))
    : allAssignments;
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / DETAIL_USER_PAGE_SIZE));
  const page = Math.min(detailUserPage, totalPages);
  const start = (page - 1) * DETAIL_USER_PAGE_SIZE;
  const pageData = filtered.slice(start, start + DETAIL_USER_PAGE_SIZE);
  const tableRows = pageData.map(u => `
    <tr>
      <td>${u.uid}</td>
      <td>${u.vid}</td>
      <td>
        <select class="select-group" data-uid="${u.uid}">
          ${(detail.groups || []).map(g => `<option value="${g.name}" ${u.group === g.name ? 'selected' : ''}>${g.name}</option>`).join('')}
        </select>
      </td>
      <td>${u.assignedAt}</td>
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
    <div class="detail-grid" style="margin-bottom:24px;">
      <div class="detail-item"><label>实验目标</label><div class="value">${detail.goal || '-'}</div></div>
      <div class="detail-item"><label>实验对象</label><div class="value">${detail.targetType} · ${detail.targetName || detail.targetLabel}</div></div>
      <div class="detail-item"><label>实验周期</label><div class="value">${detail.periodStart} 至 ${detail.periodEnd}</div></div>
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
          <input type="text" id="detailUserSearchInput" class="detail-search-input" placeholder="搜索用户 Uid / Vid" value="${(detailUserSearch || '').replace(/"/g, '&quot;')}" />
        </div>
      </div>
      <p class="form-hint">可手动修改某个用户的实验分组，用于测试时指定用户分组。</p>
      <div class="table-wrap">
        <table>
          <thead><tr><th>用户 Uid</th><th>用户 Vid</th><th>用户分组</th><th>分组时间</th></tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
      ${paginationHtml}
    </div>
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
    cells += `<td class="conversion-cell">${overallStr}${overallCompare && overallCompare.text ? `<span class="compare-text${overallCls}">${overallCompare.text}</span>` : ''}</td>`;
    tbody += `<tr>${cells}</tr>`;
  });

  return `
    <div class="data-summary">
      <div class="data-summary-item"><div class="label">实验时长</div><div class="value">${data.duration}</div></div>
      <div class="data-summary-item"><div class="label">参与用户数</div><div class="value">${data.participantCount}</div></div>
    </div>
    <div class="data-table-card">
      <table class="data-table">
        <thead><tr>${thead}</tr></thead>
        <tbody>${tbody}</tbody>
      </table>
    </div>
    <p class="form-hint" style="margin-top:12px;">发起结账率=发起结账数/进入页面数，提交订单转化率=提交订单数/发起结账数，以此类推；整体转化率=支付成功数/进入页面数。实验组转化率下方小字为相对对照组的增长百分比。</p>
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
  document.querySelector('[data-action="activate"]')?.addEventListener('click', () => {
    const exp = experiments.find(e => e.id === id);
    if (exp) exp.status = 'active';
    alert('原型：已设为运行中。');
    render();
  });
  document.querySelector('[data-action="resume"]')?.addEventListener('click', () => {
    const exp = experiments.find(e => e.id === id);
    if (exp) exp.status = 'active';
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
    showExperimentActionModal('end', () => {
      const exp = experiments.find(e => e.id === id);
      if (exp) {
        exp.status = 'ended';
        const now = new Date();
        exp.endedAt = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0') + ' ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ':' + String(now.getSeconds()).padStart(2, '0');
      }
      render();
    });
  });
  document.querySelector('[data-action="edit"]')?.addEventListener('click', () => {
    alert('原型：编辑配置入口。正式开发时此处打开编辑表单（与创建实验字段一致，可修改实验名称、目标、对象、周期、用户范围、分组与流量等）。');
  });
  document.querySelectorAll('.select-group').forEach(sel => {
    sel.addEventListener('change', () => {
      console.log('原型：用户分组已修改', sel.dataset.uid, sel.value);
    });
  });
  const searchInput = document.getElementById('detailUserSearchInput');
  if (searchInput) {
    let searchTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        detailUserSearch = searchInput.value || '';
        detailUserPage = 1;
        render();
      }, 300);
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
      if (btn.dataset.page === 'next') detailUserPage++;
      else if (btn.dataset.page === 'prev') detailUserPage--;
      render();
    });
  });
}

// 初始化
window.addEventListener('hashchange', render);
window.addEventListener('load', render);
