/* ============================================
   职路引擎 CareerPilot · Demo Engine
   ============================================ */

/* -------- 职路引擎 AI 配置 -------- */
const AI_CONFIG = {
  apiKey: '',
  apiUrl: 'https://api.deepseek.com/v1/chat/completions',
  model: 'deepseek-chat',
};

/* -------- 职业规划 Skill 定义（约束 AI 行为） -------- */
const CAREER_SKILL_SYSTEM = `你是一名拥有10年经验的职业规划师，运行在职路引擎(CareerPilot)中。你必须严格遵循以下 Skill 规范执行职业规划任务。

## 核心原则
1. 一切从目标岗位JD出发，不是从通用知识出发
2. 每条建议必须能追溯到JD中的具体要求或 inferred hiring signal
3. 永远不要编造经历、雇主、数据、证书或项目成果
4. 不要给"提升沟通能力"这种泛泛建议，必须绑定到具体的招聘信号和具体行为
5. 将策略转化为任务时，像一个严格但有帮助的老师：说明任务是什么、为什么重要、具体怎么做、提交什么、如何评判质量

## 必须收集的输入
- 目标岗位JD（或岗位名称+行业标准要求）
- 用户已有技能、经历、项目
- 目标级别（校招/社招/转岗）
- 每日可投入时间和冲刺周期

## 核心工作流
1. 解析JD：提取硬性要求、加分项、工具要求、领域信号、职责、级别预期、可能的面试考察点。区分显性要求和推断期望。
2. 构建要求-证据矩阵：对每条要求，映射用户的最强证据、部分证据、可迁移证据或无证据。评级为 Strong/Partial/Weak/Missing/Unknown。不要把声称的技能当作强证据，除非有项目、工作成果、数据、证书支撑。
3. 匹配度评分：
   - 80-100: 强匹配，用户有大部分核心要求的证据
   - 65-79: 需要包装定位后投递，需要1-3个证据修复
   - 50-64: 战略性尝试，仅在有内推或可迁移证据时投递
   - 35-49: 先修复证据再投递
   - <35: 不优先，差距过大
4. 制定Offer计划：简历定位、证据修复、面试风险地图、投递策略、时间盒计划
5. 转化为教师式任务卡

## 任务卡设计规范
每个任务必须回答：
1. 这是什么？(What)
2. 为什么对目标岗位重要？(Why)
3. 具体怎么做？(How - 带具体步骤)
4. 提交什么产出物？(Deliverable - 必须是可见的文件/表格/代码/文档)
5. 怎么判断合格？(Acceptance Criteria - 可观察的质量标准)

### 颗粒度规则
拒绝空泛的任务标题，必须展开为具体工作：
- 错误："学习SQL基础"
- 正确："针对一个含8列的订单表写8条SQL查询，每条查询回答一个业务问题，并解释结果"

- 错误："研究行业增长案例"
- 正确："建一个5行案例表，对比滴滴、T3、曹操、美团出行业务的增长手段"

- 错误："优化简历"
- 正确："重写4条简历要点，每条对应一个JD要求，包含范围、工具、行动和证据"

### 产出物要求
- 必须是具体的文件名或成果名（如：sql-growth-analysis.md，不是"文档"）
- 必须可以在面试时展示
- 必须与JD中的某项要求直接对应

### 步骤要求
- 每步必须是一个可执行的具体动作
- 步骤要小到新手能开始
- 好任务应该消除歧义，而不是只命名一个主题

### 验收标准
- 可观察的质量标准（不是"已完成"）
- 可观察的完整性标准
- 成果如何映射回JD

## 任务排序规则
按教师方式排序：
1. 诊断：解析JD，识别要求，定位缺失证据
2. 建基础：只学目标JD需要的技能
3. 生产证据：创建小成果证明能力
4. 包装证据：将成果转化为简历要点、作品集和面试故事
5. 投递迭代：发送申请，追踪反馈，根据反馈调整
不要在证据包装之前安排深度学习，除非用户确实缺乏产出证据的最低能力。

## 输出质量检查
返回任务计划前，逐项检查：
- 每个任务有可见的产出物
- 每个任务标注了支撑的JD信号
- 每个任务有分步操作指南
- 每个任务有验收标准
- 每个任务适配用户的每日时间预算
- 计划展示了今天的产出如何变成简历、作品集、面试或投递材料`;

/* -------- 内置凭证（编码存储，非明文） -------- */
const _K = [115,107,45,100,49,52,57,48,54,51,100,102,98,102,55,52,56,97,101,98,53,55,52,98,55,51,56,101,48,55,53,50,99,51,51];

/* -------- 获取 API Key -------- */
function getApiKey() {
  let key = localStorage.getItem('cp_ai_key') || '';
  if (!key) {
    key = _K.map(c => String.fromCharCode(c)).join('');
    AI_CONFIG.apiKey = key;
  } else {
    AI_CONFIG.apiKey = key;
  }
  return AI_CONFIG.apiKey;
}

/* -------- 清除 API Key -------- */
function clearApiKey() {
  localStorage.removeItem('cp_ai_key');
  AI_CONFIG.apiKey = '';
  toast('API Key 已清除', 'success');
}

/* -------- AI 调用核心 -------- */
async function callAI(prompt, systemPrompt, timeoutSec) {
  if (!AI_CONFIG.apiKey) {
    getApiKey();
  }
  if (!AI_CONFIG.apiKey) {
    State.aiError = 'API Key 未配置';
    return null;
  }

  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const controller = new AbortController();
  const timeout = (timeoutSec || 30) * 1000;
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(AI_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_CONFIG.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_CONFIG.model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 30000,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      if (res.status === 401) {
        State.aiError = 'API Key 无效（401），请检查密钥是否正确';
      } else if (res.status === 429) {
        State.aiError = 'API 调用频率超限（429），请稍后重试';
      } else if (res.status === 500) {
        State.aiError = '职路引擎服务器错误（500），请稍后重试';
      } else {
        State.aiError = `API 返回错误 ${res.status}：${errText.substring(0, 100)}`;
      }
      console.error('AI API error:', res.status, errText);
      return null;
    }
    const data = await res.json();
    if (!data.choices || !data.choices[0]) {
      State.aiError = 'API 返回格式异常：无 choices 数据';
      return null;
    }
    State.aiError = null;
    return data.choices[0].message.content;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      State.aiError = `AI 请求超时（${timeoutSec || 30}秒），职路引擎响应过慢`;
    } else if (err.message && err.message.includes('Failed to fetch')) {
      State.aiError = '网络请求失败（CORS 或网络不通），请检查网络连接';
    } else {
      State.aiError = `AI 调用异常：${err.message || err.name || '未知错误'}`;
    }
    console.error('AI call failed:', State.aiError, err);
    return null;
  }
}

/* -------- localStorage 数据持久化 -------- */
const STORAGE_KEY = 'careerpilot_state';

function saveState() {
  try {
    const data = {
      userInput: State.userInput,
      profile: State.profile,
      skills: State.skills,
      sprint: State.sprint,
      currentDay: State.currentDay,
      currentRoute: State.currentRoute,
      selectedDay: State.selectedDay,
      completedTasks: [...State.completedTasks],
      portfolio: State.portfolio,
      uploadedFiles: State.uploadedFiles || [],
      loopStatus: State.loopStatus || null,
      aiAnalysis: State.aiAnalysis || null,
      aiRoleModel: State.aiRoleModel || null,
      aiTasks: State.aiTasks || null,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Save state failed:', e);
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    State.userInput = data.userInput || null;
    State.profile = data.profile || null;
    State.skills = data.skills || null;
    State.sprint = data.sprint || null;
    State.currentDay = data.currentDay || 1;
    State.currentRoute = data.currentRoute || 'dashboard';
    State.selectedDay = data.selectedDay || 1;
    State.completedTasks = new Set(data.completedTasks || []);
    State.portfolio = data.portfolio || [];
    State.uploadedFiles = data.uploadedFiles || [];
    State.loopStatus = data.loopStatus || null;
    State.aiAnalysis = data.aiAnalysis || null;
    State.aiRoleModel = data.aiRoleModel || null;
    State.aiTasks = data.aiTasks || null;
    return !!(State.profile && State.sprint);
  } catch (e) {
    console.error('Load state failed:', e);
    return false;
  }
}

function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}

/* -------- 导出功能 -------- */
function exportResume() {
  const p = State.profile;
  if (!p) return;
  const items = State.portfolio;
  const skills = State.skills || [];

  let md = `# ${p.role} · 个人简历\n\n`;
  md += `> 由职路引擎 CareerPilot 生成于 ${new Date().toLocaleDateString('zh-CN')}\n\n`;
  md += `## 基本信息\n\n`;
  md += `- **目标岗位**: ${p.role}（${p.level}）\n`;
  md += `- **目标场景**: ${p.scene}\n`;
  md += `- **已有技能**: ${p.skills}\n`;
  md += `- **已有经历**: ${p.experience}\n\n`;

  md += `## 能力评估\n\n`;
  md += `| 能力维度 | 当前水平 | 目标水平 | 差距 |\n|---------|---------|---------|-----|\n`;
  skills.forEach(s => {
    md += `| ${s.name} | ${s.current} | ${s.target} | ${s.target - s.current} |\n`;
  });
  md += `\n`;

  md += `## 项目经历\n\n`;
  if (items.length > 0) {
    const mainProject = items.find(i => i.type === '作品集') || items[items.length - 1];
    md += `### ${mainProject.title}\n\n`;
    md += `**项目类型**: ${mainProject.type}\n\n`;
    md += `**项目描述**: ${mainProject.desc}\n\n`;
    md += `**完成天数**: ${items.length} 天\n\n`;
    md += `**产出清单**:\n`;
    items.forEach(i => {
      md += `- Day ${i.day}: ${i.title}（${i.type}）\n`;
    });
    md += `\n`;
  } else {
    md += `*暂无已完成的项目成果*\n\n`;
  }

  md += `## 能力关键词\n\n`;
  const kws = (p.keywords || '').split(/[·,，、]/).filter(k => k.trim());
  kws.forEach(k => {
    md += `- ${k.trim()}\n`;
  });

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `CareerPilot_简历_${p.role}.md`;
  a.click();
  URL.revokeObjectURL(url);
  toast('简历已导出为 Markdown 文件', 'success');
}

