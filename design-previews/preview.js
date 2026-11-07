// Interactive design prototypes. Every record below is synthetic and local to this tab.
import { createLiveCharts } from './live-charts.js';
const variant = document.documentElement.dataset.variant;
const isB = variant === 'revolut';
const app = document.querySelector('#app');
const drawer = document.querySelector('#drawer');
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
const reduce = () => motionPreference.matches;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon = (name, cls = '') => `<svg class="icon ${cls}" aria-hidden="true"><use href="assets/icons.svg#${name}"></use></svg>`;
const logo = `<span class="brand-mark brand-monogram" aria-hidden="true">FW</span>`;
const money = new Intl.NumberFormat('en-IN', {style:'currency',currency:'INR',minimumFractionDigits:2,maximumFractionDigits:2});
const wholeMoney = new Intl.NumberFormat('en-IN', {style:'currency',currency:'INR',maximumFractionDigits:0});
const shortNumber = new Intl.NumberFormat('en-IN', {notation:'compact',maximumFractionDigits:1});
const shortMoney = new Intl.NumberFormat('en-IN', {style:'currency',currency:'INR',notation:'compact',maximumFractionDigits:2});
const fmt = minor => money.format(minor / 100);
const fmtWhole = minor => wholeMoney.format(minor / 100);
const dateLabel = date => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-IN',{day:'2-digit',month:'short',timeZone:'UTC'});
const months = ['2026-06','2026-07','2026-08','2026-09','2026-10','2026-11'];
const monthLabel = month => new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-IN',{month:'short',timeZone:'UTC'});
const categoryIcon = category => ({Consulting:'briefcase',Projects:'code',Payroll:'users',Rent:'home',Software:'code',Hosting:'code',Marketing:'credit-card',Travel:'plane'}[category] || 'receipt-2');
const colors = () => document.documentElement.dataset.theme==='dark' ? ['#d9e0dc','#acb9b1','#7e9186','#52675b'] : ['#2f5644','#617e6d','#96ab9c','#c3cec6'];

function fixtures() {
  const rows=[];
  months.forEach((month,i) => {
    const entries=[
      ['Client retainer','Consulting','INCOME',[142000,168000,154000,189000,212000,226000][i],5],
      ['Website project','Projects','INCOME',[27000,34000,30000,38000,45000,51000][i],2],
      ['Team payroll','Payroll','EXPENSE',42000+i*2000,6],
      ['Studio rent','Rent','EXPENSE',27000,1],
      ['Design software','Software','EXPENSE',3100+i*80,4],
      ['Cloud hosting','Hosting','EXPENSE',2600+i*320,3],
      ['Campaign spend','Marketing','EXPENSE',8500+i*750,4],
      ['Client travel','Travel','EXPENSE',3800+i*550,2],
    ];
    entries.forEach(([description,category,type,amount,day],j) => rows.push({id:`sample-${i}-${j}`,description,category,type,amountMinor:amount*100,date:`${month}-${String(day).padStart(2,'0')}`}));
  });
  return rows;
}

const state={
  view:location.hash.slice(1)||'overview',period:6,records:fixtures(),query:'',filter:'ALL',
  workspace:'Demo workspace',menuOpen:false,
  members:[{id:'self',name:'Ronack Kumar',email:'ronack@example.com',role:'ADMIN',active:true},{id:'analyst',name:'Priya Shah',email:'priya@example.com',role:'ANALYST',active:true},{id:'viewer',name:'Arun Mehta',email:'arun@example.com',role:'VIEWER',active:true}],
};
const pages=[['overview','Overview','layout-dashboard'],['transactions','Transactions','receipt-2'],['analytics','Reports','chart-line'],['team','Team','users']];
let lastMetrics={},toastTimer,transition,chartFrame,liveGuide,chartResizeObserver;
const embedded=new URLSearchParams(location.search).get('embed')==='1';
let liveEnabled=!embedded&&!reduce();
if(embedded)document.body.classList.add('embedded-preview');
const DATA_TRANSITION_MS=520;
const dataEase=p=>p===1?1:1-Math.pow(2,-10*p);

