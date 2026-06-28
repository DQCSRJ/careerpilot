/* ============================================
   职路引擎 CareerPilot · Demo Engine
   ============================================ */

/* -------- DeepSeek V4 Pro AI 引擎 -------- */
const AI_CONFIG = {
  apiKey: '',
  apiUrl: 'https://api.deepseek.com/v1/chat/completions',
  model: 'deepseek-v4-pro',
};

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
    return null;
  }

  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), (timeoutSec || 30) * 1000);

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
        max_tokens: 2000,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      if (res.status === 401) {
        toast('API Key 无效，请检查', '');
      }
      console.error('AI API error:', res.status);
      return null;
    }
    const data = await res.json();
    return data.choices[0].message.content;
  } catch (err) {
    clearTimeout(timeoutId);
    console.error('AI call failed:', err.name === 'AbortError' ? 'timeout' : err);
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
  const model = RoleModels[p.role] || RoleModels['AI产品经理'];
  (model.keywords || '').split(' · ').forEach(k => {
    if (k) md += `- ${k}\n`;
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
};

/* -------- 岗位JD要求数据库 --------
   基于真实招聘JD拆解的硬性要求清单
   每项要求包含：
   - category: 类别（技术/产品/业务/软技能）
   - requirement: 具体要求
   - weight: 权重（high/medium/low）
   - howToProve: 如何在作品中证明
*/
const JobRequirements = {
  'AI产品经理': [
    { category: '技术', requirement: '大模型认知：理解GPT-4/Llama/通义千问的能力边界与适用场景', weight: 'high', howToProve: '完成模型选型对比报告，含能力矩阵和选型理由' },
    { category: '技术', requirement: 'Prompt工程：能用分层Prompt策略解决实际业务问题', weight: 'high', howToProve: '产出Prompt策略文档，含分层模板和效果对比' },
    { category: '产品', requirement: 'PRD撰写：能独立完成AI功能的完整PRD', weight: 'high', howToProve: '产出完整PRD，含需求背景、功能详述、交互流程' },
    { category: '产品', requirement: '竞品分析：能深度拆解AI产品的功能、体验和商业模式', weight: 'medium', howToProve: '产出竞品深度分析报告，含SWOT和差异化机会' },
    { category: '产品', requirement: '数据指标体系：能设计北极星指标和A/B测试方案', weight: 'high', howToProve: '产出指标体系文档和A/B测试设计方案' },
    { category: '产品', requirement: '原型设计：能用Figma设计核心交互原型', weight: 'medium', howToProve: '产出Figma原型链接，含关键页面流转' },
    { category: '业务', requirement: 'AI场景落地：能把AI能力嵌入现有业务流程解决真实痛点', weight: 'high', howToProve: '实战项目需选择真实业务场景，非虚构概念' },
    { category: '业务', requirement: 'ROI量化：能用数据证明AI功能带来的业务价值', weight: 'medium', howToProve: '产出ROI计算文档，含效果预测和成本对比' },
    { category: '软技能', requirement: '技术沟通：能和算法/开发团队评估技术可行性和成本', weight: 'medium', howToProve: '面试模拟中展示技术理解，能讨论微调vs Prompt的取舍' },
    { category: '软技能', requirement: '路演表达：能用结构化方式讲解AI产品方案', weight: 'low', howToProve: '产出路演稿并完成模拟评审' },
  ],
  'AI应用开发工程师': [
    { category: '技术', requirement: '前端基础：HTML/CSS/JS能独立完成交互界面', weight: 'high', howToProve: 'GitHub仓库有可运行的对话界面' },
    { category: '技术', requirement: '大模型API集成：能调用OpenAI/通义千问接口并处理响应', weight: 'high', howToProve: '代码中有完整API调用，含鉴权和错误处理' },
    { category: '技术', requirement: '流式输出：能用SSE实现打字机效果', weight: 'high', howToProve: 'Demo中AI回复逐字显示，网络中断有容错' },
    { category: '技术', requirement: 'Prompt工程：理解Few-shot/CoT等技巧', weight: 'medium', howToProve: '产出Prompt模板库，含场景对比' },
    { category: '技术', requirement: '状态管理：能实现多轮对话上下文和数据持久化', weight: 'high', howToProve: 'Demo支持多会话切换，刷新不丢失历史' },
    { category: '技术', requirement: '工作流自动化：能搭建AI信息提取/处理工作流', weight: 'medium', howToProve: '产出工作流Demo，含输入→AI处理→结构化输出' },
    { category: '技术', requirement: '部署上线：能把项目部署到Vercel/Netlify并配置域名', weight: 'high', howToProve: '提供线上可访问的Demo链接' },
    { category: '工程', requirement: '代码规范：用Git管理版本，有清晰的提交历史', weight: 'medium', howToProve: 'GitHub仓库有多次提交，每次对应一个功能' },
    { category: '工程', requirement: '文档能力：能编写README和API文档', weight: 'medium', howToProve: '仓库有完整README和API文档' },
    { category: '工程', requirement: '调试排错：能独立定位和解决前端/API问题', weight: 'low', howToProve: '面试中能讲解踩坑过程和解决方案' },
  ],
  '商业分析师': [
    { category: '技术', requirement: 'SQL能力：能写复杂查询（JOIN/窗口函数/子查询）', weight: 'high', howToProve: '产出SQL练习记录，含10+道实战题' },
    { category: '技术', requirement: 'Python分析：能用pandas处理数据并生成可视化', weight: 'high', howToProve: 'Jupyter Notebook或代码仓库有完整分析' },
    { category: '技术', requirement: 'BI工具：能使用Tableau/Power BI搭建看板', weight: 'high', howToProve: '产出看板截图或在线链接' },
    { category: '分析', requirement: '漏斗分析：能完成用户行为漏斗并定位流失环节', weight: 'high', howToProve: '产出漏斗分析报告，含转化率和优化建议' },
    { category: '分析', requirement: '用户分群：能用RFM或聚类方法做用户分层', weight: 'high', howToProve: '产出分群报告，含各群特征和策略' },
    { category: '分析', requirement: 'A/B测试：能设计实验并解读显著性结果', weight: 'medium', howToProve: '产出A/B测试分析报告，含统计检验' },
    { category: '分析', requirement: '指标体系：能用OSM模型搭建业务指标体系', weight: 'medium', howToProve: '产出指标体系文档，含3层指标定义' },
    { category: '业务', requirement: '归因分析：能做多触点归因并量化渠道贡献', weight: 'medium', howToProve: '产出归因分析报告，含渠道贡献度' },
    { category: '业务', requirement: '结论表达：能把分析结果转化为可执行的业务建议', weight: 'high', howToProve: '分析报告含明确的行动建议，不只是数据罗列' },
    { category: '软技能', requirement: '汇报能力：能用PPT清晰呈现分析结论', weight: 'low', howToProve: '产出汇报PPT，逻辑清晰重点突出' },
  ],
  '增长策略师': [
    { category: '方法论', requirement: 'AARRR模型：理解增长全链路并能定位增长杠杆', weight: 'high', howToProve: '产出增长策略拆解，含各环节分析' },
    { category: '实操', requirement: '渠道投放：能在巨量引擎/腾讯广告上实操投放', weight: 'high', howToProve: '产出投放计划和复盘（可用模拟数据）' },
    { category: '实操', requirement: '内容策略：能制定选题矩阵和发布节奏', weight: 'high', howToProve: '产出内容策略方案，含日历和效果指标' },
    { category: '分析', requirement: '增长实验：能设计并解读A/B测试结果', weight: 'high', howToProve: '产出实验报告，含假设、执行和结论' },
    { category: '分析', requirement: '留存分析：能用同期群分析定位留存问题', weight: 'medium', howToProve: '产出留存分析报告，含曲线和优化建议' },
    { category: '实操', requirement: '裂变机制：能设计裂变活动并计算K因子', weight: 'medium', howToProve: '产出裂变方案，含机制设计和效果预估' },
    { category: '业务', requirement: '数据驱动：能用数据指导策略调整而非凭感觉', weight: 'high', howToProve: '每个策略方案都含数据支撑和效果指标' },
    { category: '业务', requirement: '复盘能力：能从实验中提炼可复用的增长策略', weight: 'medium', howToProve: '产出阶段复盘文档，含策略评估和迭代' },
    { category: '软技能', requirement: '跨团队协作：能和产品/设计/开发沟通增长需求', weight: 'low', howToProve: '面试模拟中展示需求沟通能力' },
    { category: '软技能', requirement: '数据看板：能搭建增长数据监控看板', weight: 'medium', howToProve: '产出看板设计，含核心增长指标' },
  ],
  'AI解决方案顾问': [
    { category: '行业', requirement: 'AI行业认知：理解AI产业链、主要玩家和技术趋势', weight: 'high', howToProve: '产出行业全景图，含产业链和趋势分析' },
    { category: '行业', requirement: 'ToB业务理解：理解企业采购决策链和解决方案销售流程', weight: 'high', howToProve: '产出ToB销售流程拆解，含决策链分析' },
    { category: '方案', requirement: '需求洞察：能从客户场景中识别AI赋能机会', weight: 'high', howToProve: '产出客户场景分析，含痛点识别和AI赋能点' },
    { category: '方案', requirement: '方案设计：能设计完整AI解决方案架构', weight: 'high', howToProve: '产出方案架构文档，含模块设计和技术选型' },
    { category: '方案', requirement: '价值量化：能用ROI模型量化方案的业务价值', weight: 'high', howToProve: '产出价值链模型，含ROI计算和收益预测' },
    { category: '交付', requirement: '项目管理：能编写交付文档并管理里程碑', weight: 'medium', howToProve: '产出交付文档，含范围、里程碑和验收标准' },
    { category: '交付', requirement: '客户沟通：能模拟客户提案并处理异议', weight: 'high', howToProve: '完成模拟提案记录，含问答和改进' },
    { category: '软技能', requirement: '招投标流程：理解ToB项目招投标基本流程', weight: 'medium', howToProve: '产出招投标流程笔记，含关键节点' },
    { category: '软技能', requirement: '路演表达：能用结构化方式呈现方案价值', weight: 'medium', howToProve: '产出路演稿并完成模拟提案' },
    { category: '软技能', requirement: '行业案例库：能积累并调用行业AI应用案例', weight: 'low', howToProve: '产出3-5个行业案例拆解' },
  ],
};

/* -------- 岗位能力模型 --------
   每个岗位家族包含：
   - skills: 6 维能力雷达（当前/目标）
   - phases: 4 阶段冲刺计划
   - scenes: 适用场景
   - levels: 目标级别
   - outputs: 可展示成果清单
   - keywords: 简历能力关键词
*/
const RoleModels = {
  'AI产品经理': {
    skills: [
      { name: '需求分析', current: 45, target: 85 },
      { name: '产品思维', current: 30, target: 80 },
      { name: 'AI技术理解', current: 25, target: 75 },
      { name: '数据驱动', current: 35, target: 78 },
      { name: '原型设计', current: 55, target: 72 },
      { name: '路演表达', current: 40, target: 80 },
    ],
    phases: [
      { name: '认知筑基', desc: '建立AI产品经理核心认知与竞品视野', days: '第 1-7 天' },
      { name: '能力构建', desc: '训练需求分析与数据驱动决策能力', days: '第 8-16 天' },
      { name: '实战输出', desc: '完成完整AI产品分析项目与原型', days: '第 17-25 天' },
      { name: '求职冲刺', desc: '简历优化、路演稿打磨与面试模拟', days: '第 26-30 天' },
    ],
    scenes: '求职 / 转岗 / 作品集 / 面试冲刺',
    levels: '实习 / 校招 / 转岗',
    outputs: '竞品分析表 · PRD文档 · 交互原型 · 指标体系 · 路演稿',
    keywords: '需求分析 · PRD撰写 · 竞品分析 · 用户画像 · 数据指标 · A/B测试 · 原型设计 · AI产品思维 · 路演表达',
  },
  'AI应用开发工程师': {
    skills: [
      { name: 'HTML/CSS', current: 55, target: 80 },
      { name: 'JavaScript', current: 35, target: 82 },
      { name: 'API集成', current: 25, target: 78 },
      { name: '工作流编排', current: 15, target: 72 },
      { name: '调试排错', current: 30, target: 75 },
      { name: '部署运维', current: 10, target: 68 },
    ],
    phases: [
      { name: '基础夯实', desc: '巩固前端基础与API调用能力', days: '第 1-7 天' },
      { name: '能力构建', desc: '掌握AI API集成与工作流自动化', days: '第 8-16 天' },
      { name: '实战输出', desc: '独立完成AI小工具Demo并部署', days: '第 17-25 天' },
      { name: '求职冲刺', desc: '项目包装、简历优化与面试模拟', days: '第 26-30 天' },
    ],
    scenes: '求职 / 转岗 / 作品集 / 面试冲刺',
    levels: '实习 / 校招 / 1-3年 / 转岗',
    outputs: '小工具Demo · 工作流自动化脚本 · API接入文档 · 部署上线项目',
    keywords: 'HTML/CSS · JavaScript · AI API集成 · 工作流自动化 · 前端工程化 · 调试排错 · 部署运维 · 项目Demo',
  },
  '商业分析师': {
    skills: [
      { name: 'SQL能力', current: 45, target: 85 },
      { name: '统计思维', current: 35, target: 80 },
      { name: '数据可视化', current: 30, target: 75 },
      { name: '业务理解', current: 25, target: 78 },
      { name: 'Python分析', current: 40, target: 80 },
      { name: '报告表达', current: 45, target: 78 },
    ],
    phases: [
      { name: '工具筑基', desc: '巩固SQL与Python分析基础', days: '第 1-7 天' },
      { name: '分析方法', desc: '掌握漏斗分析、分群与看板设计', days: '第 8-16 天' },
      { name: '业务实战', desc: '完成完整商业分析报告与看板', days: '第 17-25 天' },
      { name: '求职冲刺', desc: '简历优化、面试模拟与结论表达', days: '第 26-30 天' },
    ],
    scenes: '求职 / 转岗 / 作品集 / 面试冲刺',
    levels: '实习 / 校招 / 1-3年 / 转岗',
    outputs: '漏斗分析报告 · 用户分群模型 · 数据看板 · 结论性分析报告',
    keywords: 'SQL · Python · 漏斗分析 · 用户分群 · 数据可视化 · 统计思维 · 业务理解 · 分析报告',
  },
  '增长策略师': {
    skills: [
      { name: '内容运营', current: 45, target: 80 },
      { name: '用户运营', current: 35, target: 78 },
      { name: '活动策划', current: 30, target: 75 },
      { name: '数据分析', current: 25, target: 72 },
      { name: '文案能力', current: 50, target: 78 },
      { name: '增长思维', current: 20, target: 75 },
    ],
    phases: [
      { name: '增长认知', desc: '建立增长全貌与核心方法论', days: '第 1-7 天' },
      { name: '能力构建', desc: '系统训练渠道、内容与实验能力', days: '第 8-16 天' },
      { name: '实战输出', desc: '完成完整增长策略方案与实验报告', days: '第 17-25 天' },
      { name: '求职冲刺', desc: '简历优化、面试模拟与复盘表达', days: '第 26-30 天' },
    ],
    scenes: '求职 / 转岗 / 作品集 / 面试冲刺',
    levels: '实习 / 校招 / 1-3年 / 转岗',
    outputs: '渠道策略文档 · 内容策略方案 · 增长实验报告 · 阶段复盘文档',
    keywords: '内容运营 · 用户运营 · 渠道增长 · 增长实验 · 数据分析 · 文案能力 · A/B测试 · 增长策略',
  },
  'AI解决方案顾问': {
    skills: [
      { name: '需求洞察', current: 35, target: 82 },
      { name: '方案设计', current: 25, target: 80 },
      { name: '客户沟通', current: 40, target: 78 },
      { name: '价值分析', current: 20, target: 75 },
      { name: '项目管理', current: 30, target: 72 },
      { name: '行业理解', current: 15, target: 78 },
    ],
    phases: [
      { name: '行业认知', desc: '建立AI行业认知与ToB业务框架', days: '第 1-7 天' },
      { name: '能力构建', desc: '训练方案拆解与客户场景分析能力', days: '第 8-16 天' },
      { name: '实战输出', desc: '完成完整AI解决方案与交付文档', days: '第 17-25 天' },
      { name: '求职冲刺', desc: '简历优化、面试模拟与价值表达', days: '第 26-30 天' },
    ],
    scenes: '求职 / 转岗 / 作品集 / 面试冲刺',
    levels: '实习 / 校招 / 1-3年 / 转岗',
    outputs: '方案拆解文档 · 客户场景分析 · 价值链模型 · 交付文档',
    keywords: '需求洞察 · 方案设计 · 客户沟通 · 价值分析 · 项目管理 · AI行业理解 · ToB解决方案 · 交付文档',
  },
};

/* -------- 任务模板库（每个岗位对齐可展示成果） -------- */
const TaskTemplates = {
  'AI产品经理': [
    { day: 1, title: '拆解3个AI产品的核心功能流程', type: 'learn', time: 45, template: 'competitor',
      desc: '选择3个主流AI产品，梳理核心使用流程、用户痛点和差异化卖点。',
      steps: [
        '打开 ChatGPT、Kimi、通义千问 3个AI产品，各完成一次完整对话体验',
        '用表格记录每个产品的：入口→核心功能→输出结果 的完整流程',
        '标注每个产品的3个用户痛点和2个差异化卖点',
        '整理成1页纸的竞品对比表，包含功能矩阵'
      ],
      tools: ['Notion/飞书文档', 'ProcessOn（流程图）', '竞品分析模板表'],
      checklist: [
        '是否覆盖了3个AI产品的完整体验流程？',
        '是否标注了每个产品的用户痛点？',
        '是否整理了差异化卖点对比？',
        '产出是否为结构化表格而非零散笔记？'
      ],
      output: { type: '竞品分析表', title: 'AI产品竞品分析', desc: '3款AI产品核心流程、痛点与差异化对比，含功能矩阵和优劣评估。', banner: 'b1', icon: '📊' } },
    { day: 2, title: '学习PRD文档标准结构', type: 'learn', time: 40, template: 'prd',
      desc: '阅读2篇高质量PRD案例，总结核心模块：背景、需求描述、功能详述、交互流程、数据指标。',
      steps: [
        '在人人都是产品经理或PMcaff找2篇完整PRD案例下载/收藏',
        '用表格逐行拆解每篇PRD的章节结构和内容要点',
        '对比2篇PRD，总结背景/需求描述/功能详述/交互流程/数据指标5大模块的写作规范',
        '整理出一份可复用的PRD模板（含字段说明和避坑指南）'
      ],
      tools: ['人人都是产品经理（PRD案例库）', 'Notion/飞书文档', 'PMcaff社区'],
      checklist: [
        '是否拆解了至少2篇高质量PRD案例？',
        '是否覆盖了背景/需求/功能/交互/指标5大模块？',
        '是否总结了每个模块的写作要点和避坑指南？',
        '是否产出了一份可复用的PRD模板？'
      ],
      output: { type: '学习笔记', title: 'PRD结构笔记', desc: 'PRD标准结构拆解，含各模块写作要点和避坑指南。', banner: 'b1', icon: '📝' } },
    { day: 3, title: '撰写一个AI功能的完整PRD', type: 'output', time: 60, template: 'prd-write',
      desc: '选择一个AI对话功能，按标准PRD结构撰写完整产品需求文档。',
      steps: [
        '选定一个AI对话功能场景（如AI客服/AI写作助手）并撰写需求背景',
        '在PRD模板中填写功能详述：功能点、输入输出、规则说明',
        '用ProcessOn绘制核心交互流程图（至少3个主流程）',
        '定义3-5个数据指标及其计算口径，完成最终PRD文档'
      ],
      tools: ['Notion/飞书文档', 'ProcessOn（交互流程图）', 'PRD模板（Day2产出）'],
      checklist: [
        '是否撰写了完整的需求背景和目标？',
        '是否详述了至少3个功能点及输入输出？',
        '是否绘制了核心交互流程图？',
        '是否定义了至少3个数据指标及计算口径？'
      ],
      output: { type: 'PRD文档', title: 'AI对话功能PRD', desc: '完整PRD，含需求背景、功能详述、交互流程图和数据指标定义。', banner: 'b1', icon: '📄' } },
    { day: 4, title: '大模型选型与能力边界分析', type: 'learn', time: 45, template: 'note',
      desc: '对比GPT-4/Llama/通义千问的能力边界，产出模型选型对比表。',
      steps: [
        '访问各模型官网阅读能力文档，了解GPT-4/Llama/通义千问的定位与擅长场景',
        '用同一Prompt测试3个模型，对比输出质量、响应速度和稳定性',
        '制作能力矩阵：标注每个模型擅长/不擅长/成本的对比',
        '总结不同业务场景的模型选型建议，产出选型对比表'
      ],
      tools: ['OpenAI Platform', '通义千问DashScope', 'Llama官网', 'Notion'],
      checklist: [
        '是否对比了3个以上模型？',
        '是否标注了每个模型的能力边界？',
        '是否产出选型矩阵？',
        '是否给出场景选型建议？'
      ],
      output: { type: '竞品分析表', title: '大模型选型对比报告', desc: '大模型选型对比报告，含能力矩阵和场景选型建议。', banner: 'b1', icon: '🧠' } },
    { day: 5, title: '设计AI功能交互原型', type: 'practice', time: 60, template: 'prototype',
      desc: '用Figma设计一个AI写作助手的交互原型，含核心页面流转和交互细节。',
      steps: [
        '在Figma新建文件，设计AI写作助手的3个核心页面（首页/编辑页/结果页）',
        '用Figma的Prototype功能连线，绘制3个页面的流转关系',
        '在每个页面上标注交互细节（按钮点击/输入反馈/加载状态）',
        '添加设计说明文档，解释关键交互逻辑'
      ],
      tools: ['Figma', 'ProcessOn（页面流转图）', '竞品截图参考'],
      checklist: [
        '是否设计了3个核心页面？',
        '是否绘制了页面间的流转关系？',
        '是否标注了交互细节（点击/输入/加载状态）？',
        '是否添加了设计说明文档？'
      ],
      output: { type: '交互原型', title: 'AI写作助手原型', desc: 'AI写作助手核心交互原型，含3个关键页面和交互说明。', banner: 'b3', icon: '🎨' } },
    { day: 6, title: '拆解一个AI产品的数据指标体系', type: 'learn', time: 45, template: 'metrics',
      desc: '选择一个AI产品，梳理北极星指标、核心业务指标和用户体验指标。',
      steps: [
        '选定一个AI产品（如Kimi/豆包）并定位其核心业务目标',
        '推导出1个北极星指标并说明选择理由',
        '梳理5-8个核心业务指标（如日活/留存/对话轮数）及计算口径',
        '补充3-5个用户体验指标（如响应时长/满意度）并整理成指标树图'
      ],
      tools: ['Notion/飞书文档', 'ProcessOn（指标树）', 'GrowingIO/神策（指标参考）'],
      checklist: [
        '是否明确了1个北极星指标及选择理由？',
        '是否梳理了至少5个核心业务指标？',
        '是否说明了每个指标的计算口径？',
        '是否补充了用户体验指标并画出指标树？'
      ],
      output: { type: '指标设计', title: 'AI产品指标体系', desc: '完整数据指标体系拆解，含指标定义和计算逻辑。', banner: 'b2', icon: '📈' } },
    { day: 7, title: '第一周认知复盘', type: 'output', time: 40, template: 'review',
      desc: '整理AI产品经理3个核心能力，评估当前水平，制定下周重点。',
      steps: [
        '列出AI产品经理3个核心能力（如需求洞察/产品设计/数据驱动）',
        '对每项能力按1-5分打分并写出当前水平的具体表现',
        '分析每项能力的优势和短板，找出最需提升的1项',
        '制定下周3条具体提升行动（含练习方式和验收标准）'
      ],
      tools: ['Notion/飞书文档', 'XMind/思维导图', '复盘模板'],
      checklist: [
        '是否梳理了3个核心能力？',
        '是否对每项能力做了量化自评（1-5分）？',
        '是否明确了优势与短板？',
        '是否制定了下周3条具体提升行动？'
      ],
      output: { type: '复盘文档', title: '第一周认知复盘', desc: '核心能力框架与自我评估，含能力提升优先级。', banner: 'b1', icon: '✅' } },
    { day: 8, title: '设计AI场景的Prompt策略', type: 'practice', time: 50, template: 'interview',
      desc: '针对一个AI客服场景，设计分层Prompt策略解决实际业务问题。',
      steps: [
        '选择一个真实的AI客服场景，梳理常规咨询、复杂投诉、个性化需求3类业务问题',
        '为3类问题分别设计分层Prompt模板，定义角色、任务和输出格式',
        '用Few-shot方法为每个Prompt补充示例样本，优化输出效果',
        '对比不同Prompt的输出效果，量化准确率提升并总结优化经验'
      ],
      tools: ['OpenAI Playground', 'Notion', 'Prompt工程指南'],
      checklist: [
        '是否针对真实业务场景？',
        '是否有分层策略？',
        '是否用Few-shot优化？',
        '是否量化了效果对比？'
      ],
      output: { type: '方案文档', title: 'Prompt策略文档', desc: 'AI客服场景分层Prompt策略，含Few-shot优化和效果对比。', banner: 'b2', icon: '🗣️' } },
    { day: 9, title: '学习需求优先级排序方法', type: 'learn', time: 40, template: 'note',
      desc: '学习RICE、KANO等排序方法并用真实案例练习。',
      steps: [
        '查阅资料学习RICE模型的4个维度（触达/影响/信心/工作量）及评分标准',
        '学习KANO模型的5种需求类型（基本/期望/兴奋/无差异/反向）',
        '用RICE对1个AI产品的5个功能做评分排序练习',
        '对比RICE与KANO的适用场景，整理方法论笔记'
      ],
      tools: ['人人都是产品经理（方法论文章）', 'Notion/飞书文档', 'Excel/飞书表格'],
      checklist: [
        '是否掌握了RICE的4个评分维度？',
        '是否理解了KANO的5种需求类型？',
        '是否用RICE对至少5个功能做了排序练习？',
        '是否对比了两种方法的适用场景？'
      ],
      output: { type: '学习笔记', title: '需求优先级方法论', desc: 'RICE和KANO模型笔记，含实操案例。', banner: 'b1', icon: '📚' } },
    { day: 10, title: '完成AI产品需求优先级排序', type: 'output', time: 55, template: 'rice',
      desc: '用RICE方法对AI产品功能列表做优先级排序并说明理由。',
      steps: [
        '列出AI产品至少8个候选功能点并简要描述',
        '对每个功能按RICE四维度打分（1-10分）并计算总分',
        '按总分排序并撰写每个功能的排序理由（含风险说明）',
        '制作可视化排序表并标注Top3优先开发项'
      ],
      tools: ['Excel/飞书表格', 'Notion/飞书文档', 'RICE评分模板'],
      checklist: [
        '是否列出了至少8个候选功能点？',
        '是否对每个功能做了RICE四维度评分？',
        '是否撰写了排序理由及风险说明？',
        '是否产出了可视化排序表并标注Top3？'
      ],
      output: { type: 'PRD文档', title: '需求优先级排序', desc: '基于RICE的优先级排序表，含评分明细和排序理由。', banner: 'b2', icon: '🔢' } },
    { day: 11, title: '学习A/B测试设计方法', type: 'learn', time: 45, template: 'note',
      desc: '学习A/B测试核心原理、实验设计和结果解读。',
      steps: [
        '查阅资料学习A/B测试核心原理（假设检验、对照组/实验组）',
        '学习样本量计算方法（使用在线计算器实操1次）',
        '学习显著性判断（p值、置信区间）及常见误区',
        '整理完整的A/B测试实验设计流程清单'
      ],
      tools: ['Evolve/Optimizely（A/B测试文档）', '在线样本量计算器', 'Notion/飞书文档'],
      checklist: [
        '是否理解了A/B测试的核心原理（假设检验）？',
        '是否实操计算过1次样本量？',
        '是否掌握了显著性判断（p值）？',
        '是否整理了完整实验设计流程清单？'
      ],
      output: { type: '学习笔记', title: 'A/B测试方法论', desc: 'A/B测试设计笔记，含样本量计算和显著性判断。', banner: 'b1', icon: '🧪' } },
    { day: 12, title: '设计AI功能的A/B测试方案', type: 'output', time: 50, template: 'abtest',
      desc: '为AI推荐功能设计完整A/B测试方案，含假设、指标、样本量。',
      steps: [
        '选定一个AI推荐功能场景并撰写明确的实验假设',
        '定义1个核心指标和2-3个护栏指标（防止负面影响）',
        '用在线计算器计算所需样本量并确定实验周期',
        '设计实验分组方案和流量分配，输出完整实验设计文档'
      ],
      tools: ['在线样本量计算器', 'Notion/飞书文档', 'ProcessOn（实验流程图）'],
      checklist: [
        '是否撰写了明确的实验假设？',
        '是否定义了核心指标和护栏指标？',
        '是否计算了样本量并确定实验周期？',
        '是否设计了实验分组方案？'
      ],
      output: { type: '指标设计', title: 'A/B测试设计方案', desc: 'AI推荐功能A/B测试完整方案，含假设、指标定义和解读计划。', banner: 'b2', icon: '🔬' } },
    { day: 13, title: '设计AI产品数据看板', type: 'practice', time: 55, template: 'dashboard',
      desc: '设计AI产品核心数据看板，选择关键指标并设计布局。',
      steps: [
        '选定AI产品核心场景并确定8个关键看板指标',
        '在Figma中设计看板布局（顶部KPI/中部趋势图/底部明细）',
        '为每个指标选择合适的图表类型（折线/柱状/漏斗等）',
        '撰写每个指标的业务含义说明和预警阈值'
      ],
      tools: ['Figma', 'Tableau/PowerBI（图表参考）', 'Notion/飞书文档'],
      checklist: [
        '是否选择了8个关键看板指标？',
        '是否设计了合理的看板布局？',
        '是否为每个指标选了合适的图表类型？',
        '是否说明了指标业务含义和预警阈值？'
      ],
      output: { type: '指标设计', title: '产品数据看板', desc: '核心数据看板设计，含8个关键指标和可视化方案。', banner: 'b3', icon: '📊' } },
    { day: 14, title: '第二周能力复盘', type: 'output', time: 40, template: 'review',
      desc: '回顾需求分析和数据驱动训练，总结提升和待加强项。',
      steps: [
        '回顾本周所有产出（访谈/RICE/A/B测试/看板）并打分评估',
        '总结本周3项能力提升并写出具体进步点',
        '列出2-3个待加强项并分析原因',
        '制定下周实战项目的重点提升计划'
      ],
      tools: ['Notion/飞书文档', '复盘模板', '本周产出文档'],
      checklist: [
        '是否回顾了本周所有产出并打分？',
        '是否总结了至少3项能力提升？',
        '是否列出了待加强项及原因？',
        '是否制定了下周提升计划？'
      ],
      output: { type: '复盘文档', title: '第二周能力复盘', desc: '需求分析与数据驱动复盘，含自我评估和下周重点。', banner: 'b1', icon: '📋' } },
    { day: 15, title: '选定实战项目方向', type: 'practice', time: 40, template: 'project-plan',
      desc: '选定AI产品方向，明确项目目标、用户场景和交付物。',
      steps: [
        '头脑风暴3个AI产品方向并评估每个的可行性和个人兴趣',
        '选定1个方向并撰写项目背景和目标（含成功标准）',
        '明确2-3类目标用户及其核心使用场景',
        '列出项目交付物清单（竞品/画像/PRD/原型/指标）'
      ],
      tools: ['Notion/飞书文档', 'XMind/思维导图', '市场调研报告'],
      checklist: [
        '是否评估了至少3个候选方向？',
        '是否撰写了项目背景和成功标准？',
        '是否明确了2-3类目标用户及场景？',
        '是否列出了清晰的交付物清单？'
      ],
      output: { type: '项目计划', title: '实战项目计划书', desc: 'AI产品实战项目计划，含背景、目标用户、场景和交付物。', banner: 'b1', icon: '🎯' } },
    { day: 16, title: '完成实战项目AI场景落地分析', type: 'output', time: 60, template: 'competitor-deep',
      desc: '选择一个真实业务场景（如电商客服/内容审核/智能推荐），分析AI如何嵌入现有流程解决真实痛点。',
      steps: [
        '选择一个真实业务场景而非虚构概念，梳理现有业务流程',
        '标注现有流程的关键痛点，识别AI赋能点和预期效果',
        '设计AI嵌入方案，标注赋能点和预期效果提升',
        '计算ROI（效果预测vs成本），产出场景落地分析报告'
      ],
      tools: ['Notion', 'ProcessOn', '行业调研报告'],
      checklist: [
        '场景是否真实而非虚构？',
        '是否分析了现有流程痛点？',
        '是否标注了AI赋能点？',
        '是否计算了ROI？'
      ],
      output: { type: '分析报告', title: 'AI场景落地分析', desc: '真实业务场景AI落地分析，含流程痛点、AI赋能点和ROI测算。', banner: 'b2', icon: '🔍' } },
    { day: 17, title: '完成实战项目用户画像', type: 'output', time: 55, template: 'persona',
      desc: '设计2-3个核心用户画像，含人群特征、使用场景和核心需求。',
      steps: [
        '基于Day8访谈经验设计2-3个核心用户画像',
        '为每个画像填写人口统计特征（年龄/职业/收入）和行为特征',
        '梳理每个画像的2-3个核心使用场景',
        '提炼每个画像的3个核心需求痛点并按优先级排序'
      ],
      tools: ['Figma（画像模板）', 'Notion/飞书文档', '用户调研数据'],
      checklist: [
        '是否设计了2-3个用户画像？',
        '是否填写了人口统计和行为特征？',
        '是否梳理了每个画像的使用场景？',
        '是否提炼了核心需求痛点并排序？'
      ],
      output: { type: '调研报告', title: '用户画像分析', desc: '3个核心用户画像，含人口统计、行为特征和需求痛点。', banner: 'b2', icon: '👤' } },
    { day: 18, title: '撰写实战项目PRD', type: 'output', time: 65, template: 'prd-full',
      desc: '撰写PRD核心模块：需求背景、功能详述、交互流程。',
      steps: [
        '撰写需求背景：项目缘起、目标用户、业务目标',
        '详述至少5个核心功能点，包含输入/处理/输出说明',
        '用ProcessOn绘制3-5个核心交互流程图',
        '定义3-5个数据指标及计算口径，完成PRD文档'
      ],
      tools: ['Notion/飞书文档', 'ProcessOn（流程图）', 'PRD模板'],
      checklist: [
        '是否撰写了完整需求背景？',
        '是否详述了至少5个功能点？',
        '是否绘制了3-5个交互流程图？',
        '是否定义了数据指标及计算口径？'
      ],
      output: { type: 'PRD文档', title: '实战项目PRD', desc: '完整PRD文档，含需求背景、功能详述和交互流程图。', banner: 'b1', icon: '📄' } },
    { day: 19, title: '设计实战项目原型', type: 'practice', time: 65, template: 'prototype-full',
      desc: '设计核心页面原型，包含主要功能流程的页面流转。',
      steps: [
        '在Figma设计5个核心页面（首页/核心功能页/列表页/详情页/设置页）',
        '用Prototype功能连线绘制完整页面流转',
        '标注每个页面的交互细节（按钮/输入/状态切换）',
        '添加设计说明文档，解释关键交互逻辑和设计理由'
      ],
      tools: ['Figma', 'ProcessOn（页面流转图）', '竞品截图参考'],
      checklist: [
        '是否设计了5个核心页面？',
        '是否绘制了完整页面流转？',
        '是否标注了交互细节？',
        '是否添加了设计说明文档？'
      ],
      output: { type: '交互原型', title: '实战项目原型', desc: '核心原型设计，含5个关键页面和交互说明。', banner: 'b3', icon: '🎨' } },
    { day: 20, title: '完成实战项目ROI量化分析', type: 'output', time: 50, template: 'metrics-full',
      desc: '为AI功能计算ROI，量化业务价值，含成本对比和效果预测。',
      steps: [
        '列出AI功能的开发和运营成本项，估算各项投入',
        '预测效果提升（如效率提升X%、准确率提升Y%），量化业务价值',
        '计算ROI和回收周期，明确投入产出比',
        '产出ROI分析文档，含成本对比和效果预测'
      ],
      tools: ['Excel/Google Sheets', 'Notion'],
      checklist: [
        '是否列出了成本项？',
        '是否预测了效果提升？',
        '是否计算了ROI？',
        '是否有回收周期分析？'
      ],
      output: { type: '指标设计', title: 'AI功能ROI分析', desc: 'AI功能ROI量化分析，含成本对比、效果预测和回收周期。', banner: 'b2', icon: '📈' } },
    { day: 21, title: '实战中期复盘', type: 'output', time: 40, template: 'review',
      desc: '回顾项目进展，检查交付物完整度，调整后续计划。',
      steps: [
        '对照Day15交付物清单逐项检查完成度和质量',
        '评估每个交付物的质量并打分（1-5分）',
        '识别3个关键问题并分析根因',
        '调整后续10天计划并标注重点优先级'
      ],
      tools: ['Notion/飞书文档', '复盘模板', '项目计划表'],
      checklist: [
        '是否逐项检查了交付物完整度？',
        '是否对每个交付物做了质量评分？',
        '是否识别了关键问题及根因？',
        '是否调整了后续计划？'
      ],
      output: { type: '复盘文档', title: '实战中期复盘', desc: '中期复盘，含进度检查、质量评估和计划调整。', banner: 'b1', icon: '✅' } },
    { day: 22, title: '完善PRD完整版', type: 'output', time: 65, template: 'prd-polish',
      desc: '补充异常流程、边界条件和数据埋点定义。',
      steps: [
        '补充至少5个异常流程的处理方案（网络失败/超时/空结果等）',
        '定义边界条件（输入长度/并发限制/权限限制）',
        '设计核心功能的数据埋点清单（事件名/参数/触发时机）',
        '完善非功能需求（性能/安全/兼容性）'
      ],
      tools: ['Notion/飞书文档', 'ProcessOn（异常流程图）', '埋点设计模板'],
      checklist: [
        '是否补充了至少5个异常流程处理？',
        '是否定义了边界条件？',
        '是否设计了数据埋点清单？',
        '是否完善了非功能需求？'
      ],
      output: { type: 'PRD文档', title: 'PRD完整版', desc: 'PRD完整版，含异常处理、边界条件和埋点方案。', banner: 'b1', icon: '📄' } },
    { day: 23, title: '制作项目路演稿', type: 'output', time: 55, template: 'deck',
      desc: '将实战项目整理为路演稿，突出项目价值和产品思考。',
      steps: [
        '梳理路演结构：背景痛点/解决方案/产品设计/数据指标/规划',
        '在PPT中制作10-15页路演稿并突出项目价值',
        '从Figma导出原型截图插入PPT',
        '为每页撰写讲解口播稿并标注时长'
      ],
      tools: ['PowerPoint/Keynote', 'Figma（截图导出）', 'Notion/飞书文档（口播稿）'],
      checklist: [
        '是否梳理了完整路演结构？',
        '是否制作了10-15页PPT？',
        '是否插入了原型截图？',
        '是否为每页撰写了口播稿？'
      ],
      output: { type: '路演稿', title: '项目路演稿', desc: '路演文档，含项目背景、解决方案、产品设计和数据指标。', banner: 'b3', icon: '🎬' } },
    { day: 24, title: '模拟产品评审', type: 'practice', time: 50, template: 'review-sim',
      desc: '模拟产品评审会，练习讲解项目思路、回答质疑。',
      steps: [
        '找1-2位朋友扮演评审官，用腾讯会议开启模拟评审',
        '用路演稿完整讲解项目思路（控制在10分钟内）',
        '回答评审官的至少5个质疑提问并录音',
        '整理问答记录并制定3条改进计划'
      ],
      tools: ['腾讯会议（录音）', '路演PPT', 'Notion/飞书文档'],
      checklist: [
        '是否完成了完整模拟评审？',
        '是否在10分钟内完成项目讲解？',
        '是否回答了至少5个质疑提问？',
        '是否制定了改进计划？'
      ],
      output: { type: '复盘文档', title: '模拟评审记录', desc: '评审完整记录，含讲解要点、问答记录和改进计划。', banner: 'b1', icon: '🎤' } },
    { day: 25, title: '实战项目最终整理', type: 'output', time: 60, template: 'final',
      desc: '将所有产出整理成作品集，确保逻辑清晰、表达专业。',
      steps: [
        '按逻辑顺序整合所有产出（竞品→画像→PRD→原型→指标）',
        '统一所有文档的格式和视觉风格',
        '补全各模块之间的逻辑衔接说明',
        '整理成1份可独立阅读的完整作品集'
      ],
      tools: ['Notion/飞书文档', 'Figma', 'PowerPoint/Keynote'],
      checklist: [
        '是否整合了所有产出物？',
        '是否统一了文档格式和视觉风格？',
        '是否补全了模块间逻辑衔接？',
        '是否形成了1份可独立阅读的作品集？'
      ],
      output: { type: '作品集', title: 'AI产品实战作品集', desc: '完整作品集，含竞品分析、用户画像、PRD、原型和指标。', banner: 'b1', icon: '🏆' } },
    { day: 26, title: '简历项目描述优化', type: 'output', time: 50, template: 'resume',
      desc: '将成果转化为简历项目描述，用STAR法则突出价值。',
      steps: [
        '用STAR法则（情境/任务/行动/结果）重写项目描述',
        '为每个项目量化3-5个成果指标（如提升XX% / 覆盖XX用户）',
        '突出个人具体贡献和负责模块',
        '精简每个项目描述到3-5句话，确保1页内可读'
      ],
      tools: ['Notion/飞书文档', '简历模板', 'STAR法则模板'],
      checklist: [
        '是否用STAR法则重写了描述？',
        '是否量化了3-5个成果指标？',
        '是否突出了个人具体贡献？',
        '是否精简到3-5句话且1页可读？'
      ],
      output: { type: '简历材料', title: '简历项目描述', desc: '基于STAR法则的简历项目描述，突出量化成果。', banner: 'b1', icon: '📄' } },
    { day: 27, title: '面试高频问题练习', type: 'practice', time: 55, template: 'qa-practice',
      desc: '练习AI产品经理面试10个高频问题，整理回答框架。',
      steps: [
        '从面试题库整理10个AI产品经理高频面试题',
        '为每题设计回答框架（如STAR/PREP结构）',
        '对着镜子或录音口述练习每个问题回答',
        '覆盖产品思维类和技术理解类两类问题'
      ],
      tools: ['Notion/飞书文档', '录音工具', '面试题库（牛客/脉脉）'],
      checklist: [
        '是否整理了10个高频问题？',
        '是否为每题设计了回答框架？',
        '是否口述练习并录音复盘？',
        '是否覆盖了产品思维和技术理解两类？'
      ],
      output: { type: '路演稿', title: '面试问答库', desc: '高频问题及回答框架，含产品思维和技术理解类。', banner: 'b2', icon: '💬' } },
    { day: 28, title: '模拟面试实战', type: 'practice', time: 60, template: 'mock',
      desc: '完成完整模拟面试，练习自我介绍、项目讲解和开放题。',
      steps: [
        '找朋友扮演面试官，用腾讯会议开启30分钟完整模拟面试',
        '完成自我介绍（2分钟）+项目讲解（8分钟）+开放题问答',
        '全程录音并逐字复盘回答表现',
        '总结3-5个改进要点并优化答题策略'
      ],
      tools: ['腾讯会议（录音）', '面试题库', 'Notion/飞书文档'],
      checklist: [
        '是否完成了30分钟完整模拟面试？',
        '是否练习了自我介绍和项目讲解？',
        '是否录音并逐字复盘？',
        '是否总结了3-5个改进要点？'
      ],
      output: { type: '路演稿', title: '模拟面试复盘', desc: '模拟面试复盘，含表现评估、改进要点和答题优化。', banner: 'b2', icon: '🎯' } },
    { day: 29, title: '作品集最终打磨', type: 'output', time: 50, template: 'polish',
      desc: '对所有材料做最终打磨，确保专业度和可展示性。',
      steps: [
        '逐项检查作品集所有材料的专业度（措辞/格式/数据）',
        '优化Figma原型和PPT的视觉呈现',
        '补全缺失内容（如缺图/缺数据/缺说明）',
        '确保每个模块可独立展示且整体风格统一'
      ],
      tools: ['Figma', 'PowerPoint/Keynote', 'Notion/飞书文档'],
      checklist: [
        '是否检查了所有材料的专业度？',
        '是否优化了视觉呈现？',
        '是否补全了缺失内容？',
        '是否确保了整体风格统一？'
      ],
      output: { type: '作品集', title: '作品集终版', desc: '打磨后的完整作品集，适合求职展示和面试讲解。', banner: 'b1', icon: '✨' } },
    { day: 30, title: '30天成长总结与求职计划', type: 'output', time: 45, template: 'summary',
      desc: '总结30天成长历程，制定求职行动计划。',
      steps: [
        '总结30天能力提升（按周复盘对比起点和终点水平）',
        '梳理作品集清单并标注每个产出的核心亮点',
        '制定求职行动计划（投递目标/时间节点/渠道）',
        '设定未来30天投递数量目标和备选方案'
      ],
      tools: ['Notion/飞书文档', 'XMind/思维导图', '求职追踪表（Excel）'],
      checklist: [
        '是否总结了能力提升（起点vs终点）？',
        '是否梳理了作品集清单及亮点？',
        '是否制定了求职行动计划？',
        '是否设定了投递数量目标？'
      ],
      output: { type: '总结文档', title: '30天成长总结', desc: '完整成长总结，含能力提升、作品集清单和求职计划。', banner: 'b1', icon: '🏁' } },
  ],

  'AI应用开发工程师': [
    { day: 1, title: '搭建前端开发环境与项目骨架', type: 'practice', time: 45, template: 'default', desc: '安装Node.js和代码编辑器，用Vite创建项目骨架，理解前后端分离架构。',
      steps: [
        '访问 nodejs.org 下载安装 Node.js LTS 版本，在终端运行 node -v 和 npm -v 验证',
        '下载安装 VS Code 编辑器，在扩展市场安装 ES7+ React/Redux Snippets 和 Prettier 插件',
        '在终端运行 npm create vite@latest my-ai-app -- --template vanilla 创建项目',
        '用 VS Code 打开项目目录，查看 index.html、src/ 和 package.json 结构',
        '运行 npm install 后执行 npm run dev，在浏览器访问 localhost:5173'
      ],
      tools: ['Node.js LTS (nodejs.org)', 'VS Code', 'Vite', 'Chrome DevTools'],
      checklist: [
        'node -v 能正常输出版本号？',
        'npm run dev 能启动本地开发服务器？',
        '浏览器能打开 localhost:5173 看到页面？',
        '是否理解了 index.html、src/、package.json 各自的作用？'
      ],
      output: { type: '项目Demo', title: '前端项目骨架', desc: '可运行的前端项目骨架，含目录结构和基础配置。', banner: 'b3', icon: '⚙️' } },
    { day: 2, title: '实现一个AI对话界面', type: 'output', time: 60, template: 'default', desc: '用HTML/CSS/JS实现一个AI对话UI，包含消息列表、输入框和流式输出。',
      steps: [
        '在 index.html 中编写对话界面结构：消息列表容器、输入框和发送按钮',
        '编写 CSS 样式：气泡布局、用户/AI消息区分、滚动条和响应式适配',
        '用 JS 实现发送逻辑：监听按钮点击和回车键，将消息渲染到列表',
        '实现模拟AI回复（用 setTimeout 模拟延迟），先跑通界面交互流程',
        '用 Chrome DevTools 调试布局和检查元素是否正确渲染'
      ],
      tools: ['VS Code', 'Chrome DevTools', 'MDN Web Docs (developer.mozilla.org)'],
      checklist: [
        '输入消息点发送后，消息能正确显示在列表中？',
        '用户消息和AI消息是否有明显视觉区分？',
        '消息列表过多时能正常滚动？',
        '页面在手机宽度下布局是否正常？'
      ],
      output: { type: '项目Demo', title: 'AI对话界面', desc: '可交互的AI对话界面，含流式消息展示和输入交互。', banner: 'b3', icon: '💬' } },
    { day: 3, title: '接入大模型API（OpenAI/通义千问）', type: 'output', time: 55, template: 'default', desc: '注册API Key，实现前端调用大模型接口，完成一次完整对话。',
      steps: [
        '访问 platform.openai.com 或 dashscope.aliyun.com 注册账号并创建 API Key',
        '阅读官方文档的 Chat Completions 接口说明，了解请求参数和响应格式',
        '编写调用函数：用 fetch 调用接口，设置 Authorization 请求头携带 API Key',
        '在对话界面集成调用：用户发送消息后调用接口，将返回结果渲染到界面',
        '添加错误处理：网络超时、API限流、Key无效时给出友好提示'
      ],
      tools: ['OpenAI Platform (platform.openai.com)', '通义千问 DashScope (dashscope.aliyun.com)', 'VS Code', 'Postman'],
      checklist: [
        'API Key 是否已安全保存（未硬编码到公开代码）？',
        '发送消息后能收到大模型的回复？',
        'API调用失败时是否有错误提示？',
        '是否理解了 messages 数组和 role 字段的用法？'
      ],
      output: { type: 'API接入文档', title: '大模型API接入', desc: '完整API接入代码和调用文档，含鉴权、请求和错误处理。', banner: 'b2', icon: '🔌' } },
    { day: 4, title: '学习Prompt工程基础', type: 'learn', time: 40, template: 'note', desc: '学习Prompt设计原则、Few-shot和Chain of Thought技巧。',
      steps: [
        '访问 platform.openai.com/docs/guides/prompt-engineering 阅读官方Prompt工程指南',
        '学习并记录4个核心原则：明确指令、提供参考、拆分复杂任务、给模型思考时间',
        '在对话界面中实测 Few-shot 示例：给2-3个示例让模型学习输出格式',
        '实测 Chain of Thought：让模型"一步步思考"对比直接提问的效果差异',
        '整理一份Prompt模板笔记，记录不同场景的可用模板'
      ],
      tools: ['OpenAI Cookbook (cookbook.openai.com)', 'Prompt工程指南 (promptingguide.ai)', 'VS Code'],
      checklist: [
        '能否说出Prompt工程的3个以上核心原则？',
        'Few-shot和Zero-shot的区别是否理解？',
        '是否实测并对比了不同Prompt的输出效果？',
        '是否整理了可直接复用的Prompt模板？'
      ],
      output: { type: '学习笔记', title: 'Prompt工程笔记', desc: 'Prompt设计方法论笔记，含模板和实战案例。', banner: 'b1', icon: '📝' } },
    { day: 5, title: '实现流式输出与打字机效果', type: 'output', time: 55, template: 'default', desc: '用SSE或WebSocket实现流式响应，前端呈现打字机效果。',
      steps: [
        '查阅大模型API文档中 stream: true 参数的用法和SSE响应格式',
        '在 fetch 请求中添加 stream: true，用 reader 读取 ReadableStream 数据',
        '解析 SSE 数据（data: 前缀），逐字提取内容并追加到消息列表',
        '实现打字机动画：用 setInterval 或 requestAnimationFrame 控制字符显示速度',
        '处理流式结束信号（[DONE]），停止动画并标记消息完成'
      ],
      tools: ['MDN Fetch API 文档', 'VS Code', 'Chrome DevTools Network面板'],
      checklist: [
        'AI回复是否逐字显示而非一次性出现？',
        '流式过程中用户能否看到正在"输入"的状态？',
        '流式结束时动画是否正确停止？',
        '网络中断时是否有容错处理？'
      ],
      output: { type: '项目Demo', title: '流式输出组件', desc: '流式输出功能，含SSE对接和打字机动画。', banner: 'b3', icon: '⚡' } },
    { day: 6, title: '添加上下文管理与多轮对话', type: 'output', time: 60, template: 'default', desc: '实现对话历史管理，支持多轮上下文和会话切换。',
      steps: [
        '定义对话历史数据结构：用数组存储 {role, content} 消息对象',
        '每次调用API时将历史消息一起传入 messages 参数，实现上下文延续',
        '实现会话列表：用侧边栏展示多个会话，点击切换不同对话',
        '用 localStorage 持久化会话数据，刷新页面后历史不丢失',
        '添加"新建会话"和"删除会话"按钮，完善会话管理交互'
      ],
      tools: ['VS Code', 'Chrome DevTools Application面板', 'MDN localStorage 文档'],
      checklist: [
        'AI能记住前几轮对话的内容？',
        '多个会话之间数据是否相互隔离？',
        '刷新页面后会话历史是否保留？',
        '新建和删除会话功能是否正常？'
      ],
      output: { type: '项目Demo', title: '多轮对话管理', desc: '多轮对话功能，含上下文维护、会话列表和历史记录。', banner: 'b3', icon: '🔄' } },
    { day: 7, title: '第一周复盘：前端+API基础', type: 'output', time: 40, template: 'review', desc: '总结本周前端开发和API接入的收获，评估能力提升。',
      steps: [
        '整理本周所有代码，用 Git 提交并推送到 GitHub 仓库',
        '列出本周完成的6个功能点，逐一评估掌握程度（掌握/熟悉/薄弱）',
        '针对薄弱项（如SSE解析、状态管理）制定下周补强计划',
        '撰写复盘文档：含本周成果、踩坑记录和能力雷达自评'
      ],
      tools: ['GitHub (github.com)', 'VS Code', 'Markdown编辑器'],
      checklist: [
        '本周代码是否已提交到GitHub？',
        '是否识别出3个以上薄弱技术点？',
        '复盘文档是否包含具体的改进计划？',
        '能力自评是否客观真实？'
      ],
      output: { type: '复盘文档', title: '第一周复盘', desc: '前端与API能力评估，含代码质量自检和改进计划。', banner: 'b1', icon: '✅' } },
    { day: 8, title: '学习工作流自动化概念', type: 'learn', time: 45, template: 'note', desc: '了解Coze/Dify/n8n等工作流编排平台，理解节点、触发器和数据流。',
      steps: [
        '访问 coze.com 注册账号，浏览模板广场了解工作流应用场景',
        '访问 dify.ai 和 n8n.io 了解另外两个平台的特点和定位',
        '在 Coze 中创建一个空白工作流，拖拽添加节点理解数据流向',
        '对比三个平台的差异：易用性、自定义能力、部署方式',
        '整理工作流核心概念笔记：节点、触发器、变量传递、分支逻辑'
      ],
      tools: ['Coze (coze.com)', 'Dify (dify.ai)', 'n8n (n8n.io)', 'VS Code'],
      checklist: [
        '能否说出工作流的3个核心概念？',
        '是否亲手在Coze中拖拽搭建过工作流？',
        '能否对比Coze/Dify/n8n的优劣？',
        '是否理解了节点间数据如何传递？'
      ],
      output: { type: '学习笔记', title: '工作流自动化笔记', desc: '工作流编排方法论笔记，含平台对比和适用场景。', banner: 'b1', icon: '📚' } },
    { day: 9, title: '搭建一个AI工作流（信息提取）', type: 'output', time: 60, template: 'default', desc: '用工作流平台搭建"输入文本→AI提取关键信息→输出结构化数据"流程。',
      steps: [
        '登录 Coze，点击"创建工作流"，命名为"信息提取助手"',
        '添加开始节点定义输入变量：text（字符串类型，用户输入文本）',
        '添加大模型节点，编写Prompt让AI从文本中提取姓名、电话、邮箱、地址',
        '在输出节点配置JSON格式，确保返回结构化数据',
        '点击"试运行"输入一段测试文本，验证输出结果是否正确'
      ],
      tools: ['Coze (coze.com)', 'VS Code', 'JSON在线校验 (json.cn)'],
      checklist: [
        '工作流能正确接收输入文本？',
        'AI提取的关键信息是否准确？',
        '输出是否为规范的JSON格式？',
        '换不同测试文本结果是否稳定？'
      ],
      output: { type: '工作流自动化', title: '信息提取工作流', desc: '完整AI信息提取工作流，含输入处理、AI提取节点和结构化输出。', banner: 'b2', icon: '🔗' } },
    { day: 10, title: '实现工作流API化调用', type: 'output', time: 55, template: 'default', desc: '将工作流发布为API，前端通过接口调用并展示结果。',
      steps: [
        '在 Coze 中将工作流"发布"，获取API访问地址和鉴权Token',
        '阅读 Coze API 文档，了解请求参数格式和响应结构',
        '在前端项目中编写调用函数，用 fetch 请求工作流API',
        '在对话界面增加"信息提取"入口，用户输入文本后调用工作流',
        '将返回的JSON数据格式化展示在前端界面'
      ],
      tools: ['Coze API文档', 'Postman', 'VS Code', 'Chrome DevTools'],
      checklist: [
        '工作流是否已成功发布为API？',
        '前端能正确调用工作流API并获取结果？',
        '调用失败时是否有错误处理？',
        '返回数据是否在前端正确展示？'
      ],
      output: { type: 'API接入文档', title: '工作流API对接', desc: '工作流API对接文档，含调用方式、参数说明和响应格式。', banner: 'b2', icon: '📡' } },
    { day: 11, title: '添加文件上传与解析能力', type: 'output', time: 60, template: 'default', desc: '实现PDF/Word文件上传，用AI解析内容并提取关键信息。',
      steps: [
        '在界面添加文件上传组件：input type="file" 接受 .pdf 和 .docx',
        '用 FileReader API 读取文件内容，限制文件大小（如10MB以内）',
        '接入 PDF.js（pdfjs CDN）解析PDF文本内容',
        '将提取的文本传入大模型API，让AI总结或提取关键信息',
        '在界面展示文件名、解析进度和AI处理结果'
      ],
      tools: ['PDF.js (mozilla.github.io/pdf.js)', 'VS Code', 'MDN FileReader 文档', 'Chrome DevTools'],
      checklist: [
        '能成功上传PDF或Word文件？',
        '文件内容能被正确解析为文本？',
        'AI能基于文件内容给出摘要或关键信息？',
        '上传超大文件时是否有提示？'
      ],
      output: { type: '项目Demo', title: '文件解析功能', desc: '文件上传与AI解析功能，含文件处理、内容提取和结果展示。', banner: 'b3', icon: '📎' } },
    { day: 12, title: '实现用户登录与数据持久化', type: 'output', time: 65, template: 'default', desc: '用localStorage或简单后端实现用户登录和对话数据保存。',
      steps: [
        '设计登录界面：用户名/密码输入框和登录按钮',
        '实现简易注册逻辑：将用户信息存入 localStorage（用户名作为key）',
        '实现登录验证：校验用户名密码，登录成功后保存当前用户状态',
        '将对话数据按用户ID分类存储，登录后加载该用户的历史会话',
        '添加退出登录功能，清除当前用户状态'
      ],
      tools: ['VS Code', 'Chrome DevTools Application面板', 'MDN localStorage 文档'],
      checklist: [
        '注册和登录流程是否跑通？',
        '登录后能否看到自己的历史会话？',
        '退出登录后数据是否隔离？',
        '刷新页面登录状态是否保持？'
      ],
      output: { type: '项目Demo', title: '用户系统', desc: '用户登录与数据持久化，含认证逻辑和历史数据管理。', banner: 'b3', icon: '🔐' } },
    { day: 13, title: '学习部署基础（Vercel/Netlify）', type: 'learn', time: 40, template: 'note', desc: '学习静态网站部署流程，理解构建、环境变量和域名配置。',
      steps: [
        '访问 vercel.com 和 netlify.com 注册账号（可用GitHub登录）',
        '阅读官方文档了解部署流程：连接GitHub仓库 → 自动构建 → 发布',
        '学习环境变量配置：在平台后台设置 API Key 等敏感信息',
        '了解自定义域名绑定方式和 HTTPS 自动配置',
        '对比 Vercel 和 Netlify 的免费额度、构建速度和功能差异'
      ],
      tools: ['Vercel (vercel.com)', 'Netlify (netlify.com)', 'GitHub (github.com)'],
      checklist: [
        '是否注册了Vercel或Netlify账号？',
        '能否说出部署的3个关键步骤？',
        '是否理解环境变量的作用和配置方法？',
        '能否对比Vercel和Netlify的优劣？'
      ],
      output: { type: '学习笔记', title: '部署基础笔记', desc: '部署流程笔记，含Vercel/Netlify对比和配置要点。', banner: 'b1', icon: '🚀' } },
    { day: 14, title: '第二周复盘：工作流+进阶', type: 'output', time: 40, template: 'review', desc: '回顾工作流自动化和进阶开发，总结项目完成度。',
      steps: [
        '整理第二周代码，用 Git 提交推送到 GitHub',
        '盘点已实现功能：工作流对接、文件解析、用户系统',
        '评估项目完整度：核心功能完成度百分比、待优化项清单',
        '撰写复盘文档，制定第三周实战项目的重点方向'
      ],
      tools: ['GitHub (github.com)', 'VS Code', 'Markdown编辑器'],
      checklist: [
        '第二周代码是否已提交？',
        '项目功能完成度是否达到60%以上？',
        '是否列出了待优化和待完善的功能？',
        '复盘是否明确了下周重点？'
      ],
      output: { type: '复盘文档', title: '第二周复盘', desc: '工作流与进阶能力评估，含项目完整度检查。', banner: 'b1', icon: '📋' } },
    { day: 15, title: '选定实战项目方向', type: 'practice', time: 40, template: 'project-plan', desc: '选定一个AI应用方向，明确功能范围、技术栈和交付物。',
      steps: [
        '访问 producthunt.com 和 github.com 探索3-5个AI应用灵感',
        '选定一个具体方向（如AI简历优化、AI文档问答、AI客服助手）',
        '用文档列出功能清单：核心功能3个 + 辅助功能2个',
        '确定技术栈：前端框架、AI API、工作流平台、部署方案',
        '制定交付里程碑：分4周完成的节点和每周交付物'
      ],
      tools: ['Product Hunt (producthunt.com)', 'GitHub (github.com)', 'Notion (notion.so)', 'VS Code'],
      checklist: [
        '项目方向是否具体且有实际价值？',
        '功能清单是否控制在合理范围（不过度）？',
        '技术栈是否明确且可落地？',
        '里程碑是否可衡量？'
      ],
      output: { type: '项目计划', title: '实战项目计划', desc: 'AI应用项目计划，含功能清单、技术选型和交付里程碑。', banner: 'b1', icon: '🎯' } },
    { day: 16, title: '搭建实战项目架构', type: 'output', time: 60, template: 'default', desc: '搭建项目架构，配置路由、状态管理和API层。',
      steps: [
        '用 Vite 创建新项目，安装必要依赖（如路由、状态管理库）',
        '规划目录结构：components/、pages/、api/、utils/、assets/',
        '配置路由：定义首页、对话页、设置页等页面路由',
        '搭建API封装层：统一封装请求函数、错误处理和Token管理',
        '初始化状态管理：定义用户状态、会话状态的全局存储'
      ],
      tools: ['Vite', 'VS Code', 'Vue Router/React Router 文档'],
      checklist: [
        '项目目录结构是否清晰合理？',
        '路由配置是否能正常跳转？',
        'API封装是否统一且可复用？',
        '状态管理是否初始化完成？'
      ],
      output: { type: '项目Demo', title: '项目架构搭建', desc: '完整项目架构，含路由配置、状态管理和API封装。', banner: 'b3', icon: '🏗️' } },
    { day: 17, title: '实现核心AI功能模块', type: 'output', time: 65, template: 'default', desc: '实现实战项目的核心AI功能，包含API调用和结果处理。',
      steps: [
        '根据项目计划，实现第一个核心AI功能（如对话、文档分析）',
        '编写AI调用逻辑：组装Prompt、调用API、处理响应',
        '实现结果处理：解析返回数据、格式化展示、异常兜底',
        '添加加载状态：AI处理时显示loading动画',
        '在真实场景中测试功能，确保端到端流程跑通'
      ],
      tools: ['VS Code', 'Chrome DevTools', 'OpenAI/通义千问API文档', 'Postman'],
      checklist: [
        '核心AI功能是否端到端跑通？',
        'AI返回结果是否正确处理和展示？',
        '处理过程中是否有加载状态提示？',
        '异常情况是否有兜底处理？'
      ],
      output: { type: '项目Demo', title: '核心AI功能', desc: '核心AI功能模块，含API集成、数据处理和错误兜底。', banner: 'b3', icon: '🤖' } },
    { day: 18, title: '完善交互与用户体验', type: 'output', time: 60, template: 'default', desc: '优化加载状态、错误提示、空状态和响应式布局。',
      steps: [
        '添加空状态设计：无数据时展示引导图文和操作入口',
        '完善错误提示：用 Toast 或 Modal 替代 alert，提示更友好',
        '优化加载体验：骨架屏替代简单loading，提升感知速度',
        '用 Chrome DevTools 检查响应式布局，适配手机/平板/桌面',
        '打磨细节：按钮hover效果、过渡动画、焦点状态'
      ],
      tools: ['Chrome DevTools', 'VS Code', 'CSS Tricks (css-tricks.com)'],
      checklist: [
        '空状态是否有引导用户操作的提示？',
        '错误提示是否友好（非alert弹窗）？',
        '页面在手机/平板/桌面是否都正常显示？',
        '交互细节是否有过渡动画？'
      ],
      output: { type: '项目Demo', title: 'UX优化', desc: '交互体验优化，含加载态、错误处理和响应式适配。', banner: 'b3', icon: '✨' } },
    { day: 19, title: '添加工作流自动化场景', type: 'output', time: 60, template: 'default', desc: '为项目添加一个工作流自动化场景，如自动生成报告或数据处理。',
      steps: [
        '在 Coze 中创建工作流：如"输入数据→AI分析→生成报告"',
        '配置输入参数和输出格式，测试工作流运行效果',
        '将工作流发布为API，获取调用地址',
        '在前端项目中集成调用，增加"一键生成报告"入口',
        '处理工作流执行时间较长的情况，添加进度提示'
      ],
      tools: ['Coze (coze.com)', 'VS Code', 'Postman', 'Chrome DevTools'],
      checklist: [
        '工作流是否在Coze中测试通过？',
        '前端能成功调用工作流API？',
        '自动化场景是否与项目主题契合？',
        '长耗时操作是否有进度反馈？'
      ],
      output: { type: '工作流自动化', title: '自动化场景', desc: '工作流自动化功能，含触发条件、处理流程和输出。', banner: 'b2', icon: '⚙️' } },
    { day: 20, title: '编写API接入文档', type: 'output', time: 50, template: 'default', desc: '整理项目的API接入文档，含接口说明、参数和示例。',
      steps: [
        '列出项目所有API接口：对话、文件上传、工作流调用等',
        '为每个接口编写说明：URL、请求方法、参数、响应格式',
        '提供请求示例：用 Postman 测试并导出示例代码',
        '整理错误码表：列出所有可能的错误及对应说明',
        '将文档保存为 Markdown 文件放入项目 docs/ 目录'
      ],
      tools: ['Postman', 'VS Code', 'Markdown编辑器', 'GitHub (github.com)'],
      checklist: [
        '所有接口是否都有文档说明？',
        '每个接口是否有请求示例？',
        '错误码是否完整列出？',
        '文档是否放在项目目录中？'
      ],
      output: { type: 'API接入文档', title: '项目API文档', desc: '完整API文档，含接口列表、参数说明、请求示例和错误码。', banner: 'b2', icon: '📖' } },
    { day: 21, title: '实战中期复盘', type: 'output', time: 40, template: 'review', desc: '检查项目完成度，调整后续开发计划。',
      steps: [
        '对照项目计划，逐一检查已完成和未完成的功能',
        '评估代码质量：是否有冗余代码、命名是否规范、注释是否充分',
        '整理遗留问题清单：Bug、待优化项、未实现功能',
      '调整后续计划：优先级排序，确保关键功能在剩余时间内完成'
      ],
      tools: ['GitHub (github.com)', 'VS Code', 'Notion (notion.so)'],
      checklist: [
        '项目完成度是否达到70%以上？',
        '是否列出了所有遗留问题？',
        '后续计划是否重新排定优先级？',
        '代码质量是否通过自检？'
      ],
      output: { type: '复盘文档', title: '实战中期复盘', desc: '项目中期检查，含功能完成度和质量评估。', banner: 'b1', icon: '✅' } },
    { day: 22, title: '部署项目到线上', type: 'output', time: 55, template: 'default', desc: '将项目部署到Vercel/Netlify，配置环境变量和域名。',
      steps: [
        '确保代码已推送到 GitHub，构建命令和输出目录正确',
        '登录 Vercel，点击 "New Project" 导入 GitHub 仓库',
        '在项目设置中配置环境变量：API Key、工作流Token等',
        '点击 Deploy 部署，等待构建完成获取线上访问地址',
        '测试线上环境：验证所有功能在部署后正常工作'
      ],
      tools: ['Vercel (vercel.com)', 'GitHub (github.com)', 'VS Code'],
      checklist: [
        '项目是否成功部署并线上可访问？',
        '环境变量是否正确配置？',
        '线上环境所有功能是否正常？',
        'HTTPS是否自动启用？'
      ],
      output: { type: '部署上线', title: '项目部署上线', desc: '线上可访问的部署项目，含域名、环境配置和CI/CD。', banner: 'b3', icon: '🚀' } },
    { day: 23, title: '编写README与使用说明', type: 'output', time: 45, template: 'default', desc: '编写项目README，含功能介绍、技术栈、运行方式和截图。',
      steps: [
        '在项目根目录创建 README.md 文件',
        '编写项目简介：一句话说明项目做什么、解决什么问题',
        '列出功能特性、技术栈和依赖说明',
        '编写本地运行步骤：clone、install、配置环境变量、run',
        '添加项目截图和在线Demo链接，附上部署地址'
      ],
      tools: ['VS Code', 'Markdown编辑器', 'GitHub (github.com)'],
      checklist: [
        'README是否包含项目简介？',
        '技术栈和依赖是否清晰列出？',
        '本地运行步骤是否可复制执行？',
        '是否有截图和在线Demo链接？'
      ],
      output: { type: 'API接入文档', title: '项目README', desc: '完整README文档，含功能介绍、技术栈和运行方式。', banner: 'b2', icon: '📝' } },
    { day: 24, title: '录制项目演示视频', type: 'practice', time: 50, template: 'default', desc: '录制3-5分钟演示视频，展示核心功能和使用流程。',
      steps: [
        '安装 OBS Studio（obsproject.com）或用系统自带录屏工具',
        '编写演示脚本：开场介绍 → 核心功能演示 → 技术亮点 → 结尾',
        '录制3-5分钟视频，确保画面清晰、操作流畅',
        '用剪辑工具裁剪多余片段，添加字幕和片头',
        '上传到 B站 或 YouTube，获取分享链接'
      ],
      tools: ['OBS Studio (obsproject.com)', '剪映 (jianying.com)', 'B站 (bilibili.com)'],
      checklist: [
        '视频时长是否在3-5分钟？',
        '是否展示了所有核心功能？',
        '画面和声音是否清晰？',
        '是否已上传并获取分享链接？'
      ],
      output: { type: '项目Demo', title: '项目演示视频', desc: '3-5分钟功能演示视频，含核心场景和亮点展示。', banner: 'b3', icon: '🎬' } },
    { day: 25, title: '项目最终整理与作品集', type: 'output', time: 55, template: 'final', desc: '整理项目代码、文档和演示，形成可展示作品集。',
      steps: [
        '整理 GitHub 仓库：完善 README、清理无用代码、规范提交记录',
        '确认线上Demo可正常访问，测试所有功能',
        '整理项目文档：API文档、架构说明、演示视频链接',
        '用 Notion 或飞书文档创建作品集页面，串联所有材料',
        '检查所有链接有效性和文档完整性'
      ],
      tools: ['GitHub (github.com)', 'Notion (notion.so)', 'Vercel (vercel.com)', 'VS Code'],
      checklist: [
        'GitHub仓库是否整洁专业？',
        '线上Demo是否可正常访问？',
        '作品集是否串联了所有材料？',
        '所有链接是否有效？'
      ],
      output: { type: '作品集', title: 'AI开发作品集', desc: '完整开发作品集，含代码仓库、在线Demo和技术文档。', banner: 'b1', icon: '🏆' } },
    { day: 26, title: '简历项目描述优化', type: 'output', time: 50, template: 'resume', desc: '将项目转化为简历描述，突出技术栈和量化成果。',
      steps: [
        '用 STAR 法则梳理项目：情境、任务、行动、结果',
        '编写3-4条简历描述，每条以动词开头（如"设计""实现""优化"）',
        '量化成果：如"响应时间降低X%""支持XX并发""覆盖XX功能"',
        '列出技术关键词：前端框架、AI API、工作流、部署平台',
        '请同学或导师审阅，根据反馈优化措辞'
      ],
      tools: ['Notion (notion.so)', 'VS Code', '超级简历 (wondercv.com)'],
      checklist: [
        '简历描述是否用STAR法则？',
        '是否包含量化成果数据？',
        '技术关键词是否完整？',
        '描述是否简洁有力（每条1-2行）？'
      ],
      output: { type: '简历材料', title: '简历项目描述', desc: '技术简历项目描述，含技术栈、职责和量化成果。', banner: 'b1', icon: '📄' } },
    { day: 27, title: '技术面试高频题练习', type: 'practice', time: 55, template: 'qa-practice', desc: '练习前端和AI开发面试高频题，整理回答框架。',
      steps: [
        '访问 leetcode.cn 和 fe.ecool.fun 收集前端面试高频题',
        '练习前端基础题：闭包、事件循环、Promise、HTTP缓存',
        '练习AI开发题：SSE原理、流式输出实现、Prompt优化思路',
        '为每类题目整理回答框架：定义 → 原理 → 示例 → 扩展',
        '录音练习口述回答，检查表达流畅度和逻辑性'
      ],
      tools: ['LeetCode (leetcode.cn)', '前端面试题 (fe.ecool.fun)', 'VS Code', '手机录音'],
      checklist: [
        '是否整理了15道以上高频题？',
        '每道题是否有回答框架？',
        'AI开发相关题目是否能答出原理？',
        '口述表达是否流畅？'
      ],
      output: { type: '路演稿', title: '面试题库', desc: '技术面试高频题及回答，含前端基础和AI开发类。', banner: 'b2', icon: '💬' } },
    { day: 28, title: '模拟技术面试', type: 'practice', time: 60, template: 'mock', desc: '完成完整技术模拟面试，练习项目讲解和编码题。',
      steps: [
        '找一位同学或同行作为面试官，约定1小时模拟面试时间',
        '准备5分钟项目讲解：背景、技术方案、难点和成果',
        '练习2道编码题：1道前端基础 + 1道AI相关',
        '面试后请面试官给出反馈：表达、技术深度、改进点',
        '撰写复盘文档，记录不足并制定改进计划'
      ],
      tools: ['腾讯会议/飞书会议', 'VS Code', 'LeetCode (leetcode.cn)'],
      checklist: [
        '项目讲解是否在5分钟内完成？',
        '编码题是否能写出可运行代码？',
        '是否获得面试官反馈？',
        '复盘是否明确了改进方向？'
      ],
      output: { type: '路演稿', title: '模拟面试复盘', desc: '技术面试复盘，含编码能力评估和改进要点。', banner: 'b2', icon: '🎯' } },
    { day: 29, title: '作品集最终打磨', type: 'output', time: 45, template: 'polish', desc: '打磨作品集，确保代码质量、文档完整和演示流畅。',
      steps: [
        '检查代码质量：用 ESLint 扫描代码，修复所有警告',
        '完善文档：README、API文档是否有错别字和格式问题',
        '重新录制演示视频，确保画面和讲解流畅',
        '优化作品集页面视觉：统一排版、配色和图标',
        '请2-3人体验作品集Demo，收集反馈并最后调整'
      ],
      tools: ['ESLint', 'VS Code', 'Notion (notion.so)', 'OBS Studio (obsproject.com)'],
      checklist: [
        '代码是否通过ESLint检查无警告？',
        '文档是否有错别字或格式问题？',
        '演示视频是否流畅无卡顿？',
        '作品集整体是否专业美观？'
      ],
      output: { type: '作品集', title: '作品集终版', desc: '打磨后的开发作品集，含代码、文档和在线Demo。', banner: 'b1', icon: '✨' } },
    { day: 30, title: '30天成长总结与求职计划', type: 'output', time: 45, template: 'summary', desc: '总结30天成长，制定求职行动计划。',
      steps: [
        '回顾30天所有产出：代码仓库、文档、演示视频、作品集',
        '梳理能力提升：前端开发、API接入、工作流、部署的掌握程度',
        '制定求职计划：目标公司清单、投递时间表、面试准备节奏',
        '整理可复用资产：代码模板、Prompt库、面试题集',
        '撰写总结文档，记录心得和后续学习方向'
      ],
      tools: ['Notion (notion.so)', 'VS Code', 'Boss直聘 (zhipin.com)', '拉勾 (lagou.com)'],
      checklist: [
        '是否梳理了30天所有产出？',
        '能力提升是否有清晰自评？',
        '求职计划是否包含具体公司和时间？',
        '是否整理了可复用的模板和资源？'
      ],
      output: { type: '总结文档', title: '30天成长总结', desc: '完整成长总结，含技能提升、项目清单和求职计划。', banner: 'b1', icon: '🏁' } },
  ],

  '商业分析师': [
    { day: 1, title: 'SQL基础复习与实战练习', type: 'learn', time: 45, template: 'note', desc: '复习SQL核心语法（JOIN/窗口函数/子查询），完成10道实战题。',
      steps: [
        '访问 leetcode.cn 或 sqlzoo.net 找到SQL练习题库',
        '复习 JOIN 语法：INNER/LEFT/RIGHT JOIN 的区别和使用场景',
        '复习窗口函数：ROW_NUMBER、RANK、LAG/LEAD 的用法',
        '完成10道实战题：覆盖子查询、聚合、多表关联',
        '记录易错点和解题思路到笔记中'
      ],
      tools: ['LeetCode (leetcode.cn)', 'SQLZoo (sqlzoo.net)', 'VS Code', 'MySQL Workbench'],
      checklist: [
        '能否独立写出多表JOIN查询？',
        '窗口函数的语法是否掌握？',
        '10道实战题正确率达到80%以上？',
        '易错点是否整理成笔记？'
      ],
      output: { type: '学习笔记', title: 'SQL基础笔记', desc: 'SQL核心语法笔记，含实战练习和易错点。', banner: 'b1', icon: '📝' } },
    { day: 2, title: 'Python数据分析入门', type: 'learn', time: 45, template: 'note', desc: '学习pandas数据处理和matplotlib/seaborn可视化基础。',
      steps: [
        '安装 Python 和 Jupyter Notebook（可用 Anaconda）',
        '运行 pip install pandas matplotlib seaborn 安装依赖库',
        '学习 pandas 核心操作：read_csv、groupby、merge、pivot_table',
        '学习 matplotlib/seaborn 绘图：折线图、柱状图、散点图',
        '用一个示例数据集完成数据处理和可视化全流程'
      ],
      tools: ['Python (python.org)', 'Jupyter Notebook', 'pandas (pandas.pydata.org)', 'VS Code'],
      checklist: [
        '能用pandas读取CSV并做基础处理？',
        'groupby聚合操作是否掌握？',
        '能否用matplotlib画出3种以上图表？',
        '是否理解DataFrame和Series的区别？'
      ],
      output: { type: '学习笔记', title: 'Python分析笔记', desc: 'pandas和可视化笔记，含常用操作和图表模板。', banner: 'b1', icon: '🐍' } },
    { day: 3, title: '完成一个完整的漏斗分析', type: 'output', time: 60, template: 'default', desc: '用模拟数据完成用户行为漏斗分析，计算各步转化率和流失率。',
      steps: [
        '用 pandas 生成模拟用户行为数据（含用户ID、行为步骤、时间戳）',
        '按步骤顺序统计每个环节的用户数，构建漏斗数据',
        '计算各步转化率（本步用户数/上步用户数）和流失率',
        '用 matplotlib 绘制漏斗图，标注转化率数据',
        '撰写分析结论：流失最高的环节及可能原因'
      ],
      tools: ['Python', 'Jupyter Notebook', 'pandas', 'matplotlib'],
      checklist: [
        '漏斗各步用户数是否正确统计？',
        '转化率计算是否准确？',
        '漏斗图是否清晰展示各步数据？',
        '是否给出了流失分析结论？'
      ],
      output: { type: '漏斗分析报告', title: '用户行为漏斗分析', desc: '完整漏斗分析，含各步转化率、流失分析和优化建议。', banner: 'b2', icon: '🔽' } },
    { day: 4, title: '学习用户分群方法', type: 'learn', time: 40, template: 'note', desc: '学习RFM模型、K-means聚类和用户分层方法。',
      steps: [
        '搜索学习RFM模型：R(最近消费)、F(消费频次)、M(消费金额)三维度',
        '学习K-means聚类算法原理和Python实现（sklearn库）',
        '对比RFM业务分群和K-means算法分群的优劣势',
        '记录用户分群的适用场景和实操步骤'
      ],
      tools: ['Scikit-learn (scikit-learn.org)', 'Jupyter Notebook', 'VS Code', '知乎/掘金技术文章'],
      checklist: [
        'RFM三个维度含义是否清楚？',
        'K-means算法原理是否理解？',
        '能否说出两种分群方法的优劣？',
        '适用场景是否记录完整？'
      ],
      output: { type: '学习笔记', title: '用户分群方法论', desc: 'RFM和聚类分群笔记，含适用场景和实操步骤。', banner: 'b1', icon: '👥' } },
    { day: 5, title: '完成用户分群分析', type: 'output', time: 60, template: 'default', desc: '用RFM模型对模拟用户数据做分群，输出各群特征和策略建议。',
      steps: [
        '用 pandas 生成含用户ID、最近消费日期、消费频次、消费金额的模拟数据',
        '对R/F/M三维度分别打分（1-5分），组合成RFM值',
        '根据RFM值将用户分为8类（如重要价值客户、重要保持客户等）',
        '统计各类用户数量和占比，计算特征均值',
        '为每个用户群撰写差异化运营策略建议'
      ],
      tools: ['Python', 'Jupyter Notebook', 'pandas', 'matplotlib'],
      checklist: [
        'RFM打分逻辑是否正确？',
        '8类用户是否都正确划分？',
        '各群特征描述是否清晰？',
        '运营策略是否有针对性？'
      ],
      output: { type: '分群模型', title: '用户分群分析', desc: 'RFM分群结果，含5个用户群的特征画像和运营策略。', banner: 'b2', icon: '🎯' } },
    { day: 6, title: '用Tableau/Power BI搭建数据看板', type: 'output', time: 60, template: 'dashboard', desc: '下载安装Tableau Public或Power BI Desktop，用公开数据集搭建一个商业数据看板。',
      steps: [
        '下载安装Tableau Public（免费版）或Power BI Desktop',
        '从Kaggle或data.gov下载一个电商公开数据集',
        '用BI工具搭建包含核心指标的看板',
        '设计3个以上图表类型（趋势/对比/漏斗）',
        '导出看板截图或发布到Tableau Public'
      ],
      tools: ['Tableau Public (tableau.com/products/public)', 'Power BI Desktop (powerbi.microsoft.com)', 'Kaggle (kaggle.com)', 'data.gov'],
      checklist: [
        '是否安装了BI工具？',
        '是否使用了真实公开数据集？',
        '看板是否包含3种以上图表？',
        '是否导出了看板截图或在线链接？'
      ],
      output: { type: '数据看板', title: 'BI数据看板', desc: '用Tableau/Power BI搭建的商业数据看板，基于真实公开数据集。', banner: 'b3', icon: '📊' } },
    { day: 7, title: '第一周复盘：分析基础', type: 'output', time: 40, template: 'review', desc: '总结SQL/Python/分析方法的基础掌握情况。',
      steps: [
        '整理本周所有练习代码和笔记，归档到文件夹',
        '自评SQL、Python、分析方法的掌握程度（1-5分）',
        '列出薄弱项：如窗口函数不熟、pandas操作慢等',
        '撰写复盘文档，制定第二周补强重点'
      ],
      tools: ['VS Code', 'Markdown编辑器', 'Notion (notion.so)'],
      checklist: [
        '本周练习代码是否归档？',
        '能力自评是否客观？',
        '薄弱项是否明确列出？',
        '第二周计划是否有针对性？'
      ],
      output: { type: '复盘文档', title: '第一周复盘', desc: '分析基础能力评估，含薄弱项和下周重点。', banner: 'b1', icon: '✅' } },
    { day: 8, title: '完成一个A/B测试分析', type: 'output', time: 55, template: 'abtest', desc: '用模拟数据完成A/B测试结果分析，含显著性检验和结论。',
      steps: [
        '用 pandas 生成A/B两组的模拟实验数据（含组别、指标值）',
        '计算两组的均值、标准差等描述性统计量',
        '用 scipy.stats 做t检验，计算p值判断显著性',
        '计算提升幅度和置信区间',
        '撰写分析结论：是否显著、效果大小、决策建议'
      ],
      tools: ['Python', 'Jupyter Notebook', 'scipy (scipy.org)', 'pandas'],
      checklist: [
        'A/B两组数据是否正确生成？',
        't检验p值是否正确计算？',
        '显著性判断是否正确（p<0.05）？',
        '决策建议是否基于数据？'
      ],
      output: { type: '结论报告', title: 'A/B测试分析', desc: 'A/B测试分析报告，含统计检验、效果评估和决策建议。', banner: 'b2', icon: '🔬' } },
    { day: 9, title: '学习归因分析方法', type: 'learn', time: 40, template: 'note', desc: '学习首次触点、末次触点和多触点归因模型。',
      steps: [
        '搜索学习归因分析概念：什么是归因、为什么需要归因',
        '学习首次触点归因：100%归功于用户第一个接触的渠道',
        '学习末次触点归因：100%归功于用户最后一个接触的渠道',
        '学习多触点归因：线性归因、时间衰减归因等',
        '对比各模型优劣，记录适用场景'
      ],
      tools: ['Google搜索', '知乎/掘金技术文章', 'VS Code', 'Jupyter Notebook'],
      checklist: [
        '归因的概念是否理解？',
        '能否说出3种以上归因模型？',
        '各模型的优劣是否清楚？',
        '适用场景是否记录完整？'
      ],
      output: { type: '学习笔记', title: '归因分析笔记', desc: '归因模型笔记，含各模型对比和适用场景。', banner: 'b1', icon: '📚' } },
    { day: 10, title: '完成渠道归因分析', type: 'output', time: 55, template: 'default', desc: '用模拟数据做渠道归因分析，输出各渠道贡献度。',
      steps: [
        '用 pandas 生成模拟用户路径数据（用户ID、渠道序列、是否转化）',
        '用首次触点归因计算各渠道贡献的转化数',
        '用末次触点归因计算各渠道贡献的转化数',
        '对比两种归因结果差异，分析原因',
        '用 matplotlib 绘制各渠道贡献度对比图'
      ],
      tools: ['Python', 'Jupyter Notebook', 'pandas', 'matplotlib'],
      checklist: [
        '模拟数据是否包含完整的用户路径？',
        '首次和末次归因计算是否正确？',
        '两种归因结果差异是否分析了原因？',
        '图表是否清晰展示对比？'
      ],
      output: { type: '结论报告', title: '渠道归因分析', desc: '渠道归因报告，含各渠道贡献度和优化建议。', banner: 'b2', icon: '📡' } },
    { day: 11, title: '完成真实数据集的探索性分析', type: 'output', time: 60, template: 'default', desc: '从Kaggle下载一个真实商业数据集，用Python完成数据清洗、探索和可视化。',
      steps: [
        '从Kaggle下载电商/用户行为真实数据集',
        '用pandas完成数据清洗（缺失值/异常值/类型转换）',
        '做探索性分析（分布/相关性/趋势）',
        '用matplotlib/seaborn生成5张以上图表',
        '产出分析Notebook'
      ],
      tools: ['Kaggle (kaggle.com)', 'Jupyter Notebook', 'pandas', 'matplotlib', 'seaborn'],
      checklist: [
        '是否使用了真实数据集？',
        '是否完成了数据清洗？',
        '是否产出5张以上可视化？',
        '是否有Jupyter Notebook？'
      ],
      output: { type: '结论报告', title: '真实数据集EDA报告', desc: '真实数据集探索性分析，含数据清洗和多维度可视化。', banner: 'b2', icon: '🔍' } },
    { day: 12, title: '学习业务指标体系搭建', type: 'learn', time: 45, template: 'metrics', desc: '学习北极星指标、OSM模型和指标拆解方法。',
      steps: [
        '搜索学习北极星指标概念：如何选定、如何衡量',
        '学习OSM模型：Object（目标）-Strategy（策略）-Measurement（度量）',
        '学习指标拆解方法：如GMV拆解为流量×转化×客单价',
        '找一个电商案例，练习从北极星到执行层指标的拆解',
        '记录指标体系搭建的5步法'
      ],
      tools: ['Google搜索', '知乎/人人都是产品经理 (woshipm.com)', 'VS Code', 'Notion (notion.so)'],
      checklist: [
        '北极星指标的概念是否理解？',
        'OSM模型的三层结构是否清楚？',
        '能否对一个业务做指标拆解？',
        '搭建步骤是否记录完整？'
      ],
      output: { type: '学习笔记', title: '指标体系方法论', desc: 'OSM模型和指标拆解笔记，含搭建步骤和案例。', banner: 'b1', icon: '📈' } },
    { day: 13, title: '用OSM模型搭建业务指标体系', type: 'output', time: 55, template: 'metrics-full', desc: '为一个电商业务搭建完整指标体系，用OSM模型分层定义。',
      steps: [
        '选择一个电商业务（如某生鲜平台）',
        '用OSM模型定义北极星指标→次级指标→过程指标',
        '为每个指标写出定义和计算公式',
        '设计监控方案和预警阈值',
        '产出指标体系文档'
      ],
      tools: ['Notion (notion.so)', 'Excel/Google Sheets', 'ProcessOn (processon.com)'],
      checklist: [
        '是否用了OSM模型？',
        '是否定义了3层指标？',
        '每个指标是否有计算公式？',
        '是否设计了监控方案？'
      ],
      output: { type: '结论报告', title: 'OSM指标体系文档', desc: '完整指标体系，含3层指标、定义和监控方案。', banner: 'b2', icon: '🔢' } },
    { day: 14, title: '第二周复盘：分析方法', type: 'output', time: 40, template: 'review', desc: '回顾分析方法和看板设计，总结能力提升。',
      steps: [
        '整理第二周所有分析代码和产出',
        '评估A/B测试、归因分析、看板设计的掌握程度',
        '总结分析方法论的应用熟练度',
        '制定第三周实战项目的重点方向'
      ],
      tools: ['VS Code', 'Markdown编辑器', 'Notion (notion.so)'],
      checklist: [
        '第二周产出是否完整归档？',
        'A/B测试和归因分析是否掌握？',
        '看板设计能力是否达标？',
        '第三周重点是否明确？'
      ],
      output: { type: '复盘文档', title: '第二周复盘', desc: '分析能力评估，含方法掌握和产出质量。', banner: 'b1', icon: '📋' } },
    { day: 15, title: '选定实战分析项目', type: 'practice', time: 40, template: 'project-plan', desc: '选定一个分析方向，明确分析目标、数据源和交付物。',
      steps: [
        '浏览 kaggle.com 或和鲸社区寻找可用的公开数据集',
        '选定一个分析方向（如电商用户行为分析、APP留存分析）',
        '用文档明确分析目标：要回答什么业务问题',
        '确定数据源和交付物：报告、看板、PPT',
        '制定项目计划：分5天完成的分析节点'
      ],
      tools: ['Kaggle (kaggle.com)', '和鲸社区 (heywhale.com)', 'Notion (notion.so)', 'VS Code'],
      checklist: [
        '分析方向是否有业务价值？',
        '数据集是否可用且足够？',
        '分析目标是否明确？',
        '项目计划是否可执行？'
      ],
      output: { type: '项目计划', title: '分析项目计划', desc: '分析项目计划，含目标、数据源、方法和交付物。', banner: 'b1', icon: '🎯' } },
    { day: 16, title: '完成数据清洗与探索', type: 'output', time: 60, template: 'default', desc: '对实战项目数据做清洗、缺失值处理和探索性分析。',
      steps: [
        '用 pandas 读取数据集，查看数据基本信息（shape、dtypes）',
        '检查缺失值和异常值，制定处理策略（删除/填充/转换）',
        '执行数据清洗：处理缺失值、去重、类型转换',
        '做探索性分析：描述性统计、分布、相关性',
        '记录数据质量评估和初步发现'
      ],
      tools: ['Python', 'Jupyter Notebook', 'pandas', 'VS Code'],
      checklist: [
        '缺失值和异常值是否处理？',
        '数据类型是否正确转换？',
        '探索性分析是否充分？',
        '初步发现是否记录？'
      ],
      output: { type: '结论报告', title: '数据探索报告', desc: '数据清洗和探索分析，含数据质量评估和初步发现。', banner: 'b2', icon: '🔍' } },
    { day: 17, title: '基于真实数据完成漏斗与分群分析', type: 'output', time: 65, template: 'default', desc: '用Kaggle真实数据集完成用户行为漏斗和RFM分群，产出可执行建议。',
      steps: [
        '用真实数据集计算漏斗各步转化率',
        '定位流失最大环节并分析原因',
        '用RFM模型做用户分群',
        '为每个用户群设计运营策略',
        '产出含行动建议的分析报告（不只是数据罗列）'
      ],
      tools: ['Jupyter Notebook', 'pandas', 'Kaggle数据集'],
      checklist: [
        '漏斗是否基于真实数据？',
        '是否定位了流失环节？',
        'RFM分群是否有策略？',
        '报告是否含可执行建议？'
      ],
      output: { type: '漏斗分析报告', title: '真实数据漏斗与分群分析', desc: '基于真实数据的漏斗与分群分析，含流失定位、用户分群和行动建议。', banner: 'b2', icon: '📊' } },
    { day: 18, title: '制作分析数据看板', type: 'output', time: 60, template: 'dashboard', desc: '将分析结果制作成交互式看板，展示核心指标和发现。',
      steps: [
        '确定看板核心指标和分析维度',
        '用 plotly 或 pyecharts 制作交互式图表',
        '设计看板布局：KPI区、趋势区、分析区',
        '添加筛选器和下钻功能（如按用户群筛选）',
        '确保看板能清晰传达核心发现'
      ],
      tools: ['Plotly (plotly.com)', 'pyecharts (pyecharts.org)', 'Jupyter Notebook', 'Python'],
      checklist: [
        '看板是否包含核心指标？',
        '图表是否支持交互？',
        '布局是否层次分明？',
        '核心发现是否突出展示？'
      ],
      output: { type: '数据看板', title: '分析结果看板', desc: '交互式看板，含核心指标、趋势和下钻分析。', banner: 'b3', icon: '📊' } },
    { day: 19, title: '撰写分析结论报告', type: 'output', time: 65, template: 'default', desc: '撰写完整分析报告，含背景、方法、发现和建议。',
      steps: [
        '撰写报告结构：背景 → 目标 → 方法 → 发现 → 建议',
        '在背景部分说明业务问题和分析价值',
        '在方法部分说明数据来源和分析方法',
        '在发现部分用数据和图表支撑结论',
        '在建议部分给出可落地的行动方案'
      ],
      tools: ['VS Code', 'Markdown编辑器', 'Notion (notion.so)', 'Word/WPS'],
      checklist: [
        '报告结构是否完整？',
        '背景和目标是否清晰？',
        '发现是否有数据支撑？',
        '建议是否可落地？'
      ],
      output: { type: '结论报告', title: '商业分析报告', desc: '完整分析报告，含背景、方法、核心发现和行动建议。', banner: 'b1', icon: '📄' } },
    { day: 20, title: '制作分析汇报PPT', type: 'output', time: 55, template: 'deck', desc: '将报告转化为汇报PPT，突出核心发现和建议。',
      steps: [
        '设计PPT结构：封面 → 背景 → 发现 → 建议 → 总结',
        '提炼每页核心信息，一页一个观点',
        '将数据可视化图表插入PPT，确保清晰',
        '添加演讲者备注，准备口述讲解',
        '检查排版、配色和字体一致性'
      ],
      tools: ['PowerPoint/Keynote', 'WPS', '飞书文档 (feishu.cn)', 'Canva (canva.com)'],
      checklist: [
        'PPT是否一页一观点？',
        '图表是否清晰可见？',
        '是否有演讲者备注？',
        '排版是否专业一致？'
      ],
      output: { type: '结论报告', title: '分析汇报PPT', desc: '汇报演示文档，含核心发现、图表和建议。', banner: 'b3', icon: '🎬' } },
    { day: 21, title: '实战中期复盘', type: 'output', time: 40, template: 'review', desc: '检查分析项目完成度，调整后续计划。',
      steps: [
        '对照项目计划检查已完成的分析模块',
        '评估分析质量和洞察深度',
        '整理遗留问题：数据不足、方法待优化',
        '调整后续计划，确保关键产出在剩余时间完成'
      ],
      tools: ['VS Code', 'Notion (notion.so)', 'Markdown编辑器'],
      checklist: [
        '项目完成度是否达到70%？',
        '分析质量是否达标？',
        '遗留问题是否列出？',
        '后续计划是否调整？'
      ],
      output: { type: '复盘文档', title: '实战中期复盘', desc: '项目中期检查，含分析质量和完整度评估。', banner: 'b1', icon: '✅' } },
    { day: 22, title: '完善分析报告终稿', type: 'output', time: 60, template: 'default', desc: '根据自检完善报告，补充数据支撑和逻辑链条。',
      steps: [
        '自检报告逻辑：每个结论是否有充分数据支撑',
        '补充缺失的分析维度或交叉验证',
        '优化图表标注和说明，提升可读性',
        '请同学或导师审阅，根据反馈修改',
        '完成终稿排版和格式检查'
      ],
      tools: ['VS Code', 'Word/WPS', 'Notion (notion.so)', 'Jupyter Notebook'],
      checklist: [
        '每个结论是否有数据支撑？',
        '逻辑链条是否完整？',
        '图表是否清晰可读？',
        '是否经过他人审阅？'
      ],
      output: { type: '结论报告', title: '分析报告终稿', desc: '完善的分析报告，含数据支撑、逻辑链和建议。', banner: 'b1', icon: '📄' } },
    { day: 23, title: '模拟分析汇报', type: 'practice', time: 50, template: 'review-sim', desc: '模拟一次分析汇报，练习讲解发现和回答质疑。',
      steps: [
        '找一位同学或同行作为听众，约定30分钟模拟汇报',
        '用10分钟讲解分析背景、方法和核心发现',
        '预留10分钟回答听众提问和质疑',
        '请听众给出反馈：逻辑、表达、图表',
        '记录问答改进点和表达优化项'
      ],
      tools: ['腾讯会议/飞书会议', 'PowerPoint', 'Notion (notion.so)'],
      checklist: [
        '汇报是否在规定时间内完成？',
        '能否流畅回答质疑？',
        '是否获得听众反馈？',
        '改进点是否记录？'
      ],
      output: { type: '复盘文档', title: '模拟汇报记录', desc: '汇报模拟记录，含讲解要点和问答改进。', banner: 'b1', icon: '🎤' } },
    { day: 24, title: '整理分析作品集', type: 'output', time: 55, template: 'final', desc: '将所有分析产出整理成作品集。',
      steps: [
        '汇总所有分析产出：报告、看板、PPT、代码',
        '用 Notion 或飞书文档创建作品集页面',
        '为每个项目编写简介：背景、方法、成果',
        '整理代码到 GitHub 仓库，附上说明文档',
        '检查所有链接和文件可访问性'
      ],
      tools: ['Notion (notion.so)', 'GitHub (github.com)', '飞书文档 (feishu.cn)', 'VS Code'],
      checklist: [
        '所有产出是否汇总？',
        '作品集是否有项目简介？',
        '代码是否上传GitHub？',
        '所有链接是否可访问？'
      ],
      output: { type: '作品集', title: '商业分析作品集', desc: '完整作品集，含漏斗分析、分群、看板和报告。', banner: 'b1', icon: '🏆' } },
    { day: 25, title: '作品集最终整理', type: 'output', time: 50, template: 'polish', desc: '打磨作品集，确保专业度和可展示性。',
      steps: [
        '检查作品集视觉一致性：配色、排版、字体',
        '优化项目描述措辞，突出业务价值',
        '确保每个项目都有清晰的背景和成果',
        '补充截图和可视化图表',
        '请2-3人体验作品集，收集反馈并优化'
      ],
      tools: ['Notion (notion.so)', 'GitHub (github.com)', 'Canva (canva.com)'],
      checklist: [
        '视觉是否统一专业？',
        '项目描述是否突出价值？',
        '每个项目是否有截图？',
        '是否经过他人体验反馈？'
      ],
      output: { type: '作品集', title: '作品集终版', desc: '打磨后的作品集，适合求职展示。', banner: 'b1', icon: '✨' } },
    { day: 26, title: '简历项目描述优化', type: 'output', time: 50, template: 'resume', desc: '将分析成果转化为简历描述，突出量化发现。',
      steps: [
        '用 STAR 法则梳理分析项目：情境、任务、行动、结果',
        '编写3-4条简历描述，每条以动词开头',
        '量化成果：如"分析XX万条数据""提升转化率X%"',
        '列出分析技能关键词：SQL、Python、RFM、A/B测试',
        '请同学或导师审阅优化措辞'
      ],
      tools: ['超级简历 (wondercv.com)', 'Notion (notion.so)', 'VS Code'],
      checklist: [
        '描述是否用STAR法则？',
        '是否包含量化成果？',
        '技能关键词是否完整？',
        '描述是否简洁有力？'
      ],
      output: { type: '简历材料', title: '简历项目描述', desc: '基于STAR法则的简历描述，突出分析能力和量化成果。', banner: 'b1', icon: '📄' } },
    { day: 27, title: '面试高频问题练习', type: 'practice', time: 55, template: 'qa-practice', desc: '练习商业分析师面试高频问题。',
      steps: [
        '搜索整理商业分析师面试高频题（牛客网、知乎）',
        '练习分析方法类：如何做漏斗分析、如何设计A/B测试',
        '练习业务理解类：如何衡量一个业务健康度',
        '练习SQL/Python技术类：手写查询、pandas操作',
        '为每类题目整理回答框架并录音练习'
      ],
      tools: ['牛客网 (nowcoder.com)', '知乎', 'LeetCode (leetcode.cn)', '手机录音'],
      checklist: [
        '是否整理了15道以上高频题？',
        '分析方法和业务理解题能否作答？',
        'SQL手写是否熟练？',
        '口述表达是否流畅？'
      ],
      output: { type: '路演稿', title: '面试问答库', desc: '高频问题及回答框架，含分析方法和业务理解类。', banner: 'b2', icon: '💬' } },
    { day: 28, title: '模拟面试实战', type: 'practice', time: 60, template: 'mock', desc: '完成完整模拟面试。',
      steps: [
        '找一位从业者或同学作为面试官，约定1小时模拟面试',
        '准备3分钟自我介绍和5分钟项目讲解',
        '练习回答行为面试题和技术题',
        '面试后请面试官给出反馈：表达、逻辑、技术深度',
        '撰写复盘文档，记录不足和改进计划'
      ],
      tools: ['腾讯会议/飞书会议', 'Notion (notion.so)', '牛客网 (nowcoder.com)'],
      checklist: [
        '自我介绍是否流畅？',
        '项目讲解是否清晰？',
        '是否获得面试官反馈？',
        '改进计划是否明确？'
      ],
      output: { type: '路演稿', title: '模拟面试复盘', desc: '模拟面试复盘，含分析能力评估和改进。', banner: 'b2', icon: '🎯' } },
    { day: 29, title: 'SQL/Python技能查漏补缺', type: 'practice', time: 50, template: 'default', desc: '针对面试薄弱项做专项练习。',
      steps: [
        '回顾模拟面试中暴露的技术薄弱点',
        '针对SQL薄弱项（如窗口函数）做专项刷题10道',
        '针对Python薄弱项（如pandas高级操作）做练习',
        '整理易错题和知识盲区笔记',
        '重新做错题验证是否掌握'
      ],
      tools: ['LeetCode (leetcode.cn)', 'SQLZoo (sqlzoo.net)', 'Jupyter Notebook', 'VS Code'],
      checklist: [
        '薄弱项是否识别？',
        '专项刷题是否完成？',
        '易错题是否整理？',
        '错题重做是否正确？'
      ],
      output: { type: '学习笔记', title: '技能查漏补缺', desc: '薄弱项专项练习记录，含易错题和知识点。', banner: 'b1', icon: '📚' } },
    { day: 30, title: '30天成长总结与求职计划', type: 'output', time: 45, template: 'summary', desc: '总结30天成长，制定求职计划。',
      steps: [
        '回顾30天所有产出：分析报告、看板、作品集、面试题',
        '梳理能力提升：SQL、Python、分析方法的掌握程度',
        '制定求职计划：目标公司、投递时间、面试准备',
        '整理可复用资产：分析模板、代码片段、看板模板',
        '撰写总结文档，记录心得和后续方向'
      ],
      tools: ['Notion (notion.so)', 'VS Code', 'Boss直聘 (zhipin.com)', '拉勾 (lagou.com)'],
      checklist: [
        '是否梳理了30天所有产出？',
        '能力提升是否有清晰自评？',
        '求职计划是否具体可执行？',
        '可复用资产是否整理？'
      ],
      output: { type: '总结文档', title: '30天成长总结', desc: '完整成长总结，含能力提升、作品集和求职计划。', banner: 'b1', icon: '🏁' } },
  ],

  '增长策略师': [
    { day: 1, title: '建立增长全貌认知', type: 'learn', time: 45, template: 'note', desc: '学习AARRR模型、增长漏斗和北极星指标概念。',
      steps: [
        '搜索阅读增长黑客相关文章，了解增长黑客方法论',
        '学习AARRR模型：获客 Acquisition、激活 Activation、留存 Retention、变现 Revenue、推荐 Referral',
        '理解增长漏斗各环节的转化逻辑',
        '学习北极星指标概念：如何选定产品的核心指标',
        '记录核心概念到笔记，附上1-2个案例'
      ],
      tools: ['Google搜索', '人人都是产品经理 (woshipm.com)', 'Notion (notion.so)', 'VS Code'],
      checklist: [
        '能否说出AARRR模型的5个环节？',
        '增长漏斗的转化逻辑是否理解？',
        '北极星指标的概念是否清楚？',
        '是否记录了案例帮助理解？'
      ],
      output: { type: '学习笔记', title: '增长认知笔记', desc: 'AARRR模型和增长方法论笔记，含核心概念和案例。', banner: 'b1', icon: '📝' } },
    { day: 2, title: '拆解3个产品的增长策略', type: 'learn', time: 45, template: 'competitor', desc: '选择3个产品，拆解其增长路径、渠道选择和获客方式。',
      steps: [
        '选择3个熟悉的产品（如拼多多、小红书、字节跳动产品）',
        '逐一分析其增长路径：冷启动 → 裂变 → 规模化',
        '拆解每个产品的核心获客渠道（自然流量、付费、裂变）',
        '记录每个产品的增长亮点和可借鉴点',
        '对比3个产品的增长策略差异'
      ],
      tools: ['人人都是产品经理 (woshipm.com)', '36氪 (36kr.com)', 'Notion (notion.so)', 'VS Code'],
      checklist: [
        '3个产品的增长路径是否清晰拆解？',
        '每个产品的获客渠道是否列出？',
        '增长亮点是否有提炼？',
        '对比分析是否有洞察？'
      ],
      output: { type: '渠道策略文档', title: '增长策略拆解', desc: '3个产品增长策略对比，含渠道、获客和留存分析。', banner: 'b2', icon: '🔍' } },
    { day: 3, title: '在巨量引擎/腾讯广告模拟投放计划', type: 'output', time: 60, template: 'default', desc: '注册巨量引擎或腾讯广告平台，为一个产品设计完整的投放计划。',
      steps: [
        '注册巨量引擎（oceanengine.com）或腾讯广告（e.qq.com）平台账号',
        '熟悉后台功能（计划/组/广告/创意）',
        '为一个产品设计7天投放计划（含预算/定向/出价）',
        '设计3组A/B测试创意',
        '产出投放计划文档（可用模拟数据）'
      ],
      tools: ['巨量引擎 (oceanengine.com)', '腾讯广告 (e.qq.com)', 'Excel'],
      checklist: [
        '是否注册了广告平台？',
        '是否设计了完整投放计划？',
        '是否有A/B测试创意？',
        '是否产出了计划文档？'
      ],
      output: { type: '渠道策略文档', title: '广告投放计划', desc: '广告投放计划，含7天投放方案、定向出价和A/B测试创意。', banner: 'b2', icon: '📡' } },
    { day: 4, title: '学习内容策略方法论', type: 'learn', time: 40, template: 'note', desc: '学习内容选题、内容矩阵和分发策略。',
      steps: [
        '搜索学习内容策略方法论：选题、创作、分发',
        '学习内容矩阵模型：引流内容、信任内容、转化内容',
        '学习分发策略：多平台分发、发布节奏、内容复用',
        '访问小红书或抖音研究热门内容选题规律',
        '记录内容策略的4步流程'
      ],
      tools: ['小红书 (xiaohongshu.com)', '抖音 (douyin.com)', 'Google搜索', 'Notion (notion.so)'],
      checklist: [
        '内容矩阵的3类内容是否理解？',
        '分发策略是否掌握？',
        '是否研究了热门内容规律？',
        '4步流程是否记录完整？'
      ],
      output: { type: '学习笔记', title: '内容策略笔记', desc: '内容策略方法论，含选题方法和分发模型。', banner: 'b1', icon: '📚' } },
    { day: 5, title: '制定一个内容策略方案', type: 'output', time: 55, template: 'default', desc: '为某产品设计一个月的内容策略，含选题、发布节奏和目标。',
      steps: [
        '选择一个产品（如一款健身APP）',
        '确定目标用户画像和内容主题方向',
        '设计内容选题矩阵：每周4篇内容的选题和类型',
        '制定发布日历：发布时间、平台和频率',
        '设定内容效果指标：阅读量、互动率、转化率'
      ],
      tools: ['Notion (notion.so)', 'Excel/WPS表格', '小红书 (xiaohongshu.com)', 'VS Code'],
      checklist: [
        '用户画像是否清晰？',
        '选题矩阵是否覆盖引流和转化？',
        '发布日历是否具体可执行？',
        '效果指标是否可衡量？'
      ],
      output: { type: '内容策略方案', title: '内容策略方案', desc: '完整内容策略，含选题矩阵、发布日历和效果指标。', banner: 'b2', icon: '✍️' } },
    { day: 6, title: '学习增长实验设计', type: 'learn', time: 40, template: 'note', desc: '学习增长实验的假设设计、执行流程和结果解读。',
      steps: [
        '搜索学习增长实验方法论：假设驱动增长',
        '学习实验设计流程：假设 → 方案 → 执行 → 评估',
        '学习MVP测试：用最小成本验证假设',
        '了解实验结果解读：显著性、效果量、可信区间',
        '记录增长实验的5步法'
      ],
      tools: ['Google搜索', '人人都是产品经理 (woshipm.com)', 'Notion (notion.so)', 'VS Code'],
      checklist: [
        '假设驱动增长的概念是否理解？',
        '实验设计的5步法是否清楚？',
        'MVP测试的方法是否掌握？',
        '结果解读方法是否记录？'
      ],
      output: { type: '学习笔记', title: '增长实验笔记', desc: '增长实验方法论，含假设设计和MVP测试流程。', banner: 'b1', icon: '🧪' } },
    { day: 7, title: '第一周复盘：增长认知', type: 'output', time: 40, template: 'review', desc: '总结增长方法论掌握情况，评估能力水平。',
      steps: [
        '整理本周学习笔记和分析产出',
        '自评AARRR、渠道策略、内容策略、实验设计的掌握程度',
        '列出薄弱项和需要补强的知识点',
        '撰写复盘文档，制定第二周重点'
      ],
      tools: ['Notion (notion.so)', 'VS Code', 'Markdown编辑器'],
      checklist: [
        '本周笔记是否归档？',
        '能力自评是否客观？',
        '薄弱项是否列出？',
        '第二周计划是否明确？'
      ],
      output: { type: '复盘文档', title: '第一周复盘', desc: '增长认知评估，含方法论掌握和薄弱项。', banner: 'b1', icon: '✅' } },
    { day: 8, title: '完成一个增长实验设计', type: 'output', time: 55, template: 'abtest', desc: '设计一个完整的增长实验，含假设、变量、指标和预期。',
      steps: [
        '选择一个实验场景（如优化注册流程提升转化）',
        '撰写实验假设：如"简化注册步骤可提升注册率20%"',
        '定义实验变量：对照组vs实验组的具体差异',
        '确定评估指标：核心指标（注册率）+ 辅助指标（耗时）',
        '预估实验样本量和预期效果'
      ],
      tools: ['Notion (notion.so)', 'Excel/WPS表格', 'VS Code', 'Optimizely (optimizely.com)'],
      checklist: [
        '实验假设是否清晰可验证？',
        '实验变量是否明确定义？',
        '评估指标是否合理？',
        '样本量预估是否科学？'
      ],
      output: { type: '实验报告', title: '增长实验设计', desc: '完整实验设计方案，含假设、执行步骤和评估指标。', banner: 'b2', icon: '🔬' } },
    { day: 9, title: '学习用户留存分析方法', type: 'learn', time: 40, template: 'note', desc: '学习留存曲线、同期群分析和流失预警。',
      steps: [
        '搜索学习留存分析概念：次日留存、7日留存、30日留存',
        '学习留存曲线解读：下降趋势和稳定拐点',
        '学习同期群分析（Cohort Analysis）：按时间分组追踪',
        '了解流失预警模型：识别高流失风险用户',
        '记录留存分析的3种方法'
      ],
      tools: ['Google搜索', '知乎', '人人都是产品经理 (woshipm.com)', 'Notion (notion.so)'],
      checklist: [
        '留存率的概念是否理解？',
        '留存曲线解读方法是否掌握？',
        '同期群分析的原理是否清楚？',
        '流失预警方法是否记录？'
      ],
      output: { type: '学习笔记', title: '留存分析笔记', desc: '留存分析方法论，含曲线解读和同期群分析。', banner: 'b1', icon: '📈' } },
    { day: 10, title: '完成用户留存分析', type: 'output', time: 55, template: 'default', desc: '用模拟数据完成留存分析，输出留存曲线和优化建议。',
      steps: [
        '用 Excel 或 Python 生成模拟用户留存数据',
        '计算次日、7日、30日留存率',
        '绘制留存曲线图，识别下降拐点',
        '做同期群分析：对比不同周注册用户的留存差异',
        '输出优化建议：如何提升留存拐点'
      ],
      tools: ['Excel/WPS表格', 'Python', 'Jupyter Notebook', 'Notion (notion.so)'],
      checklist: [
        '留存率计算是否正确？',
        '留存曲线是否清晰绘制？',
        '同期群分析是否有对比？',
        '优化建议是否有针对性？'
      ],
      output: { type: '实验报告', title: '用户留存分析', desc: '留存分析报告，含曲线解读、同期群对比和建议。', banner: 'b2', icon: '📊' } },
    { day: 11, title: '学习裂变与推荐机制', type: 'learn', time: 40, template: 'note', desc: '学习裂变模型、推荐激励机制和K因子计算。',
      steps: [
        '搜索学习裂变模型：助力裂变、拼团裂变、分销裂变',
        '学习推荐激励机制设计：双边奖励、阶梯奖励',
        '学习K因子计算：K = 邀请率 × 接受率 × 邀请数',
        '研究拼多多、美团等裂变案例',
        '记录裂变机制设计的3个关键要素'
      ],
      tools: ['Google搜索', '人人都是产品经理 (woshipm.com)', 'Notion (notion.so)', 'VS Code'],
      checklist: [
        '能否说出3种裂变模型？',
        '推荐激励机制设计是否理解？',
        'K因子的计算公式是否掌握？',
        '是否分析了裂变案例？'
      ],
      output: { type: '学习笔记', title: '裂变机制笔记', desc: '裂变方法论，含模型类型、激励机制和效果衡量。', banner: 'b1', icon: '🔄' } },
    { day: 12, title: '设计一个裂变活动方案', type: 'output', time: 55, template: 'default', desc: '设计完整的裂变活动方案，含机制、预算和预期效果。',
      steps: [
        '选择一个产品场景（如一款阅读APP的拉新活动）',
        '设计裂变机制：邀请好友得会员、被邀请人得福利',
        '设计活动流程：触发 → 分享 → 接受 → 奖励发放',
        '制定活动预算：奖励成本、推广费用',
        '预估K因子和新增用户量'
      ],
      tools: ['Notion (notion.so)', 'Excel/WPS表格', 'ProcessOn (processon.com)', 'VS Code'],
      checklist: [
        '裂变机制是否有吸引力？',
        '活动流程是否顺畅？',
        '预算是否合理？',
        'K因子和预期效果是否预估？'
      ],
      output: { type: '渠道策略文档', title: '裂变活动方案', desc: '裂变活动方案，含机制设计、流程和效果预估。', banner: 'b2', icon: '🚀' } },
    { day: 13, title: '学习增长数据分析', type: 'practice', time: 50, template: 'dashboard', desc: '搭建增长数据看板，监控核心增长指标。',
      steps: [
        '确定增长看板核心指标：获客数、激活率、留存率、变现',
        '用 Excel 或可视化工具搭建看板框架',
        '设计指标卡片：每个指标展示数值、趋势和对比',
        '添加趋势图：按日/周/月展示指标变化',
        '设定预警阈值：关键指标异常时标红'
      ],
      tools: ['Excel/WPS表格', 'Tableau (tableau.com)', 'Notion (notion.so)', 'VS Code'],
      checklist: [
        '看板是否覆盖AARRR各环节？',
        '指标卡片是否清晰？',
        '趋势图是否完整？',
        '预警机制是否设置？'
      ],
      output: { type: '实验报告', title: '增长数据看板', desc: '增长看板，含获客、激活、留存和变现指标。', banner: 'b3', icon: '📊' } },
    { day: 14, title: '第二周复盘：增长能力', type: 'output', time: 40, template: 'review', desc: '回顾增长能力构建，总结提升和待加强项。',
      steps: [
        '整理第二周所有分析产出和方案',
        '评估实验设计、留存分析、裂变设计的掌握程度',
        '总结增长能力的应用熟练度',
        '制定第三周实战项目重点'
      ],
      tools: ['Notion (notion.so)', 'VS Code', 'Markdown编辑器'],
      checklist: [
        '第二周产出是否归档？',
        '实验和留存分析是否掌握？',
        '裂变设计能力是否达标？',
        '第三周重点是否明确？'
      ],
      output: { type: '复盘文档', title: '第二周复盘', desc: '增长能力评估，含策略设计和实验能力。', banner: 'b1', icon: '📋' } },
    { day: 15, title: '选定实战项目方向', type: 'practice', time: 40, template: 'project-plan', desc: '选定一个增长方向，明确目标、渠道和交付物。',
      steps: [
        '选择一个增长方向（如某SaaS产品的用户增长）',
        '明确增长目标：如30天新增用户X万、留存率提升Y%',
        '确定可用渠道和增长策略组合',
        '明确交付物：渠道策略、内容策略、实验方案、复盘报告',
        '制定项目里程碑和各阶段交付时间'
      ],
      tools: ['Notion (notion.so)', 'Excel/WPS表格', 'VS Code', 'ProcessOn (processon.com)'],
      checklist: [
        '增长目标是否具体可衡量？',
        '渠道组合是否合理？',
        '交付物是否明确？',
        '里程碑是否可执行？'
      ],
      output: { type: '项目计划', title: '增长实战计划', desc: '增长项目计划，含目标、渠道选择和交付里程碑。', banner: 'b1', icon: '🎯' } },
    { day: 16, title: '完成渠道策略方案', type: 'output', time: 60, template: 'default', desc: '为实战项目设计完整渠道策略，含选择逻辑和预算。',
      steps: [
        '列出实战项目可用的获客渠道：信息流、搜索、内容、裂变',
        '对比各渠道的获客成本、用户质量和预期规模',
        '制定渠道选择逻辑：主渠道 + 辅助渠道',
        '分配预算：总预算按渠道权重分配',
        '输出渠道策略方案文档'
      ],
      tools: ['Notion (notion.so)', 'Excel/WPS表格', '艾瑞咨询 (iresearch.com.cn)', 'VS Code'],
      checklist: [
        '渠道对比是否全面？',
        '选择逻辑是否有依据？',
        '预算分配是否合理？',
        '方案文档是否完整？'
      ],
      output: { type: '渠道策略文档', title: '实战渠道策略', desc: '完整渠道策略，含渠道对比、选择和预算分配。', banner: 'b2', icon: '📡' } },
    { day: 17, title: '完成内容策略方案', type: 'output', time: 55, template: 'default', desc: '为实战项目设计内容策略，含选题矩阵和发布计划。',
      steps: [
        '确定实战项目的内容目标和目标用户',
        '设计选题矩阵：引流内容、信任内容、转化内容',
        '制定4周内容发布日历：每天的内容主题和类型',
        '确定分发渠道：小红书、公众号、抖音等',
        '设定内容效果指标和评估方法'
      ],
      tools: ['Notion (notion.so)', 'Excel/WPS表格', '小红书 (xiaohongshu.com)', 'VS Code'],
      checklist: [
        '选题矩阵是否覆盖转化漏斗？',
        '发布日历是否具体？',
        '分发渠道是否匹配目标用户？',
        '效果指标是否可衡量？'
      ],
      output: { type: '内容策略方案', title: '实战内容策略', desc: '内容策略方案，含选题、日历和效果指标。', banner: 'b2', icon: '✍️' } },
    { day: 18, title: '设计增长实验方案', type: 'output', time: 55, template: 'abtest', desc: '设计2-3个增长实验，含假设、执行和评估。',
      steps: [
        '识别2-3个增长机会点（如优化落地页、调整引导流程）',
        '为每个实验撰写假设：如"优化落地页文案可提升转化15%"',
        '设计实验方案：对照组vs实验组、样本量、周期',
        '定义评估指标和成功标准',
        '制定实验执行排期'
      ],
      tools: ['Notion (notion.so)', 'Excel/WPS表格', 'Optimizely (optimizely.com)', 'VS Code'],
      checklist: [
        '实验假设是否可验证？',
        '方案设计是否科学？',
        '评估指标是否明确？',
        '执行排期是否合理？'
      ],
      output: { type: '实验报告', title: '增长实验方案', desc: '实验方案，含假设设计、执行步骤和评估指标。', banner: 'b2', icon: '🔬' } },
    { day: 19, title: '完成投放效果复盘与策略迭代', type: 'output', time: 60, template: 'dashboard', desc: '基于模拟投放数据完成效果复盘，提炼可复用的增长策略。',
      steps: [
        '设计模拟投放效果数据（CTR/CVR/CPC/ROI）',
        '分析各渠道效果对比',
        '定位效果最好的渠道和创意',
        '提炼3条可复用策略',
        '产出复盘报告含下一步迭代计划'
      ],
      tools: ['Excel/Google Sheets', 'Notion (notion.so)'],
      checklist: [
        '是否分析了多渠道效果？',
        '是否定位了最优渠道？',
        '是否提炼了可复用策略？',
        '复盘是否含迭代计划？'
      ],
      output: { type: '实验报告', title: '投放效果复盘报告', desc: '投放效果复盘报告，含多渠道效果对比、最优渠道定位和迭代计划。', banner: 'b2', icon: '📈' } },
    { day: 20, title: '撰写阶段复盘文档', type: 'output', time: 55, template: 'review', desc: '完成实战项目阶段复盘，含策略评估和效果分析。',
      steps: [
        '汇总渠道策略、内容策略、实验方案的设计要点',
        '评估各策略的预期效果和可行性',
        '分析实验设计的假设是否合理',
        '总结阶段成果和待改进点',
        '制定后续优化方向'
      ],
      tools: ['Notion (notion.so)', 'VS Code', 'Markdown编辑器'],
      checklist: [
        '策略评估是否全面？',
        '可行性分析是否充分？',
        '待改进点是否列出？',
        '后续方向是否明确？'
      ],
      output: { type: '复盘文档', title: '增长阶段复盘', desc: '阶段复盘，含策略效果、实验结论和下一步计划。', banner: 'b1', icon: '📋' } },
    { day: 21, title: '实战中期复盘', type: 'output', time: 40, template: 'review', desc: '检查项目完成度，调整后续计划。',
      steps: [
        '对照项目计划检查已完成模块',
        '评估方案质量和策略深度',
        '整理遗留问题和待完善项',
        '调整后续计划确保关键产出完成'
      ],
      tools: ['Notion (notion.so)', 'VS Code', 'Markdown编辑器'],
      checklist: [
        '项目完成度是否达到70%？',
        '方案质量是否达标？',
        '遗留问题是否列出？',
        '后续计划是否调整？'
      ],
      output: { type: '复盘文档', title: '实战中期复盘', desc: '项目中期检查，含策略执行和效果评估。', banner: 'b1', icon: '✅' } },
    { day: 22, title: '制作增长策略汇报', type: 'output', time: 55, template: 'deck', desc: '将策略方案和实验结果整理为汇报文档。',
      steps: [
        '设计汇报结构：背景 → 策略 → 实验 → 效果 → 建议',
        '提炼每页核心信息，一页一个观点',
        '将数据图表插入汇报文档',
        '添加演讲者备注，准备口述讲解',
        '检查排版和视觉一致性'
      ],
      tools: ['PowerPoint/Keynote', 'WPS', '飞书文档 (feishu.cn)', 'Canva (canva.com)'],
      checklist: [
        '汇报结构是否完整？',
        '每页是否一个观点？',
        '图表是否清晰？',
        '是否有演讲者备注？'
      ],
      output: { type: '复盘文档', title: '增长策略汇报', desc: '汇报文档，含策略方案、实验结果和建议。', banner: 'b3', icon: '🎬' } },
    { day: 23, title: '模拟策略评审', type: 'practice', time: 50, template: 'review-sim', desc: '模拟策略评审会，练习讲解和答辩。',
      steps: [
        '找一位同学或同行作为评审，约定30分钟模拟评审',
        '用15分钟讲解策略方案和实验设计',
        '预留15分钟回答评审提问和质疑',
        '请评审给出反馈：逻辑、可行性、表达',
        '记录答辩改进点'
      ],
      tools: ['腾讯会议/飞书会议', 'PowerPoint', 'Notion (notion.so)'],
      checklist: [
        '讲解是否在规定时间内完成？',
        '能否流畅回答质疑？',
        '是否获得评审反馈？',
        '改进点是否记录？'
      ],
      output: { type: '复盘文档', title: '模拟评审记录', desc: '评审记录，含讲解要点和问答改进。', banner: 'b1', icon: '🎤' } },
    { day: 24, title: '整理增长作品集', type: 'output', time: 55, template: 'final', desc: '将所有产出整理成作品集。',
      steps: [
        '汇总所有策略产出：渠道策略、内容策略、实验方案、复盘报告',
        '用 Notion 或飞书文档创建作品集页面',
        '为每个项目编写简介：背景、方法、成果',
        '整理汇报文档和演示材料',
        '检查所有链接和材料可访问性'
      ],
      tools: ['Notion (notion.so)', '飞书文档 (feishu.cn)', 'GitHub (github.com)', 'VS Code'],
      checklist: [
        '所有产出是否汇总？',
        '项目简介是否完整？',
        '汇报材料是否整理？',
        '所有链接是否可访问？'
      ],
      output: { type: '作品集', title: '增长策略作品集', desc: '完整作品集，含渠道策略、内容策略和实验报告。', banner: 'b1', icon: '🏆' } },
    { day: 25, title: '作品集最终打磨', type: 'output', time: 50, template: 'polish', desc: '打磨作品集，确保专业度。',
      steps: [
        '检查作品集视觉一致性：配色、排版、字体',
        '优化项目描述，突出增长成果',
        '补充图表和数据可视化',
        '请2-3人体验作品集，收集反馈',
        '根据反馈做最后调整'
      ],
      tools: ['Notion (notion.so)', 'Canva (canva.com)', '飞书文档 (feishu.cn)'],
      checklist: [
        '视觉是否统一专业？',
        '描述是否突出成果？',
        '图表是否补充完整？',
        '是否经过他人反馈？'
      ],
      output: { type: '作品集', title: '作品集终版', desc: '打磨后的作品集，适合求职展示。', banner: 'b1', icon: '✨' } },
    { day: 26, title: '简历项目描述优化', type: 'output', time: 50, template: 'resume', desc: '将增长成果转化为简历描述。',
      steps: [
        '用 STAR 法则梳理增长项目：情境、任务、行动、结果',
        '编写3-4条简历描述，每条以动词开头',
        '量化成果：如"设计增长实验提升转化X%""获客成本降低Y%"',
        '列出增长技能关键词：AARRR、裂变、A/B测试、留存分析',
        '请同学或导师审阅优化'
      ],
      tools: ['超级简历 (wondercv.com)', 'Notion (notion.so)', 'VS Code'],
      checklist: [
        '描述是否用STAR法则？',
        '是否包含量化成果？',
        '技能关键词是否完整？',
        '描述是否简洁有力？'
      ],
      output: { type: '简历材料', title: '简历项目描述', desc: '基于STAR法则的简历描述，突出增长成果。', banner: 'b1', icon: '📄' } },
    { day: 27, title: '面试高频问题练习', type: 'practice', time: 55, template: 'qa-practice', desc: '练习增长策略师面试高频问题。',
      steps: [
        '搜索整理增长策略师面试高频题（牛客网、知乎）',
        '练习方法论类：如何设计增长实验、如何选择获客渠道',
        '练习案例分析类：分析某产品的增长策略',
        '练习数据分析类：如何解读留存曲线',
        '为每类题目整理回答框架并录音练习'
      ],
      tools: ['牛客网 (nowcoder.com)', '知乎', '人人都是产品经理 (woshipm.com)', '手机录音'],
      checklist: [
        '是否整理了15道以上高频题？',
        '方法论题能否作答？',
        '案例分析是否有框架？',
        '口述表达是否流畅？'
      ],
      output: { type: '路演稿', title: '面试问答库', desc: '高频问题及回答，含增长方法论和案例分析类。', banner: 'b2', icon: '💬' } },
    { day: 28, title: '模拟面试实战', type: 'practice', time: 60, template: 'mock', desc: '完成完整模拟面试。',
      steps: [
        '找一位从业者或同学作为面试官，约定1小时模拟面试',
        '准备3分钟自我介绍和5分钟项目讲解',
        '练习回答策略题和案例题',
        '面试后请面试官给出反馈：表达、逻辑、策略深度',
        '撰写复盘文档，记录不足和改进计划'
      ],
      tools: ['腾讯会议/飞书会议', 'Notion (notion.so)', '牛客网 (nowcoder.com)'],
      checklist: [
        '自我介绍是否流畅？',
        '项目讲解是否清晰？',
        '是否获得面试官反馈？',
        '改进计划是否明确？'
      ],
      output: { type: '路演稿', title: '模拟面试复盘', desc: '模拟面试复盘，含策略表达评估和改进。', banner: 'b2', icon: '🎯' } },
    { day: 29, title: '增长案例库整理', type: 'output', time: 45, template: 'default', desc: '整理3-5个增长案例，用于面试举例。',
      steps: [
        '选择3-5个经典增长案例（如拼多多裂变、抖音算法推荐）',
        '为每个案例拆解：背景 → 策略 → 执行 → 效果',
        '提炼可复用的增长策略和模式',
        '将案例整理成结构化文档',
        '准备面试口述版本的精简讲解'
      ],
      tools: ['Notion (notion.so)', '人人都是产品经理 (woshipm.com)', '36氪 (36kr.com)', 'VS Code'],
      checklist: [
        '是否整理了3-5个案例？',
        '每个案例是否结构化拆解？',
        '可复用策略是否提炼？',
        '是否有面试口述版本？'
      ],
      output: { type: '复盘文档', title: '增长案例库', desc: '增长案例集，含案例分析和可复用策略。', banner: 'b1', icon: '📚' } },
    { day: 30, title: '30天成长总结与求职计划', type: 'output', time: 45, template: 'summary', desc: '总结30天成长，制定求职计划。',
      steps: [
        '回顾30天所有产出：策略方案、实验设计、作品集、面试题',
        '梳理能力提升：增长方法论、渠道策略、实验设计的掌握程度',
        '制定求职计划：目标公司、投递时间、面试准备',
        '整理可复用资产：策略模板、案例库、分析框架',
        '撰写总结文档，记录心得和后续方向'
      ],
      tools: ['Notion (notion.so)', 'VS Code', 'Boss直聘 (zhipin.com)', '拉勾 (lagou.com)'],
      checklist: [
        '是否梳理了30天所有产出？',
        '能力提升是否有清晰自评？',
        '求职计划是否具体可执行？',
        '可复用资产是否整理？'
      ],
      output: { type: '总结文档', title: '30天成长总结', desc: '完整成长总结，含能力提升、作品集和求职计划。', banner: 'b1', icon: '🏁' } },
  ],

  'AI解决方案顾问': [
    { day: 1, title: '建立AI行业认知框架', type: 'learn', time: 45, template: 'note', desc: '梳理AI行业产业链、主要玩家和技术趋势，建立行业全景图。',
      steps: [
        '搜索阅读AI行业报告（如艾瑞咨询、36氪行业报告）',
        '梳理AI产业链：基础层（算力/数据）、技术层（算法/模型）、应用层（解决方案）',
        '记录主要玩家：OpenAI、百度、阿里、腾讯、华为等定位和产品',
        '了解当前技术趋势：大模型、Agent、多模态、垂直行业应用',
        '绘制AI行业全景图（可用思维导图工具）'
      ],
      tools: ['艾瑞咨询 (iresearch.com.cn)', '36氪 (36kr.com)', 'XMind (xmind.cn)', 'Notion (notion.so)'],
      checklist: [
        '能否说出AI产业链的3个层次？',
        '主要玩家的定位是否清楚？',
        '是否了解了2-3个技术趋势？',
        '行业全景图是否绘制完成？'
      ],
      output: { type: '学习笔记', title: 'AI行业认知笔记', desc: '行业全景图，含产业链、玩家和技术趋势。', banner: 'b1', icon: '🧠' } },
    { day: 2, title: '学习ToB业务基础', type: 'learn', time: 45, template: 'note', desc: '学习ToB销售流程、客户决策链和解决方案销售方法论。',
      steps: [
        '搜索学习ToB销售流程：线索 → 商机 → 方案 → 报价 → 成交',
        '学习客户决策链：使用者、评估者、决策者、财务审批者',
        '学习解决方案销售方法论：SPIN提问法、顾问式销售',
        '了解ToB与ToC销售的核心差异',
        '记录ToB销售的关键节点和注意事项'
      ],
      tools: ['知乎', '人人都是产品经理 (woshipm.com)', 'Notion (notion.so)', 'VS Code'],
      checklist: [
        'ToB销售流程的5个阶段是否清楚？',
        '客户决策链的4类角色是否理解？',
        'SPIN提问法是否掌握？',
        'ToB和ToC差异是否明确？'
      ],
      output: { type: '学习笔记', title: 'ToB业务笔记', desc: 'ToB销售方法论，含决策链分析和解决方案销售流程。', banner: 'b1', icon: '🏢' } },
    { day: 3, title: '拆解一个AI解决方案案例', type: 'output', time: 60, template: 'competitor', desc: '选择一个AI解决方案案例，拆解其客户场景、方案设计和价值点。',
      steps: [
        '在华为云、百度智能云、阿里云官网寻找AI解决方案案例',
        '选择一个案例（如智能客服、智能质检、文档智能）',
        '拆解客户场景：客户是谁、业务痛点是什么',
        '拆解方案设计：用了什么AI技术、如何落地',
        '提炼方案价值点：降本、增效、提质、创新'
      ],
      tools: ['华为云 (huaweicloud.com)', '百度智能云 (cloud.baidu.com)', '阿里云 (aliyun.com)', 'Notion (notion.so)'],
      checklist: [
        '客户场景和痛点是否清晰？',
        '方案设计的技术选型是否理解？',
        '价值点是否有量化数据？',
        '案例拆解是否结构化？'
      ],
      output: { type: '方案拆解文档', title: 'AI方案拆解', desc: '解决方案案例拆解，含场景、方案和价值分析。', banner: 'b2', icon: '🔍' } },
    { day: 4, title: '学习方案设计方法论', type: 'learn', time: 40, template: 'note', desc: '学习需求洞察、方案架构设计和价值量化的方法。',
      steps: [
        '搜索学习需求洞察方法：用户访谈、场景分析、痛点挖掘',
        '学习方案架构设计：业务层 → 能力层 → 技术层',
        '学习价值量化方法：ROI计算、效率提升百分比、成本节约',
        '了解方案设计文档的标准结构',
        '记录方案设计的5步法'
      ],
      tools: ['知乎', '人人都是产品经理 (woshipm.com)', 'Notion (notion.so)', 'VS Code'],
      checklist: [
        '需求洞察方法是否掌握？',
        '方案架构的3层结构是否理解？',
        '价值量化方法是否清楚？',
        '5步法是否记录完整？'
      ],
      output: { type: '学习笔记', title: '方案设计笔记', desc: '方案设计方法论，含需求洞察和架构设计。', banner: 'b1', icon: '📝' } },
    { day: 5, title: '完成一个客户场景分析', type: 'output', time: 55, template: 'default', desc: '选择一个行业客户，分析其业务场景、痛点和AI赋能机会。',
      steps: [
        '选择一个行业（如制造业、零售业、金融业）',
        '描述目标客户画像：企业规模、业务模式、IT现状',
        '梳理客户核心业务流程和关键场景',
        '识别业务痛点：效率低、成本高、质量不稳定',
        '分析AI赋能机会点：哪些痛点可用AI解决'
      ],
      tools: ['Notion (notion.so)', 'XMind (xmind.cn)', '艾瑞咨询 (iresearch.com.cn)', 'VS Code'],
      checklist: [
        '客户画像是否清晰？',
        '业务流程是否梳理完整？',
        '痛点识别是否有依据？',
        'AI赋能机会点是否合理？'
      ],
      output: { type: '客户场景分析', title: '客户场景分析', desc: '客户场景分析，含业务流程、痛点和AI赋能点。', banner: 'b2', icon: '👤' } },
    { day: 6, title: '学习价值链分析', type: 'learn', time: 40, template: 'note', desc: '学习价值链模型、ROI计算和价值量化方法。',
      steps: [
        '搜索学习价值链模型：迈克尔波特价值链分析法',
        '学习ROI计算方法：投资回报率 = (收益-成本)/成本',
        '学习价值量化的维度：直接经济价值、效率价值、战略价值',
        '了解如何将AI方案价值转化为客户可理解的数字',
        '记录价值链分析的步骤和计算模板'
      ],
      tools: ['知乎', 'Google搜索', 'Notion (notion.so)', 'Excel/WPS表格'],
      checklist: [
        '价值链模型是否理解？',
        'ROI计算公式是否掌握？',
        '价值量化的3个维度是否清楚？',
        '是否有可复用的计算模板？'
      ],
      output: { type: '学习笔记', title: '价值链分析笔记', desc: '价值链方法论，含模型和ROI计算方法。', banner: 'b1', icon: '📈' } },
    { day: 7, title: '第一周复盘：行业认知', type: 'output', time: 40, template: 'review', desc: '总结AI行业和ToB业务认知掌握情况。',
      steps: [
        '整理本周所有笔记和分析产出',
        '自评行业认知、ToB业务、方案设计、价值链的掌握程度',
        '列出薄弱项和需要补强的知识',
        '撰写复盘文档，制定第二周重点'
      ],
      tools: ['Notion (notion.so)', 'VS Code', 'Markdown编辑器'],
      checklist: [
        '本周笔记是否归档？',
        '能力自评是否客观？',
        '薄弱项是否明确？',
        '第二周计划是否有针对性？'
      ],
      output: { type: '复盘文档', title: '第一周复盘', desc: '行业认知评估，含知识框架和薄弱项。', banner: 'b1', icon: '✅' } },
    { day: 8, title: '完成一个方案拆解', type: 'output', time: 60, template: 'default', desc: '对一个AI解决方案做完整拆解，含架构、模块和价值点。',
      steps: [
        '选择一个AI解决方案（如智能文档分析平台）',
        '绘制方案架构图：数据层 → AI能力层 → 应用层 → 展示层',
        '拆解每个模块的功能和所用AI技术',
        '分析各模块的价值贡献和客户收益',
        '整理完整的方案拆解文档'
      ],
      tools: ['ProcessOn (processon.com)', 'XMind (xmind.cn)', 'Notion (notion.so)', 'VS Code'],
      checklist: [
        '架构图是否层次清晰？',
        '各模块功能是否拆解完整？',
        '价值点是否有量化？',
        '文档是否结构化？'
      ],
      output: { type: '方案拆解文档', title: '方案架构拆解', desc: '方案完整拆解，含架构图、模块说明和价值点。', banner: 'b2', icon: '🏗️' } },
    { day: 9, title: '完成客户提案模拟与异议处理', type: 'learn', time: 40, template: 'note', desc: '模拟一次AI解决方案客户提案，练习讲解方案和处理客户异议。',
      steps: [
        '准备5页提案PPT（痛点→方案→价值→案例→报价）',
        '找同学/朋友扮演客户模拟提案',
        '预设5个客户常见异议并准备回答',
        '记录模拟过程中的问题和改进点',
        '产出提案记录和改进计划'
      ],
      tools: ['PPT/Keynote', '腾讯会议（录屏）', 'Notion (notion.so)'],
      checklist: [
        '是否准备了完整提案PPT？',
        '是否完成了模拟提案？',
        '是否处理了5个以上异议？',
        '是否产出改进计划？'
      ],
      output: { type: '复盘文档', title: '客户提案模拟记录', desc: '客户提案模拟记录，含提案演练、异议处理和改进计划。', banner: 'b1', icon: '🗣️' } },
    { day: 10, title: '完成价值链模型设计', type: 'output', time: 55, template: 'default', desc: '为一个AI方案设计价值链模型，量化业务价值。',
      steps: [
        '选择一个AI方案（如智能客服系统）',
        '梳理价值链：输入 → 处理 → 输出 → 客户收益',
        '量化每个环节的价值：节省工时、降低成本、提升效率',
        '计算整体ROI：年收益/年成本',
        '绘制价值链模型图并撰写价值说明'
      ],
      tools: ['Excel/WPS表格', 'ProcessOn (processon.com)', 'Notion (notion.so)', 'VS Code'],
      checklist: [
        '价值链是否梳理完整？',
        '各环节价值是否量化？',
        'ROI计算是否合理？',
        '价值说明是否清晰？'
      ],
      output: { type: '价值链模型', title: '方案价值链', desc: '价值链模型，含价值量化、ROI计算和收益预测。', banner: 'b2', icon: '💰' } },
    { day: 11, title: '学习项目管理基础', type: 'learn', time: 40, template: 'note', desc: '学习项目交付流程、风险管理和里程碑管理。',
      steps: [
        '搜索学习AI项目交付流程：需求 → 设计 → 开发 → 测试 → 上线',
        '学习里程碑管理：如何定义关键节点和交付物',
        '学习风险管理：风险识别、评估、应对策略',
        '了解项目验收标准和交付文档要求',
        '记录项目管理的5个关键要素'
      ],
      tools: ['知乎', 'Google搜索', 'Notion (notion.so)', 'VS Code'],
      checklist: [
        '交付流程的5个阶段是否清楚？',
        '里程碑管理方法是否掌握？',
        '风险管理流程是否理解？',
        '验收标准是否明确？'
      ],
      output: { type: '学习笔记', title: '项目管理笔记', desc: '项目管理方法论，含交付流程和风险管理。', banner: 'b1', icon: '📋' } },
    { day: 12, title: '编写招投标文档与项目交付方案', type: 'output', time: 60, template: 'default', desc: '学习ToB招投标流程，编写一份完整的招投标响应文档。',
      steps: [
        '学习招投标基本流程（招标→投标→评标→中标→签约）',
        '分析一个真实招投标案例',
        '编写投标响应文档（含技术方案/商务方案/报价）',
        '设计项目交付里程碑和验收标准',
        '产出招投标文档'
      ],
      tools: ['中国政府采购网 (ccgp.gov.cn)', 'Notion (notion.so)', 'Excel'],
      checklist: [
        '是否理解了招投标流程？',
        '是否分析了真实案例？',
        '是否编写了投标响应文档？',
        '是否设计了交付里程碑？'
      ],
      output: { type: '交付文档', title: '招投标响应文档', desc: '招投标响应文档，含投标响应方案、交付里程碑和验收标准。', banner: 'b2', icon: '📄' } },
    { day: 13, title: '制作方案演示文档', type: 'output', time: 55, template: 'deck', desc: '将方案整理为可演示文档，突出价值和可行性。',
      steps: [
        '设计演示文档结构：背景 → 痛点 → 方案 → 价值 → 案例',
        '每页提炼一个核心信息，避免信息过载',
        '插入方案架构图和价值量化图表',
        '添加演讲者备注，准备口述讲解',
        '检查视觉一致性和专业度'
      ],
      tools: ['PowerPoint/Keynote', 'WPS', '飞书文档 (feishu.cn)', 'Canva (canva.com)'],
      checklist: [
        '演示结构是否逻辑清晰？',
        '每页是否一个核心信息？',
        '图表是否清晰专业？',
        '是否有演讲者备注？'
      ],
      output: { type: '方案拆解文档', title: '方案演示文档', desc: '方案演示，含场景、方案、价值和建议。', banner: 'b3', icon: '🎬' } },
    { day: 14, title: '第二周复盘：方案能力', type: 'output', time: 40, template: 'review', desc: '回顾方案设计和客户洞察能力提升。',
      steps: [
        '整理第二周所有方案产出和文档',
        '评估方案拆解、价值链、交付文档、演示文档的掌握程度',
        '总结方案设计能力的应用熟练度',
        '制定第三周实战项目重点'
      ],
      tools: ['Notion (notion.so)', 'VS Code', 'Markdown编辑器'],
      checklist: [
        '第二周产出是否归档？',
        '方案拆解能力是否达标？',
        '价值链和交付文档是否掌握？',
        '第三周重点是否明确？'
      ],
      output: { type: '复盘文档', title: '第二周复盘', desc: '方案能力评估，含拆解和设计能力。', banner: 'b1', icon: '📋' } },
    { day: 15, title: '选定实战项目方向', type: 'practice', time: 40, template: 'project-plan', desc: '选定一个行业和AI场景，明确交付物和目标。',
      steps: [
        '选择一个行业（如医疗、教育、制造、零售）',
        '确定一个AI应用场景（如医疗影像AI诊断辅助）',
        '明确目标客户画像和核心痛点',
        '确定交付物：场景分析、方案架构、价值链、交付文档、路演稿',
        '制定项目里程碑和时间计划'
      ],
      tools: ['Notion (notion.so)', '艾瑞咨询 (iresearch.com.cn)', 'ProcessOn (processon.com)', 'VS Code'],
      checklist: [
        '行业和场景是否匹配？',
        '目标客户是否具体？',
        '交付物是否明确？',
        '里程碑是否可执行？'
      ],
      output: { type: '项目计划', title: '实战项目计划', desc: '解决方案项目计划，含行业、场景和交付物。', banner: 'b1', icon: '🎯' } },
    { day: 16, title: '完成客户场景深度分析', type: 'output', time: 60, template: 'default', desc: '对实战项目的目标客户做深度场景分析。',
      steps: [
        '描述目标客户详细画像：行业、规模、业务模式',
        '梳理客户核心业务流程的5个关键环节',
        '识别每个环节的痛点和 inefficiency',
        '分析AI技术可赋能的具体场景',
        '输出场景分析文档和流程图'
      ],
      tools: ['ProcessOn (processon.com)', 'XMind (xmind.cn)', 'Notion (notion.so)', 'VS Code'],
      checklist: [
        '客户画像是否详细？',
        '业务流程是否梳理完整？',
        '痛点分析是否有依据？',
        'AI赋能场景是否具体？'
      ],
      output: { type: '客户场景分析', title: '深度场景分析', desc: '客户场景分析，含业务流程、痛点和AI赋能点。', banner: 'b2', icon: '🔍' } },
    { day: 17, title: '完成方案架构拆解', type: 'output', time: 65, template: 'default', desc: '设计完整AI方案架构，含模块、流程和技术选型。',
      steps: [
        '设计方案整体架构：数据层 → AI能力层 → 应用层 → 展示层',
        '拆解每个模块的功能定义和技术选型',
        '设计数据流程：数据采集 → 处理 → AI推理 → 输出',
        '定义模块间接口和交互方式',
        '绘制完整架构图并编写模块说明'
      ],
      tools: ['ProcessOn (processon.com)', 'Draw.io (draw.io)', 'Notion (notion.so)', 'VS Code'],
      checklist: [
        '架构是否分层清晰？',
        '各模块功能是否明确？',
        '数据流程是否完整？',
        '技术选型是否有依据？'
      ],
      output: { type: '方案拆解文档', title: '方案架构设计', desc: '完整方案架构，含模块设计、流程和技术选型。', banner: 'b2', icon: '🏗️' } },
    { day: 18, title: '完成价值链量化分析', type: 'output', time: 55, template: 'default', desc: '对方案做价值量化，含ROI计算和收益预测。',
      steps: [
        '梳理方案价值链：各环节的价值贡献',
        '量化直接价值：节省人力成本、提升处理效率',
        '量化间接价值：减少错误率、提升客户满意度',
        '计算3年ROI：年收益、年成本、回报周期',
        '绘制价值量化图表'
      ],
      tools: ['Excel/WPS表格', 'Notion (notion.so)', 'ProcessOn (processon.com)', 'VS Code'],
      checklist: [
        '价值链是否完整梳理？',
        '直接和间接价值是否量化？',
        'ROI计算是否合理？',
        '图表是否清晰？'
      ],
      output: { type: '价值链模型', title: '方案价值分析', desc: '价值量化分析，含ROI计算、收益预测和对比。', banner: 'b2', icon: '💰' } },
    { day: 19, title: '编写完整交付文档', type: 'output', time: 60, template: 'default', desc: '编写方案交付文档，含范围、里程碑和验收标准。',
      steps: [
        '编写项目范围说明书：包含和不包含的功能',
        '定义5个里程碑：每个阶段交付物和时间节点',
        '制定验收标准：功能验收、性能验收、文档验收',
        '整理风险清单和应对措施',
        '确保文档格式专业和内容完整'
      ],
      tools: ['Word/WPS', 'Notion (notion.so)', 'Excel/WPS表格', 'VS Code'],
      checklist: [
        '范围说明是否清晰？',
        '里程碑是否有交付物？',
        '验收标准是否可衡量？',
        '风险清单是否完整？'
      ],
      output: { type: '交付文档', title: '项目交付文档', desc: '完整交付文档，含范围、里程碑、验收和风险管理。', banner: 'b2', icon: '📄' } },
    { day: 20, title: '制作方案路演稿', type: 'output', time: 55, template: 'deck', desc: '将方案整理为路演稿，突出价值和可行性。',
      steps: [
        '设计路演稿结构：开场 → 痛点 → 方案 → 价值 → 案例 → 结尾',
        '每页提炼一个核心信息，控制信息密度',
        '准备客户故事和数据支撑',
        '设计互动环节和Q&A预案',
        '添加演讲者备注，准备路演口述'
      ],
      tools: ['PowerPoint/Keynote', 'WPS', '飞书文档 (feishu.cn)', 'Canva (canva.com)'],
      checklist: [
        '路演结构是否逻辑清晰？',
        '是否有数据支撑价值？',
        'Q&A预案是否准备？',
        '是否有演讲者备注？'
      ],
      output: { type: '方案拆解文档', title: '方案路演稿', desc: '路演文档，含场景、方案、价值和实施建议。', banner: 'b3', icon: '🎬' } },
    { day: 21, title: '实战中期复盘', type: 'output', time: 40, template: 'review', desc: '检查项目完成度，调整后续计划。',
      steps: [
        '对照项目计划检查已完成模块',
        '评估方案质量和深度',
        '整理遗留问题和待完善项',
        '调整后续计划确保关键产出完成'
      ],
      tools: ['Notion (notion.so)', 'VS Code', 'Markdown编辑器'],
      checklist: [
        '项目完成度是否达到70%？',
        '方案质量是否达标？',
        '遗留问题是否列出？',
        '后续计划是否调整？'
      ],
      output: { type: '复盘文档', title: '实战中期复盘', desc: '项目中期检查，含方案质量和完整度。', banner: 'b1', icon: '✅' } },
    { day: 22, title: '模拟客户提案', type: 'practice', time: 55, template: 'review-sim', desc: '模拟一次客户提案，练习方案讲解和异议处理。',
      steps: [
        '找一位同学或同行作为客户，约定40分钟模拟提案',
        '用15分钟讲解方案：场景、架构、价值',
        '预留15分钟回答客户提问和异议',
        '请客户给出反馈：逻辑、价值表达、可信度',
        '记录提案改进点和异议应对优化'
      ],
      tools: ['腾讯会议/飞书会议', 'PowerPoint', 'Notion (notion.so)'],
      checklist: [
        '提案是否在规定时间内完成？',
        '能否流畅应对客户异议？',
        '是否获得客户反馈？',
        '改进点是否记录？'
      ],
      output: { type: '复盘文档', title: '模拟提案记录', desc: '提案模拟记录，含讲解要点和问答改进。', banner: 'b1', icon: '🎤' } },
    { day: 23, title: '完善方案终稿', type: 'output', time: 60, template: 'default', desc: '根据自检完善方案，补充细节和量化数据。',
      steps: [
        '自检方案逻辑：每个结论是否有充分依据',
        '补充缺失的细节：技术选型理由、数据来源',
        '优化量化数据：补充更多ROI计算维度',
        '请同学或导师审阅，根据反馈修改',
        '完成终稿排版和格式检查'
      ],
      tools: ['Word/WPS', 'Notion (notion.so)', 'Excel/WPS表格', 'VS Code'],
      checklist: [
        '每个结论是否有依据？',
        '技术选型理由是否充分？',
        '量化数据是否完善？',
        '是否经过他人审阅？'
      ],
      output: { type: '方案拆解文档', title: '方案终稿', desc: '完善方案，含架构、价值、交付和风险。', banner: 'b2', icon: '📄' } },
    { day: 24, title: '整理解决方案作品集', type: 'output', time: 55, template: 'final', desc: '将所有产出整理成作品集。',
      steps: [
        '汇总所有方案产出：场景分析、架构设计、价值链、交付文档',
        '用 Notion 或飞书文档创建作品集页面',
        '为每个项目编写简介：背景、方法、成果',
        '整理路演稿和演示材料',
        '检查所有链接和文件可访问性'
      ],
      tools: ['Notion (notion.so)', '飞书文档 (feishu.cn)', 'GitHub (github.com)', 'VS Code'],
      checklist: [
        '所有产出是否汇总？',
        '项目简介是否完整？',
        '路演材料是否整理？',
        '所有链接是否可访问？'
      ],
      output: { type: '作品集', title: 'AI解决方案作品集', desc: '完整作品集，含场景分析、方案设计和交付文档。', banner: 'b1', icon: '🏆' } },
    { day: 25, title: '作品集最终打磨', type: 'output', time: 50, template: 'polish', desc: '打磨作品集，确保专业度。',
      steps: [
        '检查作品集视觉一致性：配色、排版、字体',
        '优化项目描述，突出方案价值',
        '补充架构图和价值量化图表',
        '请2-3人体验作品集，收集反馈',
        '根据反馈做最后调整'
      ],
      tools: ['Notion (notion.so)', 'Canva (canva.com)', '飞书文档 (feishu.cn)'],
      checklist: [
        '视觉是否统一专业？',
        '描述是否突出价值？',
        '图表是否补充完整？',
        '是否经过他人反馈？'
      ],
      output: { type: '作品集', title: '作品集终版', desc: '打磨后的作品集，适合求职展示。', banner: 'b1', icon: '✨' } },
    { day: 26, title: '简历项目描述优化', type: 'output', time: 50, template: 'resume', desc: '将方案成果转化为简历描述。',
      steps: [
        '用 STAR 法则梳理方案项目：情境、任务、行动、结果',
        '编写3-4条简历描述，每条以动词开头',
        '量化成果：如"设计AI方案节省XX成本""ROI达X%"',
        '列出技能关键词：方案设计、ToB销售、价值链、项目管理',
        '请同学或导师审阅优化'
      ],
      tools: ['超级简历 (wondercv.com)', 'Notion (notion.so)', 'VS Code'],
      checklist: [
        '描述是否用STAR法则？',
        '是否包含量化成果？',
        '技能关键词是否完整？',
        '描述是否简洁有力？'
      ],
      output: { type: '简历材料', title: '简历项目描述', desc: '基于STAR法则的简历描述，突出方案价值。', banner: 'b1', icon: '📄' } },
    { day: 27, title: '面试高频问题练习', type: 'practice', time: 55, template: 'qa-practice', desc: '练习AI解决方案顾问面试高频问题。',
      steps: [
        '搜索整理AI解决方案顾问面试高频题（知乎、牛客网）',
        '练习行业理解类：如何看待AI在XX行业的应用',
        '练习方案设计类：如何为某客户设计AI方案',
        '练习客户沟通类：如何处理客户对AI的疑虑',
        '为每类题目整理回答框架并录音练习'
      ],
      tools: ['牛客网 (nowcoder.com)', '知乎', '人人都是产品经理 (woshipm.com)', '手机录音'],
      checklist: [
        '是否整理了15道以上高频题？',
        '行业理解题能否作答？',
        '方案设计是否有框架？',
        '口述表达是否流畅？'
      ],
      output: { type: '路演稿', title: '面试问答库', desc: '高频问题及回答，含行业理解和方案设计类。', banner: 'b2', icon: '💬' } },
    { day: 28, title: '模拟面试实战', type: 'practice', time: 60, template: 'mock', desc: '完成完整模拟面试。',
      steps: [
        '找一位从业者或同学作为面试官，约定1小时模拟面试',
        '准备3分钟自我介绍和5分钟项目讲解',
        '练习回答行业题、方案设计题、沟通题',
        '面试后请面试官给出反馈：表达、逻辑、专业度',
        '撰写复盘文档，记录不足和改进计划'
      ],
      tools: ['腾讯会议/飞书会议', 'Notion (notion.so)', '牛客网 (nowcoder.com)'],
      checklist: [
        '自我介绍是否流畅？',
        '项目讲解是否清晰？',
        '是否获得面试官反馈？',
        '改进计划是否明确？'
      ],
      output: { type: '路演稿', title: '模拟面试复盘', desc: '模拟面试复盘，含方案表达和改进。', banner: 'b2', icon: '🎯' } },
    { day: 29, title: '行业案例库整理', type: 'output', time: 45, template: 'default', desc: '整理3-5个行业AI案例，用于面试举例。',
      steps: [
        '选择3-5个行业AI应用案例（如医疗AI诊断、金融AI风控）',
        '为每个案例拆解：客户背景 → 业务痛点 → AI方案 → 价值效果',
        '提炼可复用的方案设计模式',
        '将案例整理成结构化文档',
        '准备面试口述版本的精简讲解'
      ],
      tools: ['Notion (notion.so)', '艾瑞咨询 (iresearch.com.cn)', '36氪 (36kr.com)', 'VS Code'],
      checklist: [
        '是否整理了3-5个案例？',
        '每个案例是否结构化拆解？',
        '可复用模式是否提炼？',
        '是否有面试口述版本？'
      ],
      output: { type: '复盘文档', title: '行业案例库', desc: '行业案例集，含案例分析和可复用模式。', banner: 'b1', icon: '📚' } },
    { day: 30, title: '30天成长总结与求职计划', type: 'output', time: 45, template: 'summary', desc: '总结30天成长，制定求职计划。',
      steps: [
        '回顾30天所有产出：方案文档、作品集、面试题、案例库',
        '梳理能力提升：行业认知、方案设计、价值链、项目管理的掌握程度',
        '制定求职计划：目标公司、投递时间、面试准备',
        '整理可复用资产：方案模板、价值链模板、案例库',
        '撰写总结文档，记录心得和后续方向'
      ],
      tools: ['Notion (notion.so)', 'VS Code', 'Boss直聘 (zhipin.com)', '拉勾 (lagou.com)'],
      checklist: [
        '是否梳理了30天所有产出？',
        '能力提升是否有清晰自评？',
        '求职计划是否具体可执行？',
        '可复用资产是否整理？'
      ],
      output: { type: '总结文档', title: '30天成长总结', desc: '完整成长总结，含能力提升、作品集和求职计划。', banner: 'b1', icon: '🏁' } },
  ],
};

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
    '正在分析你的职业目标…',
    'AI 正在生成职业画像…',
    '正在分析能力差距…',
    'AI 正在规划冲刺路线…',
    '正在拆解每日任务…',
    '正在准备你的成长工作台…',
  ];

  let idx = 0;

  function markStep(done) {
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
      idx++;
    }
  }

  // Step 1: 解析目标
  markStep();
  await sleep(500);

  // Step 2: AI 一次性生成分析+能力模型+任务计划
  markStep();
  const jdText = State.userInput.jd ? `\n目标岗位JD原文:\n${State.userInput.jd.substring(0, 800)}` : '';
  const jdInstruction = State.userInput.jd
    ? `重要：用户粘贴了真实岗位JD。你必须以JD内容为准，分析JD中的实际岗位名称和工作内容，生成与JD完全匹配的计划。如果JD中的岗位与用户填写的"${State.userInput.role}"不一致，以JD为准。在返回的JSON中加入"detectedRole"字段标注从JD中识别出的真实岗位名称。`
    : '';
  const masterPrompt = `你是职业规划专家。用户信息：
目标场景: ${State.userInput.scene}
用户填写的岗位: ${State.userInput.role}
目标级别: ${State.userInput.level}
已有技能: ${State.userInput.skills}
已有经历: ${State.userInput.experience}
每日可投入: ${State.userInput.timePerDay}小时
冲刺周期: ${State.userInput.sprintDays}天${jdText}

${jdInstruction}

请严格用以下JSON格式返回（不要加任何markdown标记或代码块）：
{
  "detectedRole": "从JD中识别的真实岗位名称（如果无JD则填用户填写的岗位）",
  "analysis": "2-3句话分析用户核心优势、短板、建议冲刺策略",
  "skills": [
    {"name": "能力维度1", "current": 30, "target": 80},
    {"name": "能力维度2", "current": 40, "target": 75},
    {"name": "能力维度3", "current": 20, "target": 70},
    {"name": "能力维度4", "current": 35, "target": 78},
    {"name": "能力维度5", "current": 25, "target": 72},
    {"name": "能力维度6", "current": 30, "target": 76}
  ],
  "phases": [
    {"name": "阶段1名称", "desc": "阶段描述"},
    {"name": "阶段2名称", "desc": "阶段描述"},
    {"name": "阶段3名称", "desc": "阶段描述"},
    {"name": "阶段4名称", "desc": "阶段描述"}
  ],
  "tasks": [
    {"title": "任务标题", "desc": "任务描述", "phase": "阶段名称", "output": "产出物名称", "outputType": "产出类型", "steps": ["步骤1","步骤2","步骤3"], "tools": ["工具1","工具2"], "checklist": ["检查点1","检查点2"]}
  ],
  "keywords": "关键词1·关键词2·关键词3·关键词4·关键词5"
}

要求：
1. skills 必须6个维度，名称2-4字，必须贴合detectedRole岗位
2. tasks 生成${State.userInput.sprintDays}个任务，每个任务都要贴合detectedRole岗位的实际工作内容
3. tasks 的内容必须与JD中的工作职责直接相关，不要生搬硬套其他岗位的模板
4. tasks 的 output 和 outputType 要具体可展示
5. phases 分4个阶段，对应冲刺周期
6. 所有内容用中文`;

  const masterResult = await callAI(masterPrompt, '你是CareerPilot职路引擎的AI核心，专注于职业成长路径规划。必须返回合法JSON。', 60);

  if (masterResult) {
    try {
      let clean = masterResult.trim();
      if (clean.startsWith('```')) {
        clean = clean.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      const data = JSON.parse(clean);

      // 如果 AI 从 JD 中识别出真实岗位，覆盖用户填写值
      if (data.detectedRole && data.detectedRole.trim() && data.detectedRole !== State.userInput.role) {
        State.userInput.role = data.detectedRole.trim();
      }

      State.aiAnalysis = data.analysis || null;
      State.aiRoleModel = {
        skills: data.skills.map(s => ({
          name: s.name,
          current: s.current || 30,
          target: s.target || 75
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
    } catch (e) {
      console.error('AI master parse failed:', e);
      State.aiAnalysis = null;
      State.aiRoleModel = null;
      State.aiTasks = null;
    }
  } else {
    State.aiAnalysis = null;
    State.aiRoleModel = null;
    State.aiTasks = null;
  }

  markStep();
  await sleep(200);

  // AI 失败时不进入主界面，提示重试
  if (!State.aiTasks || State.aiTasks.length === 0) {
    // 标记所有步骤为失败
    for (let i = idx; i < steps.length; i++) {
      if (container.children[i]) {
        container.children[i].classList.add('done');
        container.children[i].querySelector('.lcheck').textContent = '✗';
        container.children[i].style.opacity = '0.4';
      }
    }
    $('#loading-title').textContent = 'AI 生成失败，请重试';
    $('#loading-title').style.color = '#e74c3c';
    setTimeout(() => {
      showView('view-form');
      toast('AI 调用失败，请检查网络后重试', '');
    }, 2000);
    return;
  }

  // Step 3: 计算差距
  markStep();
  buildProfile();
  await sleep(200);

  // Step 4: 生成计划
  markStep();
  await sleep(200);

  // Step 5: 拆解任务
  markStep();
  await sleep(200);

  // Step 6: 初始化
  markStep();
  await sleep(200);

  // 完成
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
  }, 400);
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
const SkillKeywordMap = {
  'Python': ['Python分析', '统计思维', '数据驱动'],
  'SQL': ['SQL能力', '数据驱动', '统计思维'],
  'Figma': ['原型设计', '需求分析'],
  'figma': ['原型设计', '需求分析'],
  'JavaScript': ['HTML/CSS', 'JavaScript', '调试排错'],
  'JS': ['JavaScript', 'HTML/CSS'],
  'HTML': ['HTML/CSS'],
  'CSS': ['HTML/CSS'],
  'Java': ['调试排错'],
  '原型': ['原型设计'],
  'PRD': ['需求分析', '产品思维'],
  '需求': ['需求分析', '产品思维'],
  '竞品': ['产品思维', '需求分析'],
  '数据': ['数据驱动', '统计思维', '数据可视化'],
  '分析': ['统计思维', '业务理解', '报告表达'],
  '运营': ['内容运营', '用户运营', '增长思维'],
  '内容': ['内容运营', '文案能力'],
  '用户': ['用户运营'],
  '增长': ['增长思维', '数据分析'],
  '文案': ['文案能力'],
  '活动': ['活动策划'],
  'AI': ['AI技术理解', 'AI行业理解'],
  '模型': ['AI技术理解'],
  'API': ['API集成', '工作流编排'],
  '部署': ['部署运维'],
  '工作流': ['工作流编排'],
  '自动化': ['工作流编排', 'API集成'],
  '项目': ['项目管理', '方案设计'],
  '管理': ['项目管理'],
  '客户': ['客户沟通', '需求洞察'],
  '方案': ['方案设计', '价值分析'],
  '沟通': ['客户沟通', '路演表达'],
  '表达': ['路演表达', '报告表达'],
  '路演': ['路演表达'],
  '设计': ['原型设计', '数据可视化'],
  '可视化': ['数据可视化'],
  '看板': ['数据可视化'],
  '漏斗': ['统计思维', '业务理解'],
  '实验': ['数据分析', '增长思维'],
  '编程': ['JavaScript', '调试排错'],
  '编程基础': ['JavaScript'],
  '前端': ['HTML/CSS', 'JavaScript'],
  '后端': ['API集成', '部署运维'],
  '全栈': ['HTML/CSS', 'JavaScript', 'API集成', '部署运维'],
};

// 目标级别 → 能力目标调整系数
const LevelAdjust = {
  '实习':   { targetMul: 0.88, focus: '基础夯实与工具入门，重点补齐核心认知' },
  '校招':   { targetMul: 1.00, focus: '建立完整能力框架，具备实战项目经验' },
  '1-3年':  { targetMul: 1.08, focus: '深度实战与系统化思维，能独立交付完整项目' },
  '转岗':   { targetMul: 1.05, focus: '迁移已有经验，快速补齐新方向核心能力' },
};

function buildProfile() {
  const { scene, role, level, skills, experience, timePerDay, sprintDays } = State.userInput;
  
  // 优先使用 AI 生成的模型，彻底跳过预设模板
  let model = State.aiRoleModel;
  if (!model && RoleModels[role]) {
    model = RoleModels[role];
  } else if (!model) {
    model = {
      skills: [
        { name: '核心能力', current: 30, target: 75 },
        { name: '岗位认知', current: 20, target: 70 },
        { name: '实操技能', current: 25, target: 78 },
        { name: '沟通表达', current: 35, target: 72 },
        { name: '问题解决', current: 30, target: 76 },
        { name: '职业素养', current: 40, target: 80 },
      ],
      phases: [
        { name: '认知筑基', desc: `建立${role}岗位核心认知` },
        { name: '技能实操', desc: '动手实践核心技能' },
        { name: '项目实战', desc: '完成完整项目交付' },
        { name: '求职表达', desc: '转化为求职素材' },
      ],
      scenes: '求职 / 转岗 / 作品集 / 面试冲刺',
      levels: '实习 / 校招 / 1-3年 / 转岗',
      outputs: '工作文档 · 实操报告 · 项目成果',
      keywords: `${role} · 岗位认知 · 实操能力 · 沟通表达 · 职业素养`,
    };
  }
  
  const levelCfg = LevelAdjust[level] || { targetMul: 1.0, focus: '建立完整能力框架，具备实战项目经验' };

  // === 1. 个性化能力值：根据技能关键词上调 current ===
  const personalizationLog = [];
  const skillsLower = (skills || '').toLowerCase();
  const matchedSkills = new Set();

  Object.keys(SkillKeywordMap).forEach(kw => {
    if (skillsLower.includes(kw.toLowerCase())) {
      SkillKeywordMap[kw].forEach(dim => matchedSkills.add(dim));
    }
  });

  const matchedKeywords = [];
  Object.keys(SkillKeywordMap).forEach(kw => {
    if (skillsLower.includes(kw.toLowerCase())) {
      matchedKeywords.push(kw);
    }
  });

  // 深拷贝能力模型，根据匹配结果调整
  const personalizedSkills = model.skills.map(s => {
    const adjusted = { ...s };
    const baseCurrent = s.current;
    const target = Math.round(s.target * levelCfg.targetMul);

    if (matchedSkills.has(s.name)) {
      const matchedKws = matchedKeywords.filter(kw => SkillKeywordMap[kw].includes(s.name));
      const boost = 15 + Math.floor(Math.random() * 11);
      adjusted.current = Math.min(baseCurrent + boost, target - 5);
      adjusted.boosted = true;
      adjusted.boostAmount = boost;
      personalizationLog.push({
        skill: s.name,
        keyword: matchedKws.slice(0, 2),
        boost,
        before: baseCurrent,
        after: adjusted.current,
      });
    } else {
      // 即使没匹配到预设关键词，也检查 AI 模型中的能力名称是否出现在用户技能中
      if (skillsLower.includes(s.name.toLowerCase()) || 
          skillsLower.includes(s.name.substring(0,2).toLowerCase())) {
        const boost = 10 + Math.floor(Math.random() * 8);
        adjusted.current = Math.min(baseCurrent + boost, target - 5);
        adjusted.boosted = true;
        adjusted.boostAmount = boost;
        personalizationLog.push({
          skill: s.name,
          keyword: [s.name],
          boost,
          before: baseCurrent,
          after: adjusted.current,
        });
      }
    }
    adjusted.target = target;
    return adjusted;
  });

  const gapAnalysis = personalizedSkills.map(s => ({
    ...s,
    gap: s.target - s.current,
  })).sort((a, b) => b.gap - a.gap);

  const topGaps = gapAnalysis.slice(0, 3).map(g => g.name);

  // === 3. 任务：优先用 AI 生成的，不再用预设模板 ===
  let allTasks;
  if (State.aiTasks && State.aiTasks.length > 0) {
    allTasks = State.aiTasks.slice();
  } else {
    // AI 失败时用通用模板（不含任何固定岗位话术）
    allTasks = generateGenericTasks(model, role, level);
  }
  const tasks = personalizeTaskOrder(allTasks, sprintDays, topGaps, levelCfg);

  // === 4. 构建画像 ===
  State.profile = {
    scene,
    role,
    level,
    skills: skills || '未填写',
    experience: experience || '暂无',
    timePerDay,
    sprintDays,
    startDate: new Date().toLocaleDateString('zh-CN'),
    scenes: model.scenes || '',
    levels: model.levels || '',
    outputs: model.outputs || '',
    keywords: model.keywords || '',
    levelFocus: levelCfg.focus,
    personalizationLog,
    topGaps,
    matchedSkillCount: matchedSkills.size + personalizationLog.filter(p => !matchedKeywords.includes(p.keyword[0])).length,
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

/* -------- 为自定义岗位生成通用任务模板 -------- */
function generateGenericTasks(model, role, level) {
  const phases = model.phases || [
    { name: '认知筑基', desc: `建立${role}核心认知` },
    { name: '技能实操', desc: '动手实践核心技能' },
    { name: '项目实战', desc: '完成完整项目交付' },
    { name: '求职表达', desc: '转化为求职素材' },
  ];

  const outputs = (model.outputs || '工作文档·实操报告·项目成果').split('·');
  const tasks = [];
  const taskTitles = [
    '岗位调研与能力拆解', '核心技能入门', '行业案例研究', '基础技能练习',
    '实操分析报告', '技能深度实操', '模拟项目启动', '核心模块交付',
    '项目复盘与迭代', '成果文档化', '作品集整理', '面试题库梳理',
    '简历项目描述', '模拟面试练习', '求职材料终审',
  ];

  const taskTypes = ['调研报告', '实操练习', '案例分析', '文档输出', '项目交付', '模拟练习'];
  const icons = ['📋', '🔧', '📊', '📝', '🎯', '💡', '🔍', '✨', '🎨', '📐'];

  for (let i = 0; i < 30; i++) {
    const phaseIdx = Math.min(Math.floor(i / 8), 3);
    const phase = phases[phaseIdx];
    const title = taskTitles[i % taskTitles.length];
    const output = outputs[i % outputs.length];

    tasks.push({
      day: i + 1,
      phase: phase.name,
      title: `${phase.name}·${title}`,
      desc: `针对${role}岗位，${phase.desc}：${title}。产出：${output}。`,
      time: State.userInput.timePerDay || 1.5,
      output: {
        type: taskTypes[i % taskTypes.length],
        title: `${output}-${title}`,
        desc: `完成${title}，形成可展示的${output}成果`,
        icon: icons[i % icons.length],
        banner: 'b' + ((i % 5) + 1),
      },
      steps: [
        `了解${title}的核心要点和方法论`,
        `参考行业最佳实践，动手完成${output}`,
        `整理成果，确保可展示可复用`,
      ],
      tools: ['在线工具', '模板文档', '行业案例库'],
      checklist: [`已完成${output}产出`, '成果可展示', '理解核心原理'],
    });
  }

  return tasks;
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
  const model = RoleModels[role] || RoleModels['AI产品经理'];
  const projectType = role.includes('产品') ? 'AI产品' : role.includes('开发') ? 'AI应用' : role.includes('商业') ? '商业分析' : role.includes('增长') ? '增长策略' : 'AI解决方案';
  return `<strong>${project.title}</strong> ｜ 个人实战项目

项目背景：基于30天${role}能力冲刺计划，独立完成一个完整的${projectType}项目，覆盖从需求洞察到成果交付的全流程。

核心工作：
• 完成${count}项结构化任务，涵盖${model.outputs}
• 独立产出${project.title}，建立完整的${projectType}能力框架和可展示成果
• 通过每日任务执行和阶段复盘，形成可量化的能力提升轨迹

项目成果：
• 沉淀${count}份结构化成果文档，包含${project.type}和相关交付物
• 建立${role}岗位的核心能力模型，能力评估从入门提升至具备实战水平
• 形成可面试讲解的完整项目经历和作品集`;
}

function generateKeywords(role) {
  const model = RoleModels[role] || RoleModels['AI产品经理'];
  return (model.keywords || '').split(' · ').filter(k => k).map(k => `「${k}」`).join(' ');
}

function renderInterview() {
  const role = State.profile.role;
  const completed = State.completedTasks.size;

  if (completed === 0) {
    $('#epanel-interview').innerHTML = `
      <div class="express-card">
        <div class="ec-head"><span class="ec-title">面试问答</span></div>
        <div class="ec-content">完成至少 1 个任务后，CareerPilot 会基于你的成果生成面试问答。</div>
      </div>
    `;
    return;
  }

  const qas = generateInterviewQA(role, completed);

  $('#epanel-interview').innerHTML = qas.map(qa => `
    <div class="qa-item">
      <div class="qa-q">${qa.q}</div>
      <div class="qa-a">${qa.a}</div>
    </div>
  `).join('');
}

function generateInterviewQA(role, completed) {
  const model = RoleModels[role] || RoleModels['AI产品经理'];
  const roleShort = role.replace('AI', '').replace('工程师', '').replace('顾问', '');
  const baseQA = [
    {
      q: '请介绍一下你最近做的一个项目。',
      a: `我在30天冲刺中独立完成了一个${role}方向的实战项目。这个项目的核心目标是<strong>建立完整的${roleShort}实战能力</strong>。\n\n我按照"目标分析→任务执行→成果沉淀"的方法论，完成了${model.outputs.split(' · ')[0]}等${completed}项结构化任务。最终产出了可展示的作品集，包含完整的交付物和分析成果。\n\n这个项目让我从"知道方向但不知道怎么行动"变成了"有清晰路径和可展示成果"的状态。`,
    },
    {
      q: `你为什么选择${role}方向？`,
      a: `我选择${role}方向有三个原因：\n\n第一，我发现自己对<strong>解决实际问题和创造价值</strong>有持续的热情，这在之前做课程项目时就有体现。\n\n第二，通过30天的系统学习和实战，我确认自己具备这个方向的核心能力基础——我完成了${completed}项实战任务，每一项都让我更确认这个选择。\n\n第三，这个方向的发展空间和我的长期职业目标一致，我希望在这个领域持续深耕。`,
    },
    {
      q: '你在学习过程中遇到过什么困难？怎么解决的？',
      a: `最大的困难是<strong>不知道从哪里开始</strong>。岗位要求很庞杂，资料很多，但缺少适合自己情况的路径。\n\n我的解决方式是把目标拆解成可执行的任务：先做能力差距分析，找到最该补的短板，然后制定每日任务计划。比如我每天投入1.5小时，完成一个具体任务并沉淀成果。\n\n这个过程中我完成了${completed}个任务，形成了${completed}份结构化成果，把"学过"变成了"做过"和"能讲清楚"。`,
    },
  ];

  // 岗位专属问题
  if (role === 'AI产品经理') {
    baseQA.push({
      q: '你怎么理解AI产品经理和传统产品经理的区别？',
      a: `核心区别有三点：\n\n第一，<strong>技术理解</strong>。AI产品经理需要理解模型的能力边界，在产品中设计合理的预期管理和兜底机制。\n\n第二，<strong>数据驱动</strong>。AI产品的效果高度依赖数据反馈，需要建立更精细的指标体系和A/B测试机制。\n\n第三，<strong>用户体验</strong>。AI产品的不确定性更高，需要在交互设计上让用户感受到可控和可信。`,
    });
  } else if (role === 'AI应用开发工程师') {
    baseQA.push({
      q: '你接过AI API吗？遇到过什么问题？',
      a: `接过。我在项目中集成了大模型API，主要遇到三个问题：\n\n第一，<strong>流式输出</strong>。需要用SSE处理流式响应，前端做打字机效果。\n\n第二，<strong>错误兜底</strong>。API可能超时或返回异常，需要做重试和降级处理。\n\n第三，<strong>上下文管理</strong>。多轮对话需要维护历史消息，控制token消耗。我在项目中都做了对应处理。`,
    });
  } else if (role === '商业分析师') {
    baseQA.push({
      q: '你做过漏斗分析吗？怎么发现问题的？',
      a: `做过。我用模拟数据完成了一个用户行为漏斗分析。\n\n核心步骤是：先定义漏斗各步骤，计算各步转化率和流失率，然后定位流失最大的环节，分析原因并提出优化建议。\n\n我发现注册到激活这一步流失率最高，通过分群分析发现新用户在引导流程中卡住，建议简化引导步骤。`,
    });
  } else if (role === '增长策略师') {
    baseQA.push({
      q: '你做过增长实验吗？效果怎么样？',
      a: `做过。我设计了一个完整的增长实验方案。\n\n核心流程是：先提出假设（优化落地页可能提升注册率），然后设计A/B测试，定义指标和样本量，执行实验并分析结果。\n\n关键不是实验本身，而是从假设到结论的完整逻辑链条，以及能否把实验发现转化为可落地的策略建议。`,
    });
  } else if (role === 'AI解决方案顾问') {
    baseQA.push({
      q: '你怎么理解AI解决方案顾问这个角色？',
      a: `这个角色的核心是<strong>把AI技术能力转化为客户可感知的业务价值</strong>。\n\n第一，需要理解客户的业务场景和痛点，知道AI能在哪里创造价值。\n\n第二，需要设计可落地的解决方案，含架构、流程和价值量化。\n\n第三，需要做好客户沟通和项目交付，确保方案从概念变成实际成果。这是一个连接技术和业务的桥梁角色。`,
    });
  }

  return baseQA;
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
  const reqs = JobRequirements[role];
  const el = $('#jd-req-list');
  const summaryEl = $('#jd-summary');
  if (!reqs || !el) return;

  // 获取所有任务的output类型和title，用于匹配JD要求
  const allTasks = State.sprint ? State.sprint.tasks : [];
  const completedTasks = allTasks.filter(t => State.completedTasks.has(t.day));
  const allOutputs = allTasks.map(t => ({
    type: t.output.type,
    title: t.output.title,
    desc: t.output.desc,
    taskTitle: t.title,
    taskDesc: t.desc,
    day: t.day,
    completed: State.completedTasks.has(t.day),
  }));

  // 对每条JD要求，判断状态：covered / pending / missing
  const analyzed = reqs.map(req => {
    // 尝试在任务中找到匹配的产出
    const matched = findMatchingOutput(req, allOutputs);
    let status = 'missing';
    let evidence = '';

    if (matched && matched.length > 0) {
      const completedMatch = matched.find(m => m.completed);
      if (completedMatch) {
        status = 'covered';
        evidence = `Day ${completedMatch.day} · ${completedMatch.taskTitle}`;
      } else {
        status = 'pending';
        evidence = `Day ${matched[0].day} · ${matched[0].taskTitle}（未完成）`;
      }
    }

    return { ...req, status, evidence, matchedTasks: matched };
  });

  // 统计
  const covered = analyzed.filter(a => a.status === 'covered').length;
  const pending = analyzed.filter(a => a.status === 'pending').length;
  const missing = analyzed.filter(a => a.status === 'missing').length;
  const total = analyzed.length;
  const coverage = Math.round(covered / total * 100);

  // 渲染摘要
  summaryEl.innerHTML = `
    <div class="jd-stat-row">
      <div class="jd-stat covered">
        <span class="jd-stat-num">${covered}</span>
        <span class="jd-stat-label">已覆盖</span>
      </div>
      <div class="jd-stat pending">
        <span class="jd-stat-num">${pending}</span>
        <span class="jd-stat-label">待完成</span>
      </div>
      <div class="jd-stat missing">
        <span class="jd-stat-num">${missing}</span>
        <span class="jd-stat-label">缺失</span>
      </div>
      <div class="jd-stat total">
        <span class="jd-stat-num">${coverage}%</span>
        <span class="jd-stat-label">JD覆盖率</span>
      </div>
    </div>
    <div class="jd-coverage-bar">
      <div class="jd-coverage-fill" style="width:${coverage}%"></div>
    </div>
  `;

  // 渲染详细列表
  el.innerHTML = analyzed.map(a => {
    const statusIcon = a.status === 'covered' ? '✓' : a.status === 'pending' ? '⏳' : '✕';
    const statusText = a.status === 'covered' ? '已覆盖' : a.status === 'pending' ? '待完成' : '计划缺失';
    const weightLabel = a.weight === 'high' ? '核心要求' : a.weight === 'medium' ? '加分项' : '了解即可';

    return `
      <div class="jd-req-item ${a.status}">
        <div class="jd-req-left">
          <span class="jd-req-icon ${a.status}">${statusIcon}</span>
          <div class="jd-req-content">
            <div class="jd-req-text">${a.requirement}</div>
            <div class="jd-req-meta">
              <span class="jd-tag ${a.weight}">${weightLabel}</span>
              <span class="jd-tag cat">${a.category}</span>
              ${a.evidence ? `<span class="jd-evidence">${a.evidence}</span>` : ''}
            </div>
            ${a.status === 'missing' ? `<div class="jd-req-hint">💡 如何证明：${a.howToProve}<br><strong>建议：当前计划未覆盖此项，需自行补齐或在面试中用其他经验证明</strong></div>` : ''}
            ${a.status === 'pending' ? `<div class="jd-req-hint pending">💡 如何证明：${a.howToProve}<br>完成对应任务后即可覆盖此项</div>` : ''}
          </div>
        </div>
        <span class="jd-req-status ${a.status}">${statusText}</span>
      </div>
    `;
  }).join('');
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
  if (!p.personalizationLog || p.personalizationLog.length === 0) {
    $('#personalization-card').innerHTML = `
      <div class="pcard">
        <div class="pcard-head">
          <span class="pcard-title">个性化生成依据</span>
          <span class="pcard-badge">基于标准模型</span>
        </div>
        <div class="pcard-body">
          当前使用${p.role}的标准能力模型生成路径。在"已有技能基础"中填写具体技能（如 Python、Figma、SQL），CareerPilot 会自动上调匹配维度的初始能力值，并按差距重新排序任务。
        </div>
      </div>
    `;
    return;
  }

  const log = p.personalizationLog;
  const boostHtml = log.map(l => `
    <div class="boost-row">
      <span class="boost-skill">${l.skill}</span>
      <span class="boost-arrow">${l.before} →</span>
      <span class="boost-after">${l.after}</span>
      <span class="boost-tag">+${l.boost}</span>
    </div>
  `).join('');

  $('#personalization-card').innerHTML = `
    <div class="pcard">
      <div class="pcard-head">
        <span class="pcard-title">AI 个性化分析</span>
        <span class="pcard-badge ai">DeepSeek V4 Pro · 真实 AI</span>
      </div>
      <div class="pcard-body">
        ${State.aiAnalysis ? `
        <div class="pcard-section">
          <div class="ps-label">AI 分析结论</div>
          <div class="ps-text ai-text">${State.aiAnalysis}</div>
        </div>
        ` : ''}
        <div class="pcard-section">
          <div class="ps-label">已识别技能关键词</div>
          <div class="ps-text">从你的输入中识别到 <strong>${p.matchedSkillCount}</strong> 个匹配维度，系统已自动调整初始能力值：</div>
          <div class="boost-list">${boostHtml}</div>
        </div>
        <div class="pcard-section">
          <div class="ps-label">目标级别适配</div>
          <div class="ps-text">${p.level}：${p.levelFocus}</div>
        </div>
        <div class="pcard-section">
          <div class="ps-label">任务优先级排序</div>
          <div class="ps-text">按能力差距从大到小排序，优先补齐：<strong>${p.topGaps.join('、')}</strong>。相关任务已提前安排。</div>
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