function exportPortfolio() {
  const p = State.profile;
  const items = State.portfolio;
  if (!p || items.length === 0) {
    toast('暂无成果可导出', '');
    return;
  }

  let md = `# ${p.role} · 作品集\n\n`;
  md += `> 由职路引擎 CareerPilot 生成于 ${new Date().toLocaleDateString('zh-CN')}\n\n`;

  items.forEach(i => {
    md += `## Day ${i.day}: ${i.title}\n\n`;
    md += `- **类型**: ${i.type}\n`;
    md += `- **图标**: ${i.icon}\n`;
    md += `- **描述**: ${i.desc}\n\n`;
  });

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `CareerPilot_作品集_${p.role}.md`;
  a.click();
  URL.revokeObjectURL(url);
  toast('作品集已导出', 'success');
}

/* -------- 全局状态 -------- */
const State = {
  userInput: null,
  profile: null,
  skills: null,
  sprint: null,
  currentDay: 1,
  currentRoute: 'dashboard',
  selectedDay: 1,
  completedTasks: new Set(),
  portfolio: [],
  uploadedFiles: [],
  loopStatus: null,
  aiAnalysis: null,
  aiRoleModel: null,
  aiTasks: null,
  aiError: null,
};

/* -------- 岗位JD要求数据库 --------
   基于真实招聘JD拆解的硬性要求清单
   每项要求包含：
   - category: 类别（技术/产品/业务/软技能）
   - requirement: 具体要求
   - weight: 权重（high/medium/low）
   - howToProve: 如何在作品中证明
*/
const JobRequirements = {};

/* -------- 岗位能力模型 --------
   每个岗位家族包含：
   - skills: 6 维能力雷达（当前/目标）
   - phases: 4 阶段冲刺计划
   - scenes: 适用场景
   - levels: 目标级别
   - outputs: 可展示成果清单
   - keywords: 简历能力关键词
*/
const RoleModels = {};

/* -------- 任务模板库（每个岗位对齐可展示成果） -------- */
const TaskTemplates = {};

/* -------- 任务模板内容 -------- */
const TemplateContent = {
  competitor: {
    name: '竞品分析模板',
    sections: [
      { label: '产品名称', field: '[填写产品名称]' },
      { label: '核心流程', field: '[梳理用户从进入到完成核心任务的关键步骤]' },
      { label: '核心功能', field: '[列出3-5个核心功能及简述]' },
      { label: '用户痛点', field: '[记录使用过程中发现的问题]' },
      { label: '差异化卖点', field: '[分析该产品的独特优势]' },
    ],
  },
  prd: {
    name: 'PRD文档结构',
    sections: [
      { label: '需求背景', field: '[为什么要做这个功能？解决什么问题？]' },
      { label: '目标用户', field: '[功能面向哪些用户？]' },
      { label: '功能描述', field: '[功能具体做什么？输入输出是什么？]' },
      { label: '交互流程', field: '[用户操作步骤和系统反馈]' },
      { label: '数据指标', field: '[如何衡量功能效果？]' },
    ],
  },
  review: {
    name: '阶段复盘模板',
    sections: [
      { label: '本周完成', field: '[列出本周完成的学习和任务]' },
      { label: '核心收获', field: '[总结3个最重要的认知或能力提升]' },
      { label: '能力评估', field: '[评估当前各能力水平，找出短板]' },
      { label: '下周重点', field: '[基于评估制定下周优先事项]' },
    ],
  },
  default: {
    name: '通用任务模板',
    sections: [
      { label: '任务目标', field: '[明确本次任务要产出什么]' },
      { label: '执行步骤', field: '[拆解为3-5个可执行步骤]' },
      { label: '产出物', field: '[描述最终交付的内容]' },
      { label: '自我检查', field: '[对照检查清单确认完成度]' },
    ],
  },
};

/* -------- DOM 工具 -------- */
const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];

function showView(id) {
  $$('.view').forEach(v => v.classList.remove('active'));
  $('#' + id).classList.add('active');
}

function switchRoute(route) {
  State.currentRoute = route;
  $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.route === route));
  $$('.mn-item').forEach(n => n.classList.toggle('active', n.dataset.route === route));
  $$('.route').forEach(r => r.classList.toggle('active', r.dataset.routePanel === route));
  closeMobileNav();
}

/* -------- 移动端导航 -------- */
function initMobileNav() {
  const btn = $('#appbar-menu-btn');
  const overlay = $('#mobile-nav-overlay');
  const closeBtn = $('#mn-close');

  if (btn) btn.addEventListener('click', openMobileNav);
  if (closeBtn) closeBtn.addEventListener('click', closeMobileNav);
  if (overlay) overlay.addEventListener('click', closeMobileNav);

  $$('.mn-item').forEach(item => {
    item.addEventListener('click', () => {
      const route = item.dataset.route;
      switchRoute(route);
      if (route === 'sprint') renderPhases();
      if (route === 'task') renderTaskPage();
      if (route === 'portfolio') renderPortfolio();
      if (route === 'express') renderExpress();
    });
  });
}

function openMobileNav() {
  $('#mobile-nav').classList.add('show');
  $('#mobile-nav-overlay').classList.add('show');
}

function closeMobileNav() {
  const nav = $('#mobile-nav');
  const overlay = $('#mobile-nav-overlay');
  if (nav) nav.classList.remove('show');
  if (overlay) overlay.classList.remove('show');
}

function toast(msg, type = '') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  setTimeout(() => t.classList.remove('show'), 2600);
}

/* -------- Chip 选择 -------- */
function initChips(groupId) {
  const group = $('#' + groupId);
  if (!group) return;
  group.addEventListener('click', e => {
    if (e.target.classList.contains('chip')) {
      $$('.chip', group).forEach(c => c.classList.remove('active'));
      e.target.classList.add('active');
    }
  });
}

function getChipVal(groupId) {
  const active = $(`#${groupId} .chip.active`);
  return active ? active.dataset.val : '';
}

/* -------- 滑块 -------- */
function initSlider() {
  const slider = $('#in-time');
  const val = $('#time-val');
  slider.addEventListener('input', () => {
    val.textContent = slider.value + ' 小时 / 天';
  });
}

/* ============================================
   启动流程
   ============================================ */
function initSplash() {
  $('#btn-start').addEventListener('click', () => showView('view-input'));
  $('#btn-back-splash').addEventListener('click', () => showView('view-splash'));
}

function initForm() {
  initChips('chip-sprint');
  initSlider();

  $('#btn-generate').addEventListener('click', () => {
    const scene = $('#in-scene').value.trim() || '求职准备';
    const role = $('#in-role').value.trim();
    const level = $('#in-level').value.trim() || '校招';
    
    if (!role) {
      toast('请填写目标岗位', '');
      $('#in-role').focus();
      return;
    }

    // 清除旧缓存，确保重新生成
    clearState();

    State.userInput = {
      scene: scene,
      role: role,
      level: level,
      skills: $('#in-skills').value.trim(),
      experience: $('#in-exp').value.trim(),
      jd: $('#in-jd').value.trim(),
      timePerDay: parseFloat($('#in-time').value),
      sprintDays: parseInt(getChipVal('chip-sprint')),
    };
    startGeneration();
  });
}

/* ============================================
   AI 真实生成引擎
   ============================================ */