function selectedRecords() {
  const start=months[months.length-state.period];
  return state.records.filter(r=>r.date.slice(0,7)>=start&&r.date<='2026-11-07');
}
function totals(rows=selectedRecords()) {
  const income=rows.filter(r=>r.type==='INCOME').reduce((sum,r)=>sum+r.amountMinor,0);
  const expense=rows.filter(r=>r.type==='EXPENSE').reduce((sum,r)=>sum+r.amountMinor,0);
  return {income,expense,balance:income-expense,count:rows.length,incomeCount:rows.filter(r=>r.type==='INCOME').length,expenseCount:rows.filter(r=>r.type==='EXPENSE').length};
}
function buckets() {
  const rows=selectedRecords();
  const keys=state.period===1?Array.from({length:7},(_,i)=>`2026-11-${String(i+1).padStart(2,'0')}`):months.slice(-state.period);
  return keys.map(key=>({key,label:state.period===1?String(Number(key.slice(-2)))+' Nov':monthLabel(key),income:rows.filter(r=>r.date.startsWith(key)&&r.type==='INCOME').reduce((s,r)=>s+r.amountMinor,0),expense:rows.filter(r=>r.date.startsWith(key)&&r.type==='EXPENSE').reduce((s,r)=>s+r.amountMinor,0)}));
}
function categories() {
  const map=new Map();
  selectedRecords().filter(r=>r.type==='EXPENSE').forEach(r=>map.set(r.category,(map.get(r.category)||0)+r.amountMinor));
  const sorted=[...map].map(([name,total])=>({name,total})).sort((a,b)=>b.total-a.total);
  return sorted.length>4?[...sorted.slice(0,3),{name:'Other',total:sorted.slice(3).reduce((s,r)=>s+r.total,0)}]:sorted;
}
function periodName(){return state.period===1?'November 2026':`${monthLabel(months[months.length-state.period])} to Nov 2026`;}
function periodControl(){return `<label class="period-select"><span class="sr-only">Reporting period</span><select data-control="period"><option value="6" ${state.period===6?'selected':''}>Last 6 months</option><option value="3" ${state.period===3?'selected':''}>Last 3 months</option><option value="1" ${state.period===1?'selected':''}>This month</option></select>${icon('chevron-down')}</label>`;}
function addButton(label='Add transaction'){return `<button class="button" data-action="add">${icon('plus')}${label}</button>`;}
function metric(name,value,classes=''){return `<div class="${classes}" data-metric="${name}" data-value="${value}">${fmt(value)}</div>`;}

function shell(content) {
  const active=pages.find(p=>p[0]===state.view)?.[1] || 'Settings';
  return `<div class="preview-strip"><div><strong>Interactive design preview</strong><span class="sample-note"> · Sample INR data</span></div><nav class="preview-switch" aria-label="Design options">${['overview','analytics'].includes(state.view)?`<button class="live-toggle" data-action="toggle-live" aria-pressed="${liveEnabled}" ${reduce()?'disabled title="Reduced motion is enabled on this device"':''}>${liveEnabled?'Pause auto insights':'Resume auto insights'}</button>`:''}<a href="index.html">Compare</a><a href="mercury.html" ${!isB?'aria-current="page"':''}>01 · Mercury / Stripe</a><a href="revolut.html" ${isB?'aria-current="page"':''}>02 · Revolut / Brex</a></nav></div>
  <div class="shell ${state.menuOpen?'nav-open':''}">
    <button class="side-backdrop" data-action="menu-close" aria-label="Close navigation"></button>
    <aside class="sidebar" aria-label="Workspace navigation" ${innerWidth<=760&&!state.menuOpen?'inert':''}>
      <a class="brand" href="#overview" aria-label="Finance Workspace overview">${logo}<span class="brand-word">Finance<span>Workspace</span></span></a>
      <button class="workspace-switch" data-action="workspace" aria-label="Workspace settings"><span class="workspace-initial">D</span><span class="workspace-copy"><strong>${esc(state.workspace)}</strong><span>Sample data · INR</span></span>${icon('chevron-right')}</button>
      <nav class="nav" aria-label="Main">${pages.map(([id,label,glyph])=>`<a href="#${id}" ${state.view===id?'aria-current="page"':''}>${icon(glyph)}<span class="nav-label">${label}</span>${id==='transactions'?`<span class="nav-count">${state.records.length}</span>`:''}</a>`).join('')}</nav>
      <div class="side-bottom"><div class="side-help"><strong>Take it for a spin</strong>Change the period, hover the chart, or add a sample transaction.</div><nav class="nav" aria-label="Preferences"><a href="#settings" aria-label="Settings" ${state.view==='settings'?'aria-current="page"':''}>${icon('settings-2')}<span class="nav-label">Settings</span></a></nav><div class="user"><span class="avatar">RK</span><span class="user-copy"><strong>Ronack Kumar</strong><span>Preview admin</span></span><button class="icon-button" data-action="theme" aria-label="Switch theme">${icon(document.documentElement.dataset.theme==='dark'?'sun':'moon')}</button></div></div>
    </aside>
    <div class="body"><header class="topbar"><button class="icon-button mobile-toggle" data-action="menu-open" aria-label="Open navigation">${icon('menu-2')}</button><div class="crumb"><span class="parent">${esc(state.workspace)}</span>${icon('chevron-right')}<strong>${active}</strong></div><div class="topbar-tools"><button class="search-trigger" data-action="search" aria-label="Search transactions">${icon('search')}<span>Search transactions</span><kbd>${/Mac|iPhone|iPad/.test(navigator.platform)?'⌘':'Ctrl'} K</kbd></button><button class="icon-button" data-action="theme" aria-label="Switch theme">${icon(document.documentElement.dataset.theme==='dark'?'sun':'moon')}</button><button class="icon-button" data-action="activity" aria-label="Show recent activity">${icon('bell')}</button><span class="avatar" aria-label="Ronack Kumar">RK</span></div></header>
    <main class="main" id="main">${content}<footer class="preview-foot"><span>Design preview. All data is synthetic and changes stay in this tab.</span><a href="index.html">Compare both directions ${icon('arrow-up-right')}</a></footer></main></div>
  </div>`;
}