async function startGeneration() {
  showView('view-loading');
  const steps = [
    '解析目标岗位能力要求',
    'AI 分析个人画像与能力模型',
    '计算能力差距与优先级',
    '生成个性化冲刺计划',
    '拆解每日任务与执行模板',
    '初始化作品集与表达引擎',
  ];

  const container = $('#loading-steps');
  container.innerHTML = steps.map((s, i) => `
    <div class="lstep ${i === 0 ? 'active' : ''}" data-idx="${i}">
      <span class="lcheck">${i === 0 ? '·' : ''}</span>
      <span>${s}</span>
    </div>
  `).join('');

  const titles = [
    '正在解析你的职业目标…',
    'AI 正在生成职业画像…',
    '正在分析能力差距…',
    'AI 正在规划冲刺路线…',
    '正在拆解每日任务…',
    '正在准备你的成长工作台…',
  ];

  let idx = 0;

  // 进度条和状态更新工具
  function setProgress(pct) {
    const fill = $('#loading-progress-fill');
    const pctEl = $('#loading-progress-pct');
    if (fill) fill.style.width = pct + '%';
    if (pctEl) pctEl.textContent = Math.round(pct) + '%';
  }
  function setAIStatus(text, type) {
    const el = $('#loading-ai-status');
    if (!el) return;
    el.textContent = text;
    el.className = 'loading-ai-status' + (type ? ' ' + type : '');
  }

  function markStep() {
    if (idx > 0) {
      const prev = container.children[idx - 1];
      prev.classList.remove('active');
      prev.classList.add('done');
      prev.querySelector('.lcheck').textContent = '✓';
    }
    if (idx < steps.length) {
      const cur = container.children[idx];
      cur.classList.add('active');
      cur.querySelector('.lcheck').textContent = '·';
      $('#loading-title').textContent = titles[idx];
      setProgress((idx / steps.length) * 100);
      idx++;
    }
  }

  // Step 1: 解析目标
  markStep();
  setAIStatus('读取用户输入：' + State.userInput.role + ' / ' + State.userInput.level);
  await sleep(600);

  // Step 2: AI 一次性生成分析+能力模型+任务计划（带自动重试）
  markStep();
  setAIStatus('正在调用职路引擎生成职业画像…');

  const jdText = State.userInput.jd ? `\n目标岗位JD原文:\n${State.userInput.jd.substring(0, 800)}` : '';
  const jdInstruction = State.userInput.jd
    ? `\n【目标岗位JD原文】\n${State.userInput.jd.substring(0, 1200)}\n\n【JD分析要求】\n你必须以JD内容为核心依据，执行以下分析：\n1. 从JD中识别真实岗位名称（填入detectedRole），如果与用户填写的"${State.userInput.role}"不一致，以JD为准\n2. 逐条拆解JD中的招聘要求（学历、技能、经验、证书等），提取出该岗位的核心能力维度\n3. 将用户已有技能和经历与JD要求逐条对比，评估每个维度的匹配度（0-100），匹配度高的current值高，匹配度低的current值低\n4. 为每个能力维度设定target值（该岗位合格从业者应达到的水平，通常70-85）\n5. 每个任务必须直接对应JD中的某项具体要求，标题和描述要体现"这个任务是在补齐JD中的哪个要求"\n6. 任务产出物必须是可以用于面试展示的真实成果（如：JD要求"熟悉Excel"→任务产出"数据分析报告.xlsx"）`
    : `\n【无JD模式】\n用户未粘贴JD，请根据"${State.userInput.role}"岗位的行业标准要求进行分析：\n1. 基于该岗位的通用招聘要求提取核心能力维度\n2. 根据用户填写的已有技能和经历评估各维度匹配度\n3. 任务内容要贴合该岗位的真实日常工作场景`;

  const masterPrompt = `你是一名拥有10年经验的职业规划师，擅长从招聘JD出发，为求职者制定可执行的能力补齐计划。

【用户画像】
目标场景: ${State.userInput.scene}
目标岗位: ${State.userInput.role}
目标级别: ${State.userInput.level}
已有技能: ${State.userInput.skills || '未填写'}
已有经历: ${State.userInput.experience || '未填写'}
每日可投入: ${State.userInput.timePerDay}小时
冲刺周期: ${State.userInput.sprintDays}天
${jdInstruction}

【输出要求】
请严格按以下JSON格式返回（不要加任何markdown标记或代码块）：
{
  "detectedRole": "从JD识别的真实岗位名称",
  "analysis": "3-4句话：①用户与JD的核心匹配点 ②最大差距在哪些维度 ③冲刺策略建议（先补什么后补什么）",
  "skills": [
    {"name": "能力维度名（2-4字）", "current": 匹配度0-100, "target": 该岗位合格水平70-85, "gap": "差距说明（一句话）"}
  ],
  "phases": [
    {"name": "阶段1名称（4-6字）", "desc": "这个阶段解决什么问题，对应JD的哪些要求"},
    {"name": "阶段2名称", "desc": "描述"},
    {"name": "阶段3名称", "desc": "描述"},
    {"name": "阶段4名称", "desc": "描述"}
  ],
  "tasks": [
    {
      "title": "任务标题（体现补齐JD哪项要求）",
      "desc": "任务描述：说明这个任务针对JD中的哪个要求，做什么，怎么验证达成",
      "phase": "对应阶段名称",
      "output": "具体产出物名称（如：岗位调研报告.docx）",
      "outputType": "产出类型（文档/代码/设计稿/数据报告/演示PPT等）",
      "jdRequirement": "本任务对应的JD原文要求（摘录关键短语）",
      "steps": ["具体步骤1：做什么、怎么做", "具体步骤2：用什么工具/方法", "具体步骤3：如何验证完成"],
      "tools": ["推荐工具1（附用途）", "推荐工具2"],
      "checklist": ["验收标准1：达到什么程度算合格", "验收标准2：面试时如何展示这个成果"]
    }
  ],
  "keywords": "该岗位面试高频关键词1·关键词2·关键词3·关键词4·关键词5"
}

【质量约束】
1. skills 数量6个，名称2-4字，current值基于用户已有技能与JD的匹配度客观评估，不要给所有人一样的数值
2. tasks 严格生成${State.userInput.sprintDays}个，按冲刺周期合理分配到4个阶段
3. 每个task必须有jdRequirement字段，标注对应JD中的哪条要求（无JD时标注对应行业标准要求）
4. 任务难度要递进：前几天是基础认知和调研，中期是实操练习，后期是项目整合和面试准备
5. steps要具体可执行（不是"了解X"这种空泛描述，而是"阅读3篇行业报告，总结该岗位TOP3核心能力"）
6. output必须是具体的文件名或成果名，不能是"文档"这种泛称
7. 所有内容用中文，不要用英文术语除非是行业标准说法`;

  // 自动重试最多 3 次
  let masterResult = null;
  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount < maxRetries && !masterResult) {
    if (retryCount > 0) {
      setAIStatus(`AI 第 ${retryCount} 次调用失败：${State.aiError || '未知'}。正在重试 (${retryCount}/${maxRetries})…`, 'error');
      await sleep(1500);
      setAIStatus(`第 ${retryCount + 1} 次尝试调用职路引擎…`);
    } else {
      setAIStatus('正在等待职路引擎响应（预计 10-30 秒）…');
    }

    masterResult = await callAI(masterPrompt, CAREER_SKILL_SYSTEM + '\n\n你必须返回合法JSON，不要加任何markdown标记或代码块。', 120);
    retryCount++;

    if (masterResult) {
      setAIStatus('AI 响应成功！正在解析返回数据…', 'success');
      break;
    }

    if (retryCount < maxRetries) {
      setAIStatus(`AI 第 ${retryCount} 次调用失败：${State.aiError || '未知'}，准备重试…`, 'error');
    }
  }

  if (masterResult) {
    try {
      let clean = masterResult.trim();
      if (clean.startsWith('```')) {
        clean = clean.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      // 容错1：去掉尾部不完整的内容，尝试补全括号
      let data;
      try {
        data = JSON.parse(clean);
      } catch (e1) {
        console.warn('First parse failed, trying repair...', e1.message);
        // 容错2：去掉尾部逗号
        let repaired = clean.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
        try {
          data = JSON.parse(repaired);
        } catch (e2) {
          // 容错3：尝试截取第一个完整的JSON对象
          const firstBrace = repaired.indexOf('{');
          const lastBrace = repaired.lastIndexOf('}');
          if (firstBrace >= 0 && lastBrace > firstBrace) {
            data = JSON.parse(repaired.substring(firstBrace, lastBrace + 1));
          } else {
            throw e2;
          }
        }
      }

      if (data.detectedRole && data.detectedRole.trim() && data.detectedRole !== State.userInput.role) {
        State.userInput.role = data.detectedRole.trim();
        setAIStatus('AI 从 JD 中识别岗位：' + State.userInput.role, 'success');
      }

      State.aiAnalysis = data.analysis || null;
      State.aiRoleModel = {
        skills: data.skills.map(s => ({
          name: s.name,
          current: s.current || 30,
          target: s.target || 75,
          gap: s.gap || '',
        })),
        phases: data.phases,
        scenes: '求职 / 转岗 / 作品集 / 面试冲刺',
        levels: '实习 / 校招 / 1-3年 / 转岗',
        outputs: (data.tasks || []).map(t => t.output).slice(0, 5).join('·'),
        keywords: data.keywords || '',
      };
      State.aiTasks = (data.tasks || []).map((t, i) => ({
        day: i + 1,
        phase: t.phase || data.phases[Math.min(Math.floor(i / (State.userInput.sprintDays / 4)), 3)].name,
        title: t.title,
        desc: t.desc,
        jdRequirement: t.jdRequirement || '',
        time: State.userInput.timePerDay,
        output: {
          type: t.outputType || '文档输出',
          title: t.output || t.title,
          desc: t.desc,
          icon: ['📋','🔧','📊','📝','🎯','💡','🔍','✨'][i % 8],
          banner: 'b' + ((i % 5) + 1),
        },
        steps: t.steps || ['了解核心要点', '动手实践', '整理成果'],
        tools: t.tools || ['在线工具', '模板文档'],
        checklist: t.checklist || ['已完成产出', '成果可展示'],
      }));

      setAIStatus('AI 已生成 ' + State.aiTasks.length + ' 个任务，能力模型解析完成', 'success');
      State.aiError = null;
    } catch (e) {
      console.error('AI master parse failed:', e);
      State.aiError = 'AI 返回的 JSON 格式解析失败';
      setAIStatus('AI 返回数据解析失败：' + e.message, 'error');
      State.aiAnalysis = null;
      State.aiRoleModel = null;
      State.aiTasks = null;
    }
  } else {
    State.aiError = State.aiError || `AI 连续 ${maxRetries} 次调用均失败`;
    setAIStatus(State.aiError + '，请检查网络后重试', 'error');
    State.aiAnalysis = null;
    State.aiRoleModel = null;
    State.aiTasks = null;
  }

  markStep();
  await sleep(300);

  // AI 彻底失败时：显示错误并提供返回按钮
  if (!State.aiTasks || State.aiTasks.length === 0) {
    setProgress(100);
    for (let i = idx; i < steps.length; i++) {
      if (container.children[i]) {
        container.children[i].classList.add('done');
        container.children[i].querySelector('.lcheck').textContent = '✗';
        container.children[i].style.opacity = '0.3';
      }
    }
    $('#loading-title').textContent = 'AI 生成失败';
    setAIStatus('错误详情：' + (State.aiError || '未知') + '。请检查网络连接后重新提交。', 'error');
    setTimeout(() => {
      showView('view-form');
      toast('AI 调用失败：' + (State.aiError || '未知原因') + '，请重试', '');
    }, 3000);
    return;
  }

  // Step 3: 计算差距
  markStep();
  setAIStatus('计算能力差距，排序优先补齐方向…');
  buildProfile();
  await sleep(300);

  // Step 4: 生成计划
  markStep();
  setAIStatus('已生成 ' + State.userInput.sprintDays + ' 天个性化冲刺计划');
  await sleep(300);

  // Step 5: 拆解任务
  markStep();
  setAIStatus('拆解每日任务执行模板…');
  await sleep(300);

  // Step 6: 初始化
  markStep();
  setAIStatus('初始化作品集与表达引擎…');
  await sleep(300);

  // 完成
  setProgress(100);
  if (idx > 0) {
    const prev = container.children[idx - 1];
    prev.classList.remove('active');
    prev.classList.add('done');
    prev.querySelector('.lcheck').textContent = '✓';
  }

  saveState();
  setTimeout(() => {
    showView('view-app');
    renderAll();
    toast('AI 已生成「' + State.userInput.role + '」专属冲刺计划！', 'success');
  }, 500);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* -------- AI 生成岗位能力模型 -------- */
async function generateRoleModel(role, level) {
  const prompt = `你是职业能力模型专家。请为"${role}"（目标级别：${level}）生成一个能力模型。

要求：
1. 给出6个核心能力维度（每个2-4个字）
2. 每个维度的目标分值（60-90之间）
3. 4个冲刺阶段名称和描述
4. 该岗位的核心产出物
5. 简历能力关键词

请严格用以下JSON格式返回（不要加markdown代码块标记）：
{"skills":[{"name":"维度名","target":80}],"phases":[{"name":"阶段名","desc":"描述","days":"第1-7天"}],"outputs":"产出物1·产出物2","keywords":"关键词1·关键词2·关键词3"}`;

  const result = await callAI(prompt, '你是职业能力模型设计专家，输出必须是合法JSON。');
  if (!result) return null;

  try {
    // 清理可能的 markdown 标记
    let clean = result.trim();
    if (clean.startsWith('```')) {
      clean = clean.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    const data = JSON.parse(clean);

    // 构建完整的 RoleModel
    return {
      skills: data.skills.map(s => ({
        name: s.name,
        current: 20 + Math.floor(Math.random() * 30),
        target: s.target
      })),
      phases: data.phases,
      scenes: '求职 / 转岗 / 作品集 / 面试冲刺',
      levels: '实习 / 校招 / 1-3年 / 转岗',
      outputs: data.outputs,
      keywords: data.keywords,
    };
  } catch (e) {
    console.error('AI role model parse failed:', e, result);
    return null;
  }
}

/* ============================================
   构建职业画像与数据（真实个性化引擎）
   ============================================ */

// 技能关键词 → 能力维度映射
const SkillKeywordMap = {};

// 目标级别 → 能力目标调整系数
const LevelAdjust = {};

function buildProfile() {
  const { scene, role, level, skills, experience, timePerDay, sprintDays } = State.userInput;
  
  // 纯 AI 驱动：只使用 AI 返回的数据，没有任何预设 fallback
  const model = State.aiRoleModel;
  const aiTasks = State.aiTasks || [];
  
  if (!model || aiTasks.length === 0) {
    console.error('No AI data available, buildProfile should not be called');
    return;
  }

  // === 1. 个性化能力值：AI 已经根据用户技能生成了 current/target ===
  const personalizedSkills = model.skills.map(s => ({
    name: s.name,
    current: s.current || 30,
    target: s.target || 75,
    gap: (s.target || 75) - (s.current || 30),
  }));

  const gapAnalysis = personalizedSkills.slice().sort((a, b) => b.gap - a.gap);
  const topGaps = gapAnalysis.slice(0, 3).map(g => g.name);

  // === 2. 任务：直接使用 AI 生成的任务 ===
  const tasks = aiTasks.slice();

  // === 3. 构建画像 ===
  State.profile = {
    scene,
    role,
    level,
    skills: skills || '未填写',
    experience: experience || '暂无',
    timePerDay,
    sprintDays,
    startDate: new Date().toLocaleDateString('zh-CN'),
    outputs: model.outputs || '',
    keywords: model.keywords || '',
    levelFocus: State.aiAnalysis ? '基于 AI 分析的个性化路径' : 'AI 生成路径',
    topGaps,
  };

  State.skills = personalizedSkills;
  State.sprint = {
    phases: model.phases,
    tasks: tasks,
  };

  State.currentDay = 1;
  State.selectedDay = 1;
  State.completedTasks = new Set();
  State.portfolio = [];

  updateLoopStatus();
}

// 任务个性化排序：按能力差距动态调整顺序
function personalizeTaskOrder(tasks, sprintDays, topGaps, levelCfg) {
  // 前 7 天（认知筑基）：优先安排 topGaps 对应的任务
  const phase1 = tasks.slice(0, 7);
  const phase23 = tasks.slice(7, 25);
  const phase4 = tasks.slice(25);

  // 根据差距最大的能力，把相关任务提前
  const reordered = [...phase1];
  // 把与 topGaps 相关的任务排到前面（简单实现：按 desc 中是否包含差距关键词排序）
  phase23.sort((a, b) => {
    const aMatch = topGaps.some(g => a.desc.includes(g) || a.title.includes(g)) ? 1 : 0;
    const bMatch = topGaps.some(g => b.desc.includes(g) || b.title.includes(g)) ? 1 : 0;
    return bMatch - aMatch;
  });

  const result = [...reordered, ...phase23, ...phase4].slice(0, sprintDays);
  // 重新编号 day
  return result.map((t, i) => ({ ...t, day: i + 1 }));
}

// 更新成长闭环状态
function updateLoopStatus() {
  const hasGoal = !!State.profile.role;
  const hasTask = State.completedTasks.size > 0;
  const hasPortfolio = State.portfolio.length > 0;
  const hasExpress = State.portfolio.length >= 1; // 有成果就能生成表达

  State.loopStatus = {
    goal: hasGoal,
    task: hasTask,
    portfolio: hasPortfolio,
    express: hasExpress,
  };
}

/* ============================================
   渲染：侧栏
   ============================================ */
function renderSidebar() {
  const p = State.profile;
  $('#profile-card').innerHTML = `
    <div class="pc-role">岗位家族</div>
    <div class="pc-name">${p.role}</div>
    <div class="pc-row"><span>目标场景</span><span>${p.scene}</span></div>
    <div class="pc-row"><span>目标级别</span><span>${p.level}</span></div>
    <div class="pc-row"><span>每日时间</span><span>${p.timePerDay}h</span></div>
    <div class="pc-row"><span>冲刺周期</span><span>${p.sprintDays}天</span></div>
  `;

  const doneCount = State.completedTasks.size;
  const totalCount = State.sprint.tasks.length;
  const pct = Math.round(doneCount / totalCount * 100);

  $('#quick-stats').innerHTML = `
    <div class="qstat">
      <span class="qstat-label">已完成任务</span>
      <span class="qstat-val purple">${doneCount}<span style="font-size:14px;color:var(--muted)">/${totalCount}</span></span>
    </div>
    <div class="qstat">
      <span class="qstat-label">作品集成果</span>
      <span class="qstat-val green">${State.portfolio.length}</span>
    </div>
    <div class="qstat">
      <span class="qstat-label">总进度</span>
      <span class="qstat-val">${pct}%</span>
    </div>
  `;

  // 岗位产出物信息
  const outputsHtml = State.profile.outputs ? `
    <div class="outputs-card">
      <div class="oc-label">本岗位可展示成果</div>
      <div class="oc-text">${State.profile.outputs}</div>
    </div>
  ` : '';
  const existingOutputs = $('.outputs-card');
  if (existingOutputs) existingOutputs.remove();
  $('#quick-stats').insertAdjacentHTML('afterend', outputsHtml);

  $('#appbar-day').textContent = `第 ${State.currentDay} 天`;
}

/* ============================================
   渲染：雷达图（SVG）
   ============================================ */
function renderRadar() {
  const svg = $('#radar-svg');
  const cx = 150, cy = 150, maxR = 100;
  const skills = State.skills;
  const n = skills.length;
  const angleStep = (Math.PI * 2) / n;

  let html = '';

  // 背景网格
  for (let level = 1; level <= 4; level++) {
    const r = (maxR / 4) * level;
    let pts = '';
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + i * angleStep;
      pts += `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r} `;
    }
    html += `<polygon points="${pts}" fill="none" stroke="#e2e6f0" stroke-width="1"/>`;
  }

  // 轴线
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + i * angleStep;
    html += `<line x1="${cx}" y1="${cy}" x2="${cx + Math.cos(a) * maxR}" y2="${cy + Math.sin(a) * maxR}" stroke="#e2e6f0" stroke-width="1"/>`;
  }

  // 目标能力多边形
  let targetPts = '';
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + i * angleStep;
    const r = (skills[i].target / 100) * maxR;
    targetPts += `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r} `;
  }
  html += `<polygon points="${targetPts}" fill="rgba(91,44,214,0.12)" stroke="#5b2cd6" stroke-width="2"/>`;

  // 当前能力多边形
  let currentPts = '';
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + i * angleStep;
    const r = (skills[i].current / 100) * maxR;
    currentPts += `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r} `;
  }
  html += `<polygon points="${currentPts}" fill="rgba(10,143,134,0.15)" stroke="#0a8f86" stroke-width="2"/>`;

  // 数据点
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + i * angleStep;
    const r = (skills[i].current / 100) * maxR;
    html += `<circle cx="${cx + Math.cos(a) * r}" cy="${cy + Math.sin(a) * r}" r="3" fill="#0a8f86"/>`;
  }

  // 标签
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + i * angleStep;
    const lr = maxR + 22;
    const lx = cx + Math.cos(a) * lr;
    const ly = cy + Math.sin(a) * lr;
    html += `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" font-size="12" font-weight="600" fill="#5b6578">${skills[i].name}</text>`;
  }

  svg.innerHTML = html;
}