function summaryA() {
  const t=totals();
  return `<section class="panel summary-strip" aria-label="Financial summary"><div class="summary-cell"><div class="summary-label">Net recorded balance</div>${metric('balance',t.balance,'summary-amount')}<p class="summary-foot">Income minus expenses · ${t.count} records</p></div><div class="summary-cell"><div class="summary-label">${icon('arrow-down-left','income')}Total income</div>${metric('income',t.income,'summary-amount')}<p class="summary-foot">${t.incomeCount} income entries in this period</p></div><div class="summary-cell"><div class="summary-label">${icon('arrow-up-right','expense')}Total expenses</div>${metric('expense',t.expense,'summary-amount')}<p class="summary-foot">${t.expenseCount} expense entries in this period</p></div></section>`;
}
function summaryB(){
  const t=totals();
  return `<div class="balance-grid"><section class="panel balance-card" aria-label="Cash position"><div class="balance-top"><span>Net cash position</span><span class="currency-chip">₹ INR</span></div>${metric('balance',t.balance,'balance-number')}<p class="balance-context">Recorded income minus expenses · ${periodName()}</p><div class="balance-mobile-flow" aria-label="Money movement"><div><span>${icon('arrow-down-left','income')}Money in</span><strong>${fmt(t.income)}</strong></div><div><span>${icon('arrow-up-right','expense')}Money out</span><strong>${fmt(t.expense)}</strong></div></div><div class="balance-actions"><button class="button" data-action="add-income">${icon('plus')}Add income</button><button class="button quiet" data-action="add-expense">${icon('arrow-up-right')}Add expense</button><button class="button quiet" data-action="export">${icon('download')}Export</button></div></section><section class="panel flow-card"><h2>Money movement</h2><div class="flow-row"><span class="flow-icon income">${icon('arrow-down-left')}</span><span class="label">Money in</span><strong>${fmt(t.income)}</strong></div><div class="flow-row"><span class="flow-icon expense">${icon('arrow-up-right')}</span><span class="label">Money out</span><strong>${fmt(t.expense)}</strong></div><p class="flow-note">${t.count} recorded transactions in this period</p></section></div>`;
}

function chartMarkup() {
  const data=buckets(), W=innerWidth<=760?360:640,H=232,m={l:45,r:12,t:18,b:33};
  const max=Math.max(1,...data.flatMap(d=>[d.income,d.expense]));
  const unit=max>10000000?5000000:max>1000000?1000000:100000;
  const ceiling=Math.ceil(max/unit)*unit;
  const iw=W-m.l-m.r,ih=H-m.t-m.b;
  const x=i=>m.l+(i+.5)*iw/data.length;
  const y=value=>m.t+ih-value/ceiling*ih;
  let out=`<defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="var(--chart-income)" stop-opacity=".2"/><stop offset="1" stop-color="var(--chart-income)" stop-opacity="0"/></linearGradient></defs>`;
  for(let i=0;i<4;i++){
    const value=ceiling*i/3;
    out+=`<line class="gridline" x1="${m.l}" x2="${W-m.r}" y1="${y(value)}" y2="${y(value)}"/><text x="${m.l-9}" y="${y(value)+4}" text-anchor="end">${shortNumber.format(value/100)}</text>`;
  }
  const curve=key=>data.reduce((p,d,i)=>i===0?`M${x(i)} ${y(d[key])}`:p+` C${x(i-1)+(x(i)-x(i-1))*.48} ${y(data[i-1][key])},${x(i)-(x(i)-x(i-1))*.48} ${y(d[key])},${x(i)} ${y(d[key])}`,'');
  if(!isB){
    const line=curve('income');
    out+=`<path class="chart-area" d="${line} L${x(data.length-1)} ${H-m.b} L${x(0)} ${H-m.b}Z" fill="url(#chart-fill)"/><path class="income-line" d="${line}"/><path class="expense-line" d="${curve('expense')}"/>`;
  } else {
    const bw=Math.min(24,iw/data.length*.22);
    data.forEach((d,i)=>{out+=`<rect data-bar="income-${d.key}" x="${x(i)-bw-2}" y="${y(d.income)}" width="${bw}" height="${H-m.b-y(d.income)}" rx="4" fill="var(--chart-income)"/><rect data-bar="expense-${d.key}" x="${x(i)+2}" y="${y(d.expense)}" width="${bw}" height="${H-m.b-y(d.expense)}" rx="4" fill="var(--chart-expense)"/>`;});
  }
  data.forEach((d,i)=>{out+=`<g class="chart-point" data-point="${i}"><line class="chart-hover-line" x1="${x(i)}" x2="${x(i)}" y1="${m.t}" y2="${H-m.b}"/><rect class="hit" x="${x(i)-iw/data.length/2}" y="${m.t}" width="${iw/data.length}" height="${ih}" tabindex="0" role="button" aria-label="${d.label}: income ${fmt(d.income)}, expenses ${fmt(d.expense)}"/></g><text data-time-label="${i}" x="${x(i)}" y="${H-8}" text-anchor="middle">${d.label}</text>`;});
  return `<svg class="chart" data-baseline="${H-m.b}" viewBox="0 0 ${W} ${H}" role="group" aria-label="${isB?'Bar':'Line'} chart showing income and expenses. Focus a period for its amounts.">${out}</svg>`;
}
function chartPanel() {
  const t=totals();
  return `<section class="panel chart-panel"><div class="panel-top"><div><h2>Cash flow</h2><p>Income and expenses over time</p></div><div class="legend"><span><i></i>Income</span><span><i class="out"></i>Expenses</span></div></div><div class="chart-space">${chartMarkup()}<div class="chart-tip" id="chart-tip" role="status" aria-live="polite"></div></div><div class="chart-bottom"><span>${periodName()}</span><span><strong>${fmtWhole(t.balance)}</strong> net movement</span></div></section>`;
}
function categoryPanel() {
  const cats=categories(),sum=cats.reduce((s,r)=>s+r.total,0),palette=colors();
  if(!sum)return `<section class="panel category-panel"><div class="panel-top"><h2>Expense breakdown</h2></div><div class="empty"><h3>No expenses in this period</h3><p>Add an expense to see the breakdown.</p></div></section>`;
  if(isB)return `<section class="panel category-panel"><div class="panel-top"><div><h2>Where it went</h2><p>Expenses by category</p></div><a class="panel-link" href="#analytics" aria-label="Open expense reports">${icon('arrow-up-right')}</a></div><div class="spend-bars">${cats.map((r,i)=>`<div class="spend-row"><span>${r.name}</span><strong>${fmtWhole(r.total)}</strong><div class="track"><i style="width:${r.total/sum*100}%;background:${palette[i]}"></i></div></div>`).join('')}</div><p class="spend-footer">${cats[0].name} makes up ${Math.round(cats[0].total/sum*100)}% of recorded expenses.</p></section>`;
  return `<section class="panel category-panel expense-ledger"><div class="panel-top"><div><h2>Spending</h2><p>By category · ${fmtWhole(sum)}</p></div></div><div class="category-ledger-list">${cats.map((r,i)=>`<div class="category-row ledger-category"><span class="label">${r.name}</span><strong>${fmtWhole(r.total)}</strong><span class="category-share">${Math.round(r.total/sum*100)}%</span><span class="category-line"><i style="width:${r.total/sum*100}%;background:${palette[i]}"></i></span></div>`).join('')}</div><p class="category-caption"><strong>${cats[0].name}</strong> is the largest expense category.</p></section>`;
}