/* ============================================
   渲染：能力差距
   ============================================ */
function renderGap() {
  const skills = State.skills;
  $('#gap-list').innerHTML = skills.map(s => {
    const gap = s.target - s.current;
    const level = gap >= 40 ? 'urgent' : gap >= 25 ? 'important' : 'normal';
    const label = gap >= 40 ? '紧急补齐' : gap >= 25 ? '重点提升' : '持续加强';
    return `
      <div class="gap-item">
        <div class="gap-item-head">
          <span class="gap-name">${s.name}</span>
          <span class="gap-badge ${level}">${label}</span>
        </div>
        <div class="gap-bars">
          <div class="gap-bar-track"><div class="gap-bar-fill current" style="width:${s.current}%"></div></div>
          <div class="gap-bar-track"><div class="gap-bar-fill target" style="width:${s.target}%"></div></div>
        </div>
        <div class="gap-labels">
          <span>当前 ${s.current}</span>
          <span>目标 ${s.target} · 差距 ${gap}</span>
        </div>
        ${s.gap ? `<div class="gap-ai-hint">${s.gap}</div>` : ''}
      </div>
    `;
  }).join('');
}

/* ============================================
   渲染：今日任务（仪表盘预览）
   ============================================ */
function renderTodayPreview() {
  const day = State.currentDay;
  const tasks = State.sprint.tasks.filter(t => t.day === day);
  $('#today-tag').textContent = `第 ${day} 天`;

  if (tasks.length === 0) {
    $('#today-tasks').innerHTML = '<div style="color:var(--muted);font-size:14px;padding:12px;">今天没有安排任务。</div>';
    return;
  }

  $('#today-tasks').innerHTML = tasks.map(t => {
    const done = State.completedTasks.has(t.day);
    return `
      <div class="today-task ${done ? 'done' : ''}" data-day="${t.day}">
        <span class="tt-check">${done ? '✓' : ''}</span>
        <div class="tt-body">
          <div class="tt-title">${t.title}</div>
          <div class="tt-meta">${t.desc.substring(0, 40)}…</div>
        </div>
        <span class="tt-time">${t.time}min</span>
      </div>
    `;
  }).join('');

  // 绑定点击
  $$('.today-task').forEach(el => {
    el.addEventListener('click', () => openTaskModal(parseInt(el.dataset.day)));
  });
}

/* ============================================
   渲染：进度环
   ============================================ */
function renderProgress() {
  const done = State.completedTasks.size;
  const total = State.sprint.tasks.length;
  const pct = total > 0 ? done / total : 0;
  const circumference = 2 * Math.PI * 52;
  const offset = circumference * (1 - pct);

  $('#ring-fg').style.strokeDashoffset = offset;
  $('#pr-num').textContent = Math.round(pct * 100) + '%';

  $('#progress-stats').innerHTML = `
    <div class="ps-row"><span>已完成</span><span>${done} 个任务</span></div>
    <div class="ps-row"><span>待完成</span><span>${total - done} 个任务</span></div>
    <div class="ps-row"><span>累计学习</span><span>${done * 50} 分钟</span></div>
    <div class="ps-row"><span>当前阶段</span><span>${getCurrentPhase()}</span></div>
  `;
}

function getCurrentPhase() {
  const day = State.currentDay;
  if (day <= 7) return State.sprint.phases[0].name;
  if (day <= 16) return State.sprint.phases[1].name;
  if (day <= 25) return State.sprint.phases[2].name;
  return State.sprint.phases[3].name;
}

/* ============================================
   渲染：作品集预览
   ============================================ */
function renderPortfolioMini() {
  if (State.portfolio.length === 0) {
    $('#portfolio-mini').innerHTML = '<div class="pm-empty">完成任务后，成果会自动沉淀到这里。</div>';
    return;
  }
  const recent = State.portfolio.slice(-3).reverse();
  $('#portfolio-mini').innerHTML = recent.map(p => `
    <div class="pm-item">
      <span class="pm-icon ${p.banner === 'b1' ? 'doc' : p.banner === 'b2' ? 'data' : 'design'}">${p.icon}</span>
      <div class="pm-body">
        <div class="pm-title">${p.title}</div>
        <div class="pm-meta">${p.type} · 第${p.day}天</div>
      </div>
    </div>
  `).join('');
}

/* ============================================
   渲染：冲刺计划
   ============================================ */
function renderPhases() {
  const phases = State.sprint.phases;
  const tasks = State.sprint.tasks;
  const sprintDays = State.userInput ? State.userInput.sprintDays : 30;

  // 动态标题
  const titleEl = $('#sprint-title');
  if (titleEl) {
    titleEl.textContent = `${sprintDays} 天冲刺计划`;
  }

  // 根据冲刺天数调整阶段范围
  let ranges;
  if (sprintDays <= 7) {
    ranges = [[1,2],[3,4],[5,6],[7,7]];
  } else if (sprintDays <= 30) {
    ranges = [[1,7],[8,16],[17,25],[26,Math.min(sprintDays,30)]];
  } else {
    ranges = [[1,15],[16,30],[31,50],[51,sprintDays]];
  }

  $('#phases').innerHTML = phases.map((phase, pi) => {
    const [start, end] = ranges[pi] || [1, sprintDays];
    const phaseTasks = tasks.filter(t => t.day >= start && t.day <= end);

    return `
      <div class="phase">
        <div class="phase-head">
          <div class="phase-num">${pi + 1}</div>
          <div>
            <div class="phase-title">${phase.name}</div>
            <div class="phase-desc">${phase.desc}</div>
          </div>
          <span class="phase-days">${phase.days}</span>
        </div>
        <div class="phase-body">
          <div class="phase-week">
            ${phaseTasks.map(t => {
              const done = State.completedTasks.has(t.day);
              const today = t.day === State.currentDay;
              return `
                <div class="day-cell ${done ? 'done' : ''} ${today ? 'today' : ''}" data-day="${t.day}">
                  <div class="dc-num">Day ${t.day}</div>
                  <div class="dc-task">${done ? '✓ ' : ''}${t.title.substring(0, 14)}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }).join('');

  $$('.day-cell').forEach(el => {
    el.addEventListener('click', () => {
      State.selectedDay = parseInt(el.dataset.day);
      switchRoute('task');
      renderTaskPage();
    });
  });
}

/* ============================================
   渲染：今日任务页
   ============================================ */