function tableRows(rows) {
  return rows.map(r=>`<tr><td><div class="description-cell"><span class="transaction-symbol">${icon(categoryIcon(r.category))}</span><div><strong>${esc(r.description)}</strong><small class="mobile-meta">${esc(r.category)} · ${dateLabel(r.date)}</small></div></div></td><td class="meta-col muted">${esc(r.category)}</td><td class="meta-col date">${dateLabel(r.date)}</td><td class="meta-col"><span class="type-tag ${r.type==='INCOME'?'income':'expense'}">${icon(r.type==='INCOME'?'arrow-down-left':'arrow-up-right')}${r.type==='INCOME'?'Income':'Expense'}</span></td><td class="amount ${r.type==='INCOME'?'income':''}">${r.type==='INCOME'?'+':'−'}${fmt(r.amountMinor)}</td><td class="action-cell"><button class="icon-button" data-action="edit" data-id="${r.id}" aria-label="Edit ${esc(r.description)}" title="Edit transaction">${icon('pencil')}</button></td></tr>`).join('');
}
function transactionsTable(rows, recent=false) {
  return `<div class="table-scroll"><table class="transaction-table"><thead><tr><th>Description</th><th class="meta-col">Category</th><th class="meta-col">Date</th><th class="meta-col">Type</th><th class="amount">Amount</th><th class="action-cell"><span class="sr-only">Actions</span></th></tr></thead><tbody>${tableRows(rows)}</tbody></table>${!rows.length?'<div class="empty"><h3>No transactions match</h3><p>Try a different search or clear the filters.</p></div>':''}</div><div class="table-footer"><span>${recent?`Showing the ${rows.length} most recent entries`:`${rows.length} matching transactions`}</span>${recent?'<a class="panel-link" href="#transactions">View all transactions '+icon('arrow-right')+'</a>':'<span>Sample records</span>'}</div>`;
}
function recentPanel() {
  const rows=selectedRecords().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  return `<section class="panel transactions-panel"><div class="panel-top"><h2>Recent transactions</h2><button class="button text" data-action="export">${icon('download')}Export</button></div>${transactionsTable(rows,true)}</section>`;
}
function head(title,subtitle,extra='') {return `<div class="page-head"><div><h1 tabindex="-1">${title}</h1><p>${subtitle}</p></div><div class="head-actions">${extra||periodControl()+addButton()}</div></div>`;}
function overview() {
  const heading=head('Overview',periodName());
  if(!isB)return heading+`<div class="workspace-analysis">${summaryA()}${chartPanel()}${categoryPanel()}</div>`+recentPanel();
  return heading+summaryB()+`<div class="analysis-grid">${chartPanel()}${categoryPanel()}</div>`+recentPanel();
}
function filteredRows(){return selectedRecords().filter(r=>(state.filter==='ALL'||r.type===state.filter)&&`${r.description} ${r.category}`.toLowerCase().includes(state.query.toLowerCase())).sort((a,b)=>b.date.localeCompare(a.date));}
function transactions(){return head('Transactions','Every recorded income and expense, in one place.')+`<section class="panel transactions-panel table-view"><div class="filters"><label class="field-search">${icon('search')}<input id="transaction-search" placeholder="Search description or category" aria-label="Search transactions" value="${esc(state.query)}"></label><div class="segments" role="group" aria-label="Transaction type">${[['ALL','All records'],['INCOME','Income'],['EXPENSE','Expenses']].map(([v,l])=>`<button data-action="filter" data-filter="${v}" aria-pressed="${state.filter===v}">${l}</button>`).join('')}</div><button class="button secondary" data-action="export">${icon('download')}Export CSV</button></div><div id="transaction-results">${transactionsTable(filteredRows())}</div></section>`;}
function analytics(){const data=buckets();return head('Reports','Understand the movement behind your balance.',periodControl()+`<button class="button" data-action="export-report">${icon('download')}Export report</button>`)+`<div class="report-grid"><div class="analysis-grid">${chartPanel()}${categoryPanel()}</div><section class="panel"><div class="panel-top"><h2>Period summary</h2><span class="micro-label">${periodName()}</span></div><div class="table-scroll"><table class="transaction-table"><thead><tr><th>Period</th><th class="amount">Income</th><th class="amount">Expenses</th><th class="amount">Net</th></tr></thead><tbody>${data.map(d=>`<tr><td>${d.label}</td><td class="amount">${fmtWhole(d.income)}</td><td class="amount">${fmtWhole(d.expense)}</td><td class="amount ${d.income-d.expense>=0?'income':'expense'}">${fmtWhole(d.income-d.expense)}</td></tr>`).join('')}</tbody></table></div></section></div>`;}
function team(){return head('Team','Give each person the access their role needs.',`<button class="button" data-action="add-member">${icon('plus')}Add member</button>`)+`<section class="panel"><div class="panel-top"><h2>Workspace members</h2><span class="micro-label">${state.members.length} members</span></div><div class="table-scroll"><table class="transaction-table team-table"><thead><tr><th>Name</th><th>Access</th><th>Status</th><th class="amount">Actions</th></tr></thead><tbody>${state.members.map(m=>`<tr><td><div class="person"><span class="avatar">${m.name.split(' ').map(n=>n[0]).slice(0,2).join('')}</span><div><strong>${esc(m.name)}${m.id==='self'?' (you)':''}</strong><small>${esc(m.email)}</small></div></div></td><td><select class="small-select" data-member-role="${m.id}" aria-label="Role for ${esc(m.name)}" ${m.id==='self'?'disabled':''}>${['ADMIN','ANALYST','VIEWER'].map(role=>`<option value="${role}" ${m.role===role?'selected':''}>${role.charAt(0)+role.slice(1).toLowerCase()}</option>`).join('')}</select></td><td><span class="type-tag ${m.active?'income':'muted'}">${m.active?'Active':'Disabled'}</span></td><td class="amount"><button class="button text" data-action="member-status" data-id="${m.id}" ${m.id==='self'?'disabled':''}>${m.active?'Disable':'Enable'}</button></td></tr>`).join('')}</tbody></table></div><div class="table-footer"><span>Admins manage records and people. Analysts read records. Viewers see summaries.</span></div></section>`;}
function settings(){return head('Settings','Make this workspace feel like yours.',`<span class="micro-label">Preview preferences</span>`)+`<div class="settings-grid"><section class="panel"><div class="panel-top"><h2>Workspace preferences</h2></div><form id="settings-form" class="settings-form"><div class="field"><label for="workspace-name">Workspace name</label><input id="workspace-name" name="workspace" required maxlength="50" value="${esc(state.workspace)}"></div><div class="field"><label for="workspace-currency">Currency</label><input id="workspace-currency" value="INR · Indian rupee" readonly><span class="hint">This preview uses one currency throughout.</span></div><div class="field"><label for="theme-select">Appearance</label><select id="theme-select" name="theme"><option value="light" ${document.documentElement.dataset.theme==='light'?'selected':''}>Light</option><option value="dark" ${document.documentElement.dataset.theme==='dark'?'selected':''}>Dark</option></select></div><div><button class="button" type="submit">Save preferences</button></div></form></section><section class="panel settings-note">${icon('shield-check')}<div><h2>Preview workspace</h2><p>These controls change only this design preview. The finished product will connect them to your authenticated workspace.</p></div></section></div>`;}