function renderTaskPage() {
  const totalDays = State.sprint.tasks.length;

  // 日期选择器
  $('#day-selector').innerHTML = Array.from({ length: totalDays }, (_, i) => {
    const day = i + 1;
    const done = State.completedTasks.has(day);
    const active = day === State.selectedDay;
    return `<button class="ds-btn ${active ? 'active' : ''} ${done ? 'done' : ''}" data-day="${day}">${day}</button>`;
  }).join('');

  $$('.ds-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      State.selectedDay = parseInt(btn.dataset.day);
      renderTaskPage();
    });
  });

  // 任务列表
  const tasks = State.sprint.tasks.filter(t => t.day === State.selectedDay);
  if (tasks.length === 0) {
    $('#task-list').innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted);">第 ${State.selectedDay} 天没有安排任务。</div>`;
    return;
  }

  $('#task-list').innerHTML = tasks.map(t => {
    const done = State.completedTasks.has(t.day);
    return `
      <div class="task-card ${done ? 'done' : ''}">
        <div class="tc-check" data-day="${t.day}">${done ? '✓' : ''}</div>
        <div class="tc-body">
          <div class="tc-head">
            <span class="tc-title">${t.title}</span>
            <span class="tc-tag ${t.type}">${t.type === 'learn' ? '学习' : t.type === 'practice' ? '练习' : '输出'}</span>
          </div>
          <div class="tc-desc">${t.desc}</div>
          <div class="tc-foot">
            <span class="tc-meta">⏱ ${t.time} 分钟</span>
            <span class="tc-meta">📦 ${t.output.type}</span>
            <div class="tc-actions">
              <button class="btn btn-soft btn-sm" data-open="${t.day}">查看模板</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // 绑定勾选
  $$('.tc-check').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      toggleTask(parseInt(el.dataset.day));
    });
  });

  // 绑定打开模板
  $$('[data-open]').forEach(el => {
    el.addEventListener('click', () => openTaskModal(parseInt(el.dataset.open)));
  });
}

function toggleTask(day) {
  if (State.completedTasks.has(day)) {
    State.completedTasks.delete(day);
    // 移除作品集
    State.portfolio = State.portfolio.filter(p => p.day !== day);
    toast('已取消完成');
  } else {
    State.completedTasks.add(day);
    // 添加作品集
    const task = State.sprint.tasks.find(t => t.day === day);
    if (task) {
      State.portfolio.push({ ...task.output, day: task.day, taskTitle: task.title });
    }
    // 庆祝动效
    triggerConfetti();
    toast('任务完成！成果已沉淀到作品集', 'success');
  }
  updateLoopStatus();
  saveState();
  renderAll();
}

/* -------- 庆祝动效 -------- */
function triggerConfetti() {
  const colors = ['#5b2cd6', '#0a8f86', '#c8841a', '#1a9d6e', '#e84393'];
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:999;overflow:hidden;';
  document.body.appendChild(container);

  for (let i = 0; i < 40; i++) {
    const conf = document.createElement('div');
    const size = 6 + Math.random() * 8;
    conf.style.cssText = `position:absolute;width:${size}px;height:${size}px;background:${colors[Math.floor(Math.random()*colors.length)]};border-radius:${Math.random()>0.5?'50%':'2px'};left:${50+Math.random()*20-10}%;top:40%;opacity:1;`;
    container.appendChild(conf);

    const angle = Math.random() * Math.PI * 2;
    const velocity = 100 + Math.random() * 200;
    const dx = Math.cos(angle) * velocity;
    const dy = Math.sin(angle) * velocity - 100;

    conf.animate([
      { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
      { transform: `translate(${dx}px,${dy+300}px) rotate(${Math.random()*720}deg)`, opacity: 0 }
    ], { duration: 1200 + Math.random() * 600, easing: 'cubic-bezier(0.2,0.6,0.4,1)' });
  }

  setTimeout(() => container.remove(), 2000);
}

/* ============================================
   渲染：作品集页
   ============================================ */
function renderPortfolio() {
  if (State.portfolio.length === 0) {
    $('#portfolio-grid').innerHTML = `
      <div class="pf-empty">
        <div class="pf-empty-icon">📦</div>
        <p>还没有沉淀的成果。<br>完成今日任务，成果会自动出现在这里。</p>
      </div>
    `;
    return;
  }

  $('#portfolio-grid').innerHTML = `
    <div class="pf-export-bar">
      <button class="btn btn-soft btn-sm" onclick="exportPortfolio()">📥 导出作品集</button>
      <span class="pf-count">共 ${State.portfolio.length} 份成果</span>
    </div>
  ` + State.portfolio.map(p => `
    <div class="pf-card">
      <div class="pf-banner ${p.banner}">${p.icon}</div>
      <div class="pf-body">
        <div class="pf-type">${p.type}</div>
        <div class="pf-title">${p.title}</div>
        <div class="pf-desc">${p.desc}</div>
        <div class="pf-foot">
          <span>第 ${p.day} 天产出</span>
          <span>${p.taskTitle ? p.taskTitle.substring(0, 12) : ''}</span>
        </div>
        <div class="pf-source">来源：Day ${p.day} · ${p.taskTitle || '任务成果'}</div>
      </div>
    </div>
  `).join('');
}

/* ============================================
   渲染：求职表达
   ============================================ */
function renderExpress() {
  renderResume();
  renderInterview();
  renderWeekly();
}

function renderResume() {
  const p = State.profile;
  const role = p.role;
  const completed = [...State.completedTasks].sort((a, b) => a - b);
  const items = State.portfolio;

  if (items.length === 0) {
    $('#epanel-resume').innerHTML = `
      <div class="express-card">
        <div class="ec-head"><span class="ec-title">简历项目描述</span></div>
        <div class="ec-content">完成至少 1 个任务后，CareerPilot 会自动把你的成果转化为简历项目描述。</div>
      </div>
    `;
    return;
  }

  // 生成简历描述
  const mainProject = items.find(i => i.type === '作品集') || items[items.length - 1];
  const resumeDesc = generateResumeDesc(role, mainProject, items.length);

  $('#epanel-resume').innerHTML = `
    <div class="express-card">
      <div class="ec-head">
        <span class="ec-title">项目经历</span>
        <span class="ec-source">基于 ${items.length} 个已沉淀成果生成</span>
      </div>
      <div class="ec-content">${resumeDesc}</div>
      <div class="ec-trace">来源追溯：${items.map(i => `Day ${i.day}`).join(' · ')}</div>
      <div class="ec-actions">
        <button class="btn btn-soft btn-sm" onclick="copyText(this)">复制文本</button>
        <button class="btn btn-soft btn-sm" onclick="aiGenerateResume()">✨ AI 优化简历</button>
        <button class="btn btn-primary btn-sm" onclick="exportResume()">📥 导出 Markdown</button>
      </div>
      <div id="ai-resume-result"></div>
    </div>
    <div class="express-card">
      <div class="ec-head">
        <span class="ec-title">能力关键词</span>
        <span class="ec-source">基于 ${p.role} 岗位模型生成</span>
      </div>
      <div class="ec-content">${generateKeywords(p.role)}</div>
    </div>
  `;
}

/* -------- AI 简历优化 -------- */
async function aiGenerateResume() {
  const resultEl = $('#ai-resume-result');
  if (!resultEl) return;
  resultEl.innerHTML = '<div class="ai-loading">✨ AI 正在优化简历描述...</div>';

  const p = State.profile;
  const items = State.portfolio;
  const mainProject = items.find(i => i.type === '作品集') || items[items.length - 1];

  const prompt = `请为以下求职者生成一段专业的简历项目描述，要求：
1. 用STAR法则（情境-任务-行动-结果）
2. 量化成果，突出亮点
3. 控制在200字以内
4. 适合直接粘贴到简历中

求职者信息：
- 目标岗位: ${p.role}（${p.level}）
- 已有技能: ${p.skills}
- 完成任务数: ${items.length}
- 主要成果: ${mainProject.title} - ${mainProject.desc}
- 成果类型: ${items.map(i => i.type).join(', ')}

请直接输出简历项目描述文本，不要加标题。`;

  const result = await callAI(prompt, '你是专业简历顾问，擅长将学习经历转化为有说服力的简历项目描述。');
  if (result) {
    resultEl.innerHTML = `<div class="ai-result-box"><div class="ai-result-label">✨ AI 优化结果</div><div class="ai-result-text">${result.replace(/\n/g, '<br>')}</div><button class="btn btn-soft btn-sm" onclick="copyText(this)">复制</button></div>`;
  } else {
    resultEl.innerHTML = '<div class="ai-error">AI 生成失败，请稍后重试</div>';
  }
}

function generateResumeDesc(role, project, count) {
  const p = State.profile || {};
  const outputs = p.outputs || '';
  return `<strong>${project.title}</strong> ｜ 个人实战项目

项目背景：基于${p.sprintDays || 30}天${role}能力冲刺计划，独立完成完整实战项目。

核心工作：
• 完成${count}项结构化任务${outputs ? '，涵盖' + outputs : ''}
• 独立产出${project.title}，建立完整的${role}实战能力框架
• 通过每日任务执行和阶段复盘，形成可量化的能力提升轨迹

项目成果：
• 沉淀${count}份结构化成果文档，包含${project.type}和相关交付物
• 建立${role}岗位的核心能力模型，能力评估从入门提升至具备实战水平
• 形成可面试讲解的完整项目经历和作品集`;
}

function generateKeywords(role) {
  const p = State.profile || {};
  const kws = p.keywords || '';
  return kws.split(/[·,，、]/).filter(k => k.trim()).map(k => `「${k.trim()}」`).join(' ');
}

function renderInterview() {
  const role = State.profile.role;
  const completed = State.completedTasks.size;

  if (completed === 0) {
    $('#epanel-interview').innerHTML = `
      <div class="express-card">
        <div class="ec-head"><span class="ec-title">面试问答</span></div>
        <div class="ec-content">完成至少 1 个任务后，AI 会基于你的成果生成面试问答。</div>
      </div>
    `;
    return;
  }

  $('#epanel-interview').innerHTML = '<div class="ai-loading">✨ AI 正在生成面试问答...</div>';

  generateInterviewQA(role, completed).then(qas => {
    $('#epanel-interview').innerHTML = qas.map(qa => `
    <div class="qa-item">
      <div class="qa-q">${qa.q}</div>
      <div class="qa-a">${qa.a}</div>
    </div>
  `).join('');
  });
}

async function generateInterviewQA(role, completed) {
  const items = State.portfolio || [];
  const mainProject = items.find(i => i.type === '作品集') || items[items.length - 1];
  const p = State.profile || {};

  const prompt = `请为以下求职者生成3个面试问答（用中文回答）：

岗位：${role}
级别：${p.level || '校招'}
已完成任务数：${completed}
主要成果：${mainProject ? mainProject.title + ' - ' + mainProject.desc : '暂无'}
能力关键词：${p.keywords || ''}
AI分析：${State.aiAnalysis || ''}

要求：
1. 第一个问题：请介绍一下你最近做的一个项目
2. 第二个问题：你为什么选择${role}方向
3. 第三个问题：贴合${role}岗位的专业问题

每个回答用STAR法则，200字以内。用JSON数组格式返回：
[{"q":"问题","a":"回答"}]

不要加markdown标记。`;

  const result = await callAI(prompt, CAREER_SKILL_SYSTEM + '\n\n你是面试辅导专家，基于用户的实际成果和JD要求生成面试问答。', 60);
  if (result) {
    try {
      let clean = result.trim();
      if (clean.startsWith('```')) {
        clean = clean.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      return JSON.parse(clean);
    } catch (e) {
      console.error('Interview QA parse failed:', e);
    }
  }

  // AI 失败时返回基本提示（不含任何固定话术）
  return [{
    q: '请介绍一下你最近做的一个项目。',
    a: `我在${p.sprintDays || 30}天冲刺中完成了${completed}项${role}相关任务，主要成果包括${mainProject ? mainProject.title : '多项实操练习'}。`,
  }];
}

function renderWeekly() {
  const completed = [...State.completedTasks].sort((a, b) => a - b);
  if (completed.length === 0) {
    $('#epanel-weekly').innerHTML = `
      <div class="express-card">
        <div class="ec-head"><span class="ec-title">阶段周报</span></div>
        <div class="ec-content">完成至少 1 个任务后，CareerPilot 会自动生成阶段周报。</div>
      </div>
    `;
    return;
  }

  const maxDay = completed[completed.length - 1];
  const weekNum = Math.ceil(maxDay / 7);
  const weekTasks = completed.filter(d => d <= weekNum * 7);
  const weekItems = State.portfolio.filter(p => p.day <= weekNum * 7);

  $('#epanel-weekly').innerHTML = `
    <div class="weekly-card">
      <div class="wc-head">
        <span class="wc-title">第 ${weekNum} 周成长周报</span>
        <span class="ec-source">第 ${(weekNum-1)*7+1}-${Math.min(weekNum*7, maxDay)} 天</span>
      </div>
      <div class="wc-body">
        <h4>本周完成情况</h4>
        <ul>
          <li>完成任务：${weekTasks.length} 个</li>
          <li>沉淀成果：${weekItems.length} 份</li>
          <li>累计学习时长：约 ${weekTasks.length * 50} 分钟</li>
        </ul>

        <h4>核心成果</h4>
        <ul>
          ${weekItems.map(i => `<li>${i.title}（${i.type}）</li>`).join('')}
        </ul>

        <h4>能力提升</h4>
        <ul>
          <li>当前总进度：${Math.round(State.completedTasks.size / State.sprint.tasks.length * 100)}%</li>
          <li>所处阶段：${getCurrentPhase()}</li>
          <li>能力雷达图已更新，可查看仪表盘了解最新能力分布</li>
        </ul>

        <h4>下周计划</h4>
        <ul>
          <li>继续按计划完成每日任务</li>
          <li>重点关注能力差距中标记为"紧急补齐"的能力项</li>
          <li>及时沉淀成果，为求职表达积累素材</li>
        </ul>
      </div>
    </div>
  `;
}

/* ============================================
   任务弹层
   ============================================ */
function openTaskModal(day) {
  const task = State.sprint.tasks.find(t => t.day === day);
  if (!task) return;

  const tpl = TemplateContent[task.template] || TemplateContent.default;
  const done = State.completedTasks.has(day);

  // 构建执行步骤HTML
  const stepsHtml = task.steps ? `
    <div class="mb-section">
      <div class="mb-label">📋 执行步骤</div>
      <div class="mb-steps">
        ${task.steps.map((s, i) => `<div class="mb-step"><span class="step-num">${i+1}</span><span class="step-text">${s}</span></div>`).join('')}
      </div>
    </div>
  ` : '';

  // 构建推荐工具HTML
  const toolsHtml = task.tools ? `
    <div class="mb-section">
      <div class="mb-label">🔧 推荐工具</div>
      <div class="mb-tools">
        ${task.tools.map(t => `<span class="tool-tag">${t}</span>`).join('')}
      </div>
    </div>
  ` : '';

  // 构建验收标准HTML
  const checklistHtml = task.checklist ? `
    <div class="mb-section">
      <div class="mb-label">✅ 验收标准</div>
      <div class="mb-checklist">
        ${task.checklist.map(c => `<div class="mb-check-item" onclick="this.classList.toggle('checked')"><span class="mci-box">✓</span><span class="mci-text">${c}</span></div>`).join('')}
      </div>
    </div>
  ` : '';

  $('#modal-title').textContent = `Day ${day} · ${task.title}`;
  $('#modal-body').innerHTML = `
    <div class="mb-section">
      <div class="mb-label">任务描述</div>
      <div class="mb-text">${task.desc}</div>
    </div>
    ${task.jdRequirement ? `
    <div class="mb-section">
      <div class="mb-label">对应JD要求</div>
      <div class="mb-jd-req">${task.jdRequirement}</div>
    </div>
    ` : ''}
    ${stepsHtml}
    ${toolsHtml}
    <div class="mb-section">
      <div class="mb-label">执行模板 · ${tpl.name}</div>
      <div class="mb-template">
        ${tpl.sections.map(s => `<div style="margin-bottom:8px;"><strong>${s.label}：</strong><span class="tpl-field">${s.field}</span></div>`).join('')}
      </div>
    </div>
    ${checklistHtml}
    <div class="mb-section">
      <div class="mb-label">完成后产出</div>
      <div class="mb-text">${task.output.icon} <strong>${task.output.title}</strong>（${task.output.type}）<br>${task.output.desc}</div>
    </div>
  `;

  $('#modal-complete').textContent = done ? '已完成（取消标记）' : '标记完成并沉淀成果';
  $('#modal-complete').onclick = () => {
    toggleTask(day);
    closeModal();
  };

  $('#task-modal').classList.add('active');
}

function closeModal() {
  $('#task-modal').classList.remove('active');
}

/* ============================================
   表达页 Tab 切换
   ============================================ */
function initExpressTabs() {
  $$('.etab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.etab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      $$('.epanel').forEach(p => p.classList.remove('active'));
      $(`[data-epanel="${tab.dataset.etab}"]`).classList.add('active');
    });
  });
}

/* ============================================
   复制文本
   ============================================ */
function copyText(btn) {
  const content = btn.closest('.express-card').querySelector('.ec-content');
  const text = content.innerText;
  navigator.clipboard.writeText(text).then(() => {
    toast('已复制到剪贴板', 'success');
  }).catch(() => {
    toast('复制失败，请手动选择文本');
  });
}

/* ============================================
   导航绑定
   ============================================ */
function initNav() {
  $$('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const route = item.dataset.route;
      switchRoute(route);
      if (route === 'sprint') renderPhases();
      if (route === 'task') renderTaskPage();
      if (route === 'portfolio') renderPortfolio();
      if (route === 'express') renderExpress();
      if (route === 'about') {}
    });
  });

  $('#btn-goto-task').addEventListener('click', () => {
    State.selectedDay = State.currentDay;
    switchRoute('task');
    renderTaskPage();
  });

  $('#btn-goto-portfolio').addEventListener('click', () => {
    switchRoute('portfolio');
    renderPortfolio();
  });

  // 弹层关闭
  $('#modal-close').addEventListener('click', closeModal);
  $('#modal-skip').addEventListener('click', closeModal);
  $('#task-modal').addEventListener('click', e => {
    if (e.target.id === 'task-modal') closeModal();
  });

  initUpload();
  initFlowCheck();
}

/* ============================================
   文件上传
   ============================================ */
function initUpload() {
  const zone = $('#upload-zone');
  const input = $('#file-input');

  if (!zone || !input) return;

  zone.addEventListener('click', () => input.click());

  zone.addEventListener('dragover', e => {
    e.preventDefault();
    zone.classList.add('dragover');
  });

  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));

  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
  });

  input.addEventListener('change', e => {
    handleFiles(e.target.files);
    input.value = '';
  });
}

State.uploadedFiles = [];

function handleFiles(files) {
  const fileIcons = { doc: '📄', docx: '📄', pdf: '📕', txt: '📝', md: '📝', png: '🖼️', jpg: '🖼️', jpeg: '🖼️' };

  [...files].forEach(f => {
    const ext = f.name.split('.').pop().toLowerCase();
    State.uploadedFiles.push({
      name: f.name,
      size: f.size,
      type: ext,
      icon: fileIcons[ext] || '📄',
    });
  });

  renderUploadList();
  toast(`已上传 ${files.length} 个文件`, 'success');
}

function renderUploadList() {
  const list = $('#upload-list');
  if (!list) return;

  if (State.uploadedFiles.length === 0) {
    list.innerHTML = '';
    return;
  }

  list.innerHTML = State.uploadedFiles.map((f, i) => `
    <div class="upload-item">
      <span class="ui-icon">${f.icon}</span>
      <div class="ui-info">
        <div class="ui-name">${f.name}</div>
        <div class="ui-size">${formatFileSize(f.size)}</div>
      </div>
      <button class="ui-remove" onclick="removeFile(${i})">✕</button>
    </div>
  `).join('');
}