function animateMetrics(){
  document.querySelectorAll('[data-metric]').forEach(el=>{const key=el.dataset.metric,to=Number(el.dataset.value),from=lastMetrics[key];if(from==null||from===to||reduce()){lastMetrics[key]=to;return;}el.textContent=fmt(from);const start=performance.now();function step(now){if(!el.isConnected)return;const p=Math.min(1,(now-start)/DATA_TRANSITION_MS),value=Math.round(from+(to-from)*dataEase(p));lastMetrics[key]=value;el.textContent=fmt(value);if(p<1)requestAnimationFrame(step);}requestAnimationFrame(step);});
}

// Interpolate actual chart geometry on a period change. Shared month bars retain
// their identity; line/area paths are resampled so different time grains morph.
function samplePath(path){if(!path)return null;const length=path.getTotalLength();return Array.from({length:64},(_,i)=>{const p=path.getPointAtLength(length*i/63);return{x:p.x,y:p.y};});}
function barShape(rect){return Object.fromEntries(['x','y','width','height'].map(a=>[a,Number(rect.getAttribute(a))]));}
function captureChart(){const svg=document.querySelector('.chart');if(!svg)return null;return{income:samplePath(svg.querySelector('.income-line')),expense:samplePath(svg.querySelector('.expense-line')),bars:new Map([...svg.querySelectorAll('[data-bar]')].map(r=>[r.dataset.bar,{...barShape(r),fill:r.getAttribute('fill')}]))};}
function morphChart(previous){
  const svg=document.querySelector('.chart');if(!svg||!previous||reduce())return;
  cancelAnimationFrame(chartFrame);
  const baseline=Number(svg.dataset.baseline),start=performance.now();
  const paths=['income','expense'].map(key=>{const el=svg.querySelector(`.${key}-line`);return el&&previous[key]?{el,from:previous[key],to:samplePath(el),final:el.getAttribute('d'),key}:null;}).filter(Boolean);
  const area=svg.querySelector('.chart-area'),areaFinal=area?.getAttribute('d');
  const bars=[...svg.querySelectorAll('[data-bar]')].map(el=>{const to=barShape(el),old=previous.bars.get(el.dataset.bar);return{el,to,from:old||{...to,y:baseline,height:0,width:to.width*.4,x:to.x+to.width*.3}};});
  const activeKeys=new Set(bars.map(b=>b.el.dataset.bar));
  const ghosts=[];
  if(isB)previous.bars.forEach((old,key)=>{if(activeKeys.has(key))return;const el=document.createElementNS('http://www.w3.org/2000/svg','rect');Object.entries(old).forEach(([a,v])=>el.setAttribute(a,String(v)));el.setAttribute('rx','4');el.setAttribute('aria-hidden','true');svg.append(el);ghosts.push({el,from:old});});
  const interpolate=(a,b,p)=>a+(b-a)*p;
  svg.dataset.animating='true';svg.setAttribute('aria-busy','true');
  function draw(now){
    if(!svg.isConnected)return;
    const progress=reduce()?1:Math.min(1,(now-start)/DATA_TRANSITION_MS),p=dataEase(progress);
    for(const path of paths){const points=path.to.map((point,i)=>({x:interpolate(path.from[i].x,point.x,p),y:interpolate(path.from[i].y,point.y,p)}));const d=points.map((point,i)=>`${i?'L':'M'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');path.el.setAttribute('d',d);if(path.key==='income'&&area)area.setAttribute('d',`${d} L${points.at(-1).x} ${baseline} L${points[0].x} ${baseline}Z`);}
    for(const bar of bars)for(const a of ['x','y','width','height'])bar.el.setAttribute(a,String(interpolate(bar.from[a],bar.to[a],p)));
    for(const ghost of ghosts){ghost.el.setAttribute('height',String(ghost.from.height*(1-p)));ghost.el.setAttribute('y',String(ghost.from.y+ghost.from.height*p));ghost.el.setAttribute('opacity',String(1-p));}
    if(progress<1)chartFrame=requestAnimationFrame(draw);else{paths.forEach(path=>path.el.setAttribute('d',path.final));if(area)area.setAttribute('d',areaFinal);ghosts.forEach(g=>g.el.remove());delete svg.dataset.animating;svg.setAttribute('aria-busy','false');}
  }
  draw(start);chartFrame=requestAnimationFrame(draw);
}

function syncLiveMotion(){
  liveGuide?.setRunning(liveEnabled&&!reduce()&&!document.hidden&&!drawer.open);
  const button=document.querySelector('[data-action=toggle-live]');
  if(button){button.textContent=liveEnabled?'Pause auto insights':'Resume auto insights';button.setAttribute('aria-pressed',String(liveEnabled));button.disabled=reduce();}
}
function setLiveMotion(enabled){liveEnabled=Boolean(enabled)&&!reduce();syncLiveMotion();}
function initLiveGuide(){
  liveGuide=createLiveCharts({series:buckets(),categories:categories(),colors:colors(),isBars:isB,formatMoney:fmt,formatShort:value=>shortMoney.format(value/100),running:liveEnabled&&!document.hidden&&!drawer.open,reduced:reduce()});
}
function bindChart(){
  chartResizeObserver?.disconnect();
  chartResizeObserver=null;
  const chart=document.querySelector('.chart');
  if(chart){const compensate=()=>{const width=chart.getBoundingClientRect().width;if(width)chart.style.setProperty('--chart-label-size',`${13*chart.viewBox.baseVal.width/width}px`);};compensate();chartResizeObserver=new ResizeObserver(compensate);chartResizeObserver.observe(chart);}
  document.querySelectorAll('[data-point]').forEach(point=>{
    const show=(hold=false)=>{const index=Number(point.dataset.point),d=buckets()[index],tip=document.querySelector('#chart-tip');if(!d||!tip)return;if(hold)liveGuide?.holdPeriod(index);tip.innerHTML=`<strong>${d.label}</strong><div>Income <b>${fmt(d.income)}</b></div><div>Expenses <b>${fmt(d.expense)}</b></div><div>Net <b>${fmt(d.income-d.expense)}</b></div>`;tip.classList.add('visible');};
    const hide=()=>{document.querySelector('#chart-tip')?.classList.remove('visible');if(!point.contains(document.activeElement))liveGuide?.releasePeriod();};
    point.addEventListener('pointerenter',()=>show(false));point.addEventListener('pointerleave',hide);point.addEventListener('focusin',()=>show(true));point.addEventListener('focusout',()=>{hide();liveGuide?.releasePeriod();});
  });
}
function render(animated=false){
  const update=()=>{liveGuide?.destroy();const page={overview,transactions,analytics,team,settings}[state.view]||overview;app.innerHTML=shell(page());initLiveGuide();bindChart();animateMetrics();};
  if(animated&&document.startViewTransition&&!reduce()) {transition?.skipTransition();transition=document.startViewTransition(update);transition.finished.catch(()=>{});}else update();
}
function toast(message){const t=document.querySelector('#toast');t.textContent=message;t.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('visible'),3200);}
async function closeDrawer(){if(!drawer.open)return;if(!reduce())await drawer.querySelector('.drawer-inner')?.animate([{opacity:1,transform:'translateX(0)'},{opacity:0,transform:'translateX(18px)'}],{duration:160,easing:'ease-in'}).finished;drawer.close();drawer.innerHTML='';syncLiveMotion();}
function openDrawer(title,subtitle,content){
  drawer.innerHTML=`<div class="drawer-inner"><div class="drawer-head"><div><h2 id="drawer-title">${title}</h2><p>${subtitle}</p></div><button class="icon-button" data-action="close" aria-label="Close panel">${icon('x')}</button></div>${content}<p class="drawer-note">Sample data only. Changes are local to this preview and reset on reload.</p></div>`;
  drawer.showModal();syncLiveMotion();if(!reduce())drawer.querySelector('.drawer-inner').animate([{opacity:.5,transform:'translateX(22px)'},{opacity:1,transform:'translateX(0)'}],{duration:280,easing:'cubic-bezier(.16,1,.3,1)'});
}
function openRecord(id,preferredType='EXPENSE'){
  const r=state.records.find(r=>r.id===id);
  openDrawer(r?'Edit transaction':'Add transaction','Keep the details clear. We’ll update the preview totals.',`<form id="record-form" class="drawer-form" data-id="${r?.id||''}"><div class="field"><label for="record-type">Type</label><select id="record-type" name="type">${['EXPENSE','INCOME'].map(type=>`<option value="${type}" ${(r?.type||preferredType)===type?'selected':''}>${type==='EXPENSE'?'Expense':'Income'}</option>`).join('')}</select></div><div class="field"><label for="record-amount">Amount in INR</label><div class="amount-field"><span>₹</span><input id="record-amount" name="amount" inputmode="decimal" placeholder="0.00" value="${r?(r.amountMinor/100).toFixed(2):''}" required autocomplete="off"></div></div><div class="field"><label for="record-description">Description</label><input id="record-description" name="description" placeholder="e.g. Website project" maxlength="100" required value="${esc(r?.description)}"></div><div class="field-row"><div class="field"><label for="record-category">Category</label><select id="record-category" name="category">${['Consulting','Projects','Payroll','Rent','Software','Hosting','Marketing','Travel'].map(c=>`<option ${r?.category===c?'selected':''}>${c}</option>`).join('')}</select></div><div class="field"><label for="record-date">Date</label><input id="record-date" name="date" type="date" max="2026-11-07" required value="${r?.date||'2026-11-07'}"></div></div><p id="record-error" class="form-error" role="alert"></p><div class="drawer-footer"><button type="button" class="button secondary" data-action="close">Cancel</button><button type="submit" class="button">${r?'Save changes':'Add transaction'}</button></div>${r?`<button type="button" class="button text expense" data-action="delete" data-id="${r.id}">Delete this preview transaction</button>`:''}</form>`);
}
function memberDrawer(){openDrawer('Add member','Try the team-management layout with a sample person.',`<form id="member-form" class="drawer-form"><div class="field"><label for="member-name">Full name</label><input id="member-name" name="name" required maxlength="60" placeholder="Full name"></div><div class="field"><label for="member-email">Email address</label><input id="member-email" name="email" type="email" required placeholder="person@example.com"></div><div class="field"><label for="member-role">Access level</label><select id="member-role" name="role"><option value="VIEWER">Viewer</option><option value="ANALYST">Analyst</option><option value="ADMIN">Admin</option></select></div><div class="drawer-footer"><button type="button" class="button secondary" data-action="close">Cancel</button><button type="submit" class="button">Add to preview</button></div></form>`);}
function activity(){const rows=state.records.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,7);openDrawer('Workspace activity','Recent sample entries in this workspace.',`<div class="category-list">${rows.map(r=>`<div style="padding:12px 0;border-bottom:1px solid var(--line)"><div style="display:flex;justify-content:space-between;gap:10px;font-size:13px"><strong>${esc(r.description)}</strong><span>${fmtWhole(r.amountMinor)}</span></div><p class="muted" style="font-size:12px;margin-top:4px">${dateLabel(r.date)} · ${esc(r.category)}</p></div>`).join('')}</div>`);}
function exportCsv(report=false){
  const safe=v=>{let s=String(v);if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
  const rows=report?[['Period','Income (INR)','Expenses (INR)','Net (INR)'],...buckets().map(d=>[d.key,(d.income/100).toFixed(2),(d.expense/100).toFixed(2),((d.income-d.expense)/100).toFixed(2)])]:[['Date','Description','Category','Type','Amount (INR)'],...filteredRows().map(r=>[r.date,r.description,r.category,r.type,(r.amountMinor/100).toFixed(2)])];
  const blob=new Blob([rows.map(r=>r.map(safe).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`finance-workspace-preview-${report?'report':'transactions'}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Sample data exported as CSV.');
}
function searchTransactions(){if(state.view!=='transactions'){location.hash='transactions';requestAnimationFrame(()=>document.querySelector('#transaction-search')?.focus());}else document.querySelector('#transaction-search')?.focus();}

document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-action]');if(!button)return;
  switch(button.dataset.action){
    case 'add':case 'add-expense':openRecord();break;
    case 'add-income':openRecord(null,'INCOME');break;
    case 'edit':openRecord(button.dataset.id);break;
    case 'close':await closeDrawer();break;
    case 'delete':state.records=state.records.filter(r=>r.id!==button.dataset.id);await closeDrawer();render(true);toast('Transaction removed from preview data.');break;
    case 'theme':document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';render();break;
    case 'toggle-live':setLiveMotion(!liveEnabled);break;
    case 'menu-open':state.menuOpen=true;document.querySelector('.sidebar').inert=false;document.querySelector('.shell').classList.add('nav-open');document.querySelector('.sidebar .nav a')?.focus();break;
    case 'menu-close':state.menuOpen=false;document.querySelector('.shell').classList.remove('nav-open');document.querySelector('.sidebar').inert=innerWidth<=760;document.querySelector('.mobile-toggle')?.focus();break;
    case 'workspace':location.hash='settings';break;
    case 'search':searchTransactions();break;
    case 'activity':activity();break;
    case 'filter':state.filter=button.dataset.filter;render();document.querySelector('#transaction-search')?.focus();break;
    case 'export':exportCsv();break;
    case 'export-report':exportCsv(true);break;
    case 'add-member':memberDrawer();break;
    case 'member-status':{const m=state.members.find(m=>m.id===button.dataset.id);if(m&&m.id!=='self'){m.active=!m.active;render();toast(m.active?'Preview member enabled.':'Preview member disabled.');}break;}
  }
});
document.addEventListener('change',event=>{
  const el=event.target;
  if(el.matches('[data-control=period]')){const previous=captureChart();state.period=Number(el.value);render();morphChart(previous);document.querySelector('[data-control=period]')?.focus();}
  if(el.matches('[data-member-role]')){const m=state.members.find(m=>m.id===el.dataset.memberRole);if(m&&m.id!=='self'){m.role=el.value;toast('Role updated in this preview.');}}
});
document.addEventListener('input',event=>{if(event.target.id==='transaction-search'){state.query=event.target.value;document.querySelector('#transaction-results').innerHTML=transactionsTable(filteredRows());}});
document.addEventListener('submit',async event=>{
  const form=event.target;
  if(form.id==='record-form'){
    event.preventDefault();const data=Object.fromEntries(new FormData(form));const match=data.amount.trim().match(/^(\d{1,9})(?:\.(\d{1,2}))?$/);
    const amountMinor=match?Number(match[1])*100+Number((match[2]||'').padEnd(2,'0')):0;
    if(!match||amountMinor<=0||!data.description.trim()){document.querySelector('#record-error').textContent='Enter a description and an amount above zero, with up to two decimal places.';return;}
    const id=form.dataset.id||'preview-'+crypto.randomUUID();const record={id,description:data.description.trim(),category:data.category,type:data.type,date:data.date,amountMinor};
    const index=state.records.findIndex(r=>r.id===id);if(index<0)state.records.push(record);else state.records[index]=record;
    await closeDrawer();render(true);toast(index<0?'Transaction added to this preview.':'Preview transaction updated.');
  }else if(form.id==='member-form'){
    event.preventDefault();const data=Object.fromEntries(new FormData(form));state.members.push({id:crypto.randomUUID(),name:data.name.trim(),email:data.email,role:data.role,active:true});await closeDrawer();render(true);toast('Member added locally. No invitation email was sent.');
  }else if(form.id==='settings-form'){
    event.preventDefault();const data=Object.fromEntries(new FormData(form));state.workspace=data.workspace.trim()||'Demo workspace';document.documentElement.dataset.theme=data.theme;render();toast('Preview preferences saved for this tab.');
  }
});
drawer.addEventListener('cancel',event=>{event.preventDefault();closeDrawer();});
drawer.addEventListener('click',event=>{if(event.target===drawer){const r=drawer.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeDrawer();}});
document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();searchTransactions();}if(event.key.toLowerCase()==='n'&&!drawer.open&&!event.target.closest('input,select,textarea')){event.preventDefault();openRecord();}});
window.addEventListener('hashchange',()=>{state.view=location.hash.slice(1)||'overview';state.menuOpen=false;render(true);});
matchMedia('(max-width:760px)').addEventListener('change',()=>render());
window.addEventListener('message',event=>{if(embedded&&event.source===window.parent&&event.origin===location.origin&&event.data?.type==='finance-preview:motion')setLiveMotion(event.data.playing===true);});
document.addEventListener('visibilitychange',syncLiveMotion);
motionPreference.addEventListener('change',()=>{if(reduce())liveEnabled=false;render();});
render();
if(embedded)window.parent.postMessage({type:'finance-preview:ready'},location.origin);