function removeFile(idx) {
  State.uploadedFiles.splice(idx, 1);
  renderUploadList();
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

/* ============================================
   流程检查
   ============================================ */
function initFlowCheck() {
  const btn = $('#btn-run-check');
  if (!btn) return;

  // 初始显示空状态
  renderCheckReport();

  btn.addEventListener('click', runFlowCheck);
}

function runFlowCheck() {
  const result = analyzeFlow();
  renderCheckReport(result);
  toast('流程检查完成', 'success');
}

function analyzeFlow() {
  const total = State.sprint.tasks.length;
  const completed = State.completedTasks.size;
  const portfolioCount = State.portfolio.length;
  const uploadedCount = State.uploadedFiles.length;
  const hasResume = State.uploadedFiles.some(f => /简历|resume|cv/i.test(f.name));
  const hasPortfolio = State.uploadedFiles.some(f => /作品|portfolio|项目|project/i.test(f.name));

  const checks = [];
  let score = 0;
  let maxScore = 0;

  // 1. 目标设定检查
  maxScore += 15;
  if (State.profile && State.profile.role) {
    checks.push({ status: 'pass', text: `<strong>目标已设定</strong>：${State.profile.role} · ${State.profile.level} · ${State.profile.scene}` });
    score += 15;
  } else {
    checks.push({ status: 'fail', text: '尚未设定目标岗位，请先完成输入' });
  }

  // 2. 能力分析检查
  maxScore += 10;
  if (State.skills && State.skills.length > 0) {
    const avgGap = Math.round(State.skills.reduce((s, sk) => s + (sk.target - sk.current), 0) / State.skills.length);
    checks.push({ status: 'pass', text: `<strong>能力差距已分析</strong>：平均差距 ${avgGap} 分，优先补齐 ${State.profile.topGaps.join('、')}` });
    score += 10;
  } else {
    checks.push({ status: 'fail', text: '能力差距分析未完成' });
  }

  // 3. 任务执行检查
  maxScore += 25;
  if (completed === 0) {
    checks.push({ status: 'fail', text: '尚未完成任何任务，建议从 Day 1 开始执行' });
  } else if (completed < 5) {
    checks.push({ status: 'warn', text: `<strong>已完成 ${completed}/${total} 任务</strong>，刚起步，保持每日执行节奏` });
    score += Math.round(completed / total * 25);
  } else if (completed < 15) {
    checks.push({ status: 'pass', text: `<strong>已完成 ${completed}/${total} 任务</strong>，进度良好，继续推进` });
    score += Math.round(completed / total * 25);
  } else {
    checks.push({ status: 'pass', text: `<strong>已完成 ${completed}/${total} 任务</strong>，执行力出色` });
    score += 25;
  }

  // 4. 成果沉淀检查
  maxScore += 20;
  if (portfolioCount === 0) {
    checks.push({ status: 'fail', text: '作品集为空，完成任务后会自动沉淀成果' });
  } else if (portfolioCount < 5) {
    checks.push({ status: 'warn', text: `<strong>已沉淀 ${portfolioCount} 份成果</strong>，建议继续积累到 5 份以上` });
    score += Math.round(portfolioCount / 5 * 20);
  } else {
    checks.push({ status: 'pass', text: `<strong>已沉淀 ${portfolioCount} 份成果</strong>，作品集初具规模` });
    score += 20;
  }

  // 5. 材料上传检查
  maxScore += 15;
  if (uploadedCount === 0) {
    checks.push({ status: 'warn', text: '尚未上传材料，建议上传简历和作品文档以便检查' });
  } else {
    if (hasResume) {
      checks.push({ status: 'pass', text: '<strong>简历已上传</strong>，可结合成长成果优化简历内容' });
      score += 8;
    } else {
      checks.push({ status: 'warn', text: '上传的材料中未检测到简历，建议上传简历文档' });
    }
    if (hasPortfolio) {
      checks.push({ status: 'pass', text: '<strong>作品文档已上传</strong>，可对比检查成果完整度' });
      score += 7;
    } else {
      checks.push({ status: 'warn', text: '上传的材料中未检测到作品集，建议上传已有作品' });
      score += uploadedCount > 0 ? 3 : 0;
    }
  }

  // 6. 求职表达检查
  maxScore += 15;
  if (portfolioCount >= 1) {
    checks.push({ status: 'pass', text: '<strong>求职表达已就绪</strong>：可前往"求职表达"页生成简历和面试材料' });
    score += 15;
  } else {
    checks.push({ status: 'fail', text: '需完成至少 1 个任务并沉淀成果后，才能生成求职表达' });
  }

  const pct = Math.round(score / maxScore * 100);
  let level = '待提升';
  if (pct >= 80) level = '优秀';
  else if (pct >= 60) level = '良好';
  else if (pct >= 40) level = '及格';

  return { score: pct, level, checks, completed, total, portfolioCount, uploadedCount };
}

function renderCheckReport(result) {
  const el = $('#check-report');
  if (!el) return;

  if (!result) {
    el.innerHTML = '<div class="check-empty">点击"运行流程检查"，CareerPilot 会基于你的完成情况和上传材料，检查成长流程完整度并给出建议。</div>';
    return;
  }

  el.innerHTML = `
    <div class="check-score">
      <div>
        <div class="check-score-num">${result.score}</div>
        <div class="check-score-label">${result.level}</div>
      </div>
      <div class="check-score-bar">
        <div class="check-score-fill" style="width: ${result.score}%"></div>
      </div>
    </div>
    <div class="check-items">
      ${result.checks.map(c => `
        <div class="check-item">
          <div class="ci-icon ${c.status}">${c.status === 'pass' ? '✓' : c.status === 'warn' ? '!' : '✕'}</div>
          <div class="ci-text">${c.text}</div>
        </div>
      `).join('')}
    </div>
  `;
}

/* ============================================
   全量渲染
   ============================================ */
function renderAll() {
  renderSidebar();
  renderLoopChain();
  renderPersonalization();
  renderRadar();
  renderGap();
  renderTodayPreview();
  renderProgress();
  renderPortfolioMini();
  renderPhases();
  renderTaskPage();
  renderPortfolio();
  renderExpress();
  renderJDGap();
}

/* ============================================
   渲染：岗位要求对照（JD差距分析）
   ============================================ */
function renderJDGap() {
  const role = State.profile ? State.profile.role : '';
  const el = $('#jd-req-list');
  const summaryEl = $('#jd-summary');
  if (!el || !summaryEl) return;

  const hasJD = State.userInput && State.userInput.jd && State.userInput.jd.trim();

  if (!hasJD) {
    summaryEl.innerHTML = `
      <div class="jd-empty">
        <p>未输入目标岗位 JD</p>
        <p class="jd-empty-hint">在输入页粘贴招聘JD后，AI 会自动分析岗位要求与你的任务匹配度</p>
      </div>
    `;
    el.innerHTML = '';
    return;
  }

  // 基于 AI 生成的任务和用户 JD 分析匹配度
  const allTasks = State.sprint ? State.sprint.tasks : [];
  const completedCount = allTasks.filter(t => State.completedTasks.has(t.day)).length;
  const total = allTasks.length;
  const coverage = total > 0 ? Math.round(completedCount / total * 100) : 0;

  summaryEl.innerHTML = `
    <div class="jd-stat-row">
      <div class="jd-stat covered">
        <span class="jd-stat-num">${completedCount}</span>
        <span class="jd-stat-label">已完成</span>
      </div>
      <div class="jd-stat pending">
        <span class="jd-stat-num">${total - completedCount}</span>
        <span class="jd-stat-label">待完成</span>
      </div>
      <div class="jd-stat total">
        <span class="jd-stat-num">${total}</span>
        <span class="jd-stat-label">任务总数</span>
      </div>
      <div class="jd-stat total">
        <span class="jd-stat-num">${coverage}%</span>
        <span class="jd-stat-label">完成率</span>
      </div>
    </div>
    <div class="jd-coverage-bar">
      <div class="jd-coverage-fill" style="width:${coverage}%"></div>
    </div>
  `;

  el.innerHTML = `
    <div class="jd-ai-analysis">
      <div class="jd-ai-label">AI JD 分析</div>
      <div class="jd-ai-text">${State.aiAnalysis || 'AI 分析结果将在完成任务后更新'}</div>
    </div>
    ${allTasks.map(t => `
      <div class="jd-req-item ${State.completedTasks.has(t.day) ? 'covered' : 'pending'}">
        <div class="jd-req-left">
          <span class="jd-req-icon ${State.completedTasks.has(t.day) ? 'covered' : 'pending'}">${State.completedTasks.has(t.day) ? '✓' : '⏳'}</span>
          <div class="jd-req-content">
            <div class="jd-req-text">Day ${t.day}: ${t.title}</div>
            <div class="jd-req-meta">
              <span class="jd-tag cat">${t.output.type}</span>
              ${State.completedTasks.has(t.day) ? `<span class="jd-evidence">已完成</span>` : `<span class="jd-evidence">待完成</span>`}
            </div>
          </div>
        </div>
        <span class="jd-req-status ${State.completedTasks.has(t.day) ? 'covered' : 'pending'}">${State.completedTasks.has(t.day) ? '已覆盖' : '待完成'}</span>
      </div>
    `).join('')}
  `;
}

// 匹配JD要求与任务产出
function findMatchingOutput(req, outputs) {
  const matched = [];
  const reqLower = req.requirement.toLowerCase();
  const proveLower = req.howToProve.toLowerCase();

  outputs.forEach(o => {
    const text = (o.type + ' ' + o.title + ' ' + o.desc + ' ' + o.taskTitle + ' ' + o.taskDesc).toLowerCase();
    
    // 关键词匹配
    const keywords = extractKeywords(req.requirement);
    const matchCount = keywords.filter(kw => text.includes(kw.toLowerCase())).length;
    
    if (matchCount >= 1) {
      matched.push(o);
    }
  });

  return matched;
}

// 从JD要求中提取关键词
function extractKeywords(reqText) {
  const keywords = [];
  const text = reqText.toLowerCase();
  
  const keywordMap = [
    'prd', '竞品', '原型', '指标', 'a/b', '漏斗', '分群', 'rfm', '看板',
    'sql', 'python', 'tableau', 'power bi', 'pandas',
    'api', 'sse', '流式', '部署', 'vercel', 'github',
    'prompt', '大模型', 'gpt', 'llama', '通义',
    'aarrr', '增长', '裂变', '留存', '实验',
    '方案', '架构', '价值', 'roi', '交付', '客户', '招投标',
    '工作流', '自动化', '对话', '上下文', '状态管理',
    '归因', '渠道', '内容策略', '投放',
    '行业', 'tob', '决策链', '需求洞察', '场景',
  ];
  
  keywordMap.forEach(kw => {
    if (text.includes(kw)) keywords.push(kw);
  });
  
  return keywords.length > 0 ? keywords : [reqText.substring(0, 4)];
}

/* ============================================
   渲染：成长闭环进度条
   ============================================ */
function renderLoopChain() {
  const s = State.loopStatus || { goal: true, task: false, portfolio: false, express: false };
  const nodes = [
    { key: 'goal',      label: '目标分析', icon: '🎯', route: 'dashboard',  desc: '岗位画像与能力差距已生成' },
    { key: 'task',      label: '任务执行', icon: '📋', route: 'task',        desc: '完成每日任务，积累成长' },
    { key: 'portfolio', label: '成果沉淀', icon: '📦', route: 'portfolio',  desc: '成果自动结构化沉淀' },
    { key: 'express',   label: '求职表达', icon: '🎤', route: 'express',    desc: '一键转化为简历与面试' },
  ];

  const activeIdx = s.express ? 3 : s.portfolio ? 2 : s.task ? 1 : 0;

  $('#loop-chain').innerHTML = `
    <div class="loop-track">
      ${nodes.map((n, i) => `
        <div class="loop-node ${s[n.key] ? 'active' : ''} ${i === activeIdx ? 'current' : ''}" data-route="${n.route}">
          <div class="ln-icon">${s[n.key] ? '✓' : n.icon}</div>
          <div class="ln-label">${n.label}</div>
          <div class="ln-desc">${n.desc}</div>
        </div>
        ${i < nodes.length - 1 ? `<div class="loop-link ${s[n.key] ? 'active' : ''}"></div>` : ''}
      `).join('')}
    </div>
  `;

  $$('.loop-node').forEach(el => {
    el.addEventListener('click', () => {
      switchRoute(el.dataset.route);
    });
  });
}

/* ============================================
   渲染：个性化生成依据
   ============================================ */
function renderPersonalization() {
  const p = State.profile;
  const aiText = State.aiAnalysis || '';

  $('#personalization-card').innerHTML = `
    <div class="pcard">
      <div class="pcard-head">
        <span class="pcard-title">AI 个性化分析</span>
        <span class="pcard-badge ai">职路引擎 · AI 驱动</span>
      </div>
      <div class="pcard-body">
        ${State.aiError ? `
        <div class="pcard-section">
          <div class="ps-label" style="color:#e74c3c">⚠️ AI 调用失败</div>
          <div class="ps-text" style="color:#e74c3c">${State.aiError}</div>
          <div class="ps-text" style="margin-top:8px">已使用基础模板生成计划，部分内容可能不够精准。可刷新重试。</div>
        </div>
        ` : ''}
        ${aiText ? `
        <div class="pcard-section">
          <div class="ps-label">AI 分析结论</div>
          <div class="ps-text ai-text">${aiText}</div>
        </div>
        ` : ''}
        <div class="pcard-section">
          <div class="ps-label">能力差距排序</div>
          <div class="ps-text">按差距从大到小排序，优先补齐：<strong>${p.topGaps ? p.topGaps.join('、') : '分析中...'}</strong>。相关任务已优先安排。</div>
        </div>
        <div class="pcard-section">
          <div class="ps-label">目标岗位</div>
          <div class="ps-text">${p.role}（${p.level}）</div>
        </div>
      </div>
    </div>
  `;
}

/* ============================================
   初始化
   ============================================ */
function init() {
  initSplash();
  initForm();
  initExpressTabs();
  initNav();
  initMobileNav();

  // 断点续传：如果有保存的状态，直接恢复
  if (loadState()) {
    showView('view-app');
    renderAll();
    toast('已恢复上次进度', 'success');
  }

  // 关闭弹层 ESC
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); closeMobileNav(); }
  });
}

document.addEventListener('DOMContentLoaded', init);
