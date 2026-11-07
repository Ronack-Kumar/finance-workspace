import { esc, money, compact, palette, preference } from './lib.js';
import { createLiveCharts } from './live-charts.js';

let guide,observer,resizeFrame;
let enabled=!preference.matches;
export function stopCharts(){guide?.destroy();guide=null;observer?.disconnect();observer=null;cancelAnimationFrame(resizeFrame);}
export function syncCharts(){guide?.setRunning(enabled&&!preference.matches&&!document.hidden&&!document.querySelector('#drawer').open);const b=document.querySelector('[data-action=motion]');if(b){b.textContent=enabled&&!preference.matches?'Pause insights':'Resume insights';b.disabled=preference.matches;b.setAttribute('aria-pressed',String(enabled&&!preference.matches));}}
export function toggleCharts(){enabled=!enabled;syncCharts();}
document.addEventListener('visibilitychange',syncCharts);
preference.addEventListener('change',()=>{if(preference.matches)enabled=false;syncCharts();});

export function summary(report){const t=report.totals;return `<section class="panel summary-strip" aria-label="Financial summary"><div class="summary-cell"><div class="summary-label">Net recorded balance</div><div class="summary-amount ${BigInt(t.balance)<0n?'expense':'income'}" data-metric="balance">${money(t.balance)}</div><p class="summary-foot">Income minus expenses · ${t.count} records</p></div><div class="summary-cell"><div class="summary-label">Total income</div><div class="summary-amount">${money(t.income)}</div><p class="summary-foot">${t.incomeCount} income entries in this period</p></div><div class="summary-cell"><div class="summary-label">Total expenses</div><div class="summary-amount">${money(t.expense)}</div><p class="summary-foot">${t.expenseCount} expense entries in this period</p></div></section>`;}
export function svgChart(data,width=640){
  const W=Math.max(360,width),H=240,m={l:53,r:18,t:20,b:36};
  const ceiling=Math.max(100,...data.flatMap(d=>[Number(d.income),Number(d.expense)]))*1.1;
  const iw=W-m.l-m.r,ih=H-m.t-m.b,x=i=>m.l+(i+.5)*iw/data.length,y=v=>m.t+ih-Number(v)/ceiling*ih;
  let svg='<defs><linearGradient id="cash-fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="var(--chart-income)" stop-opacity=".16"/><stop offset="1" stop-color="var(--chart-income)" stop-opacity="0"/></linearGradient></defs>';
  for(let i=0;i<4;i++){const value=ceiling*i/3;svg+=`<line class="gridline" x1="${m.l}" x2="${W-m.r}" y1="${y(value)}" y2="${y(value)}"/><text x="${m.l-9}" y="${y(value)+4}" text-anchor="end">${new Intl.NumberFormat('en-IN',{notation:'compact',maximumFractionDigits:1}).format(value/100)}</text>`;}
  const curve=key=>data.map((d,i)=>`${i?'L':'M'}${x(i)} ${y(d[key])}`).join(' ');
  const income=curve('income');
  svg+=`<path class="chart-area" d="${income} L${x(data.length-1)} ${H-m.b} L${x(0)} ${H-m.b}Z" fill="url(#cash-fill)"/><path class="income-line" d="${income}"/><path class="expense-line" d="${curve('expense')}"/>`;
  const every=Math.max(1,Math.ceil(data.length/(W<500?5:8)));
  data.forEach((d,i)=>{svg+=`<g class="chart-point" data-point="${i}"><line class="chart-hover-line" x1="${x(i)}" x2="${x(i)}" y1="${m.t}" y2="${H-m.b}"/><rect class="hit" x="${x(i)-iw/data.length/2}" y="${m.t}" width="${iw/data.length}" height="${ih}" tabindex="${i===0?'0':'-1'}" role="button" vector-effect="non-scaling-stroke" aria-label="${esc(d.label)}: income ${money(d.income)}, expenses ${money(d.expense)}, net ${money(BigInt(d.income)-BigInt(d.expense))}"/></g>`;if(i%every===0||i===data.length-1)svg+=`<text data-time-label="${i}" x="${x(i)}" y="${H-8}" text-anchor="middle">${esc(d.label)}</text>`;});
  return `<svg class="chart" data-baseline="${H-m.b}" viewBox="0 0 ${W} ${H}" role="group" aria-label="Income and expenses in INR. Use the arrow keys to explore periods, Enter to inspect, and Escape to resume insights.">${svg}</svg>`;
}
export function categoryData(report){const cats=report.categories;return cats.length>4?[...cats.slice(0,3),{name:'Other',total:cats.slice(3).reduce((sum,c)=>sum+BigInt(c.total),0n).toString()}]:cats;}
export function chartPanel(report){return `<section class="panel chart-panel"><div class="panel-top"><h2>Cash flow</h2><div class="legend"><span><i></i>Income</span><span><i class="out"></i>Expenses</span></div></div><div class="chart-space">${svgChart(report.series)}<div class="chart-tip" id="chart-tip" role="status"></div></div><div class="chart-bottom"><span>INR · ${report.start} — ${report.end}</span><span>${report.totals.count?'':'No recorded movement'}</span></div></section>`;}
export function categoryPanel(report){const cats=categoryData(report),sum=Number(report.totals.expense),colors=palette();return `<section class="panel category-panel expense-ledger"><div class="panel-top"><div><h2>Spending</h2><p>By category · ${money(report.totals.expense)}</p></div></div>${!sum?'<div class="empty compact-empty"><h3>No expenses yet</h3><p>Your category breakdown will appear here.</p></div>':`<div class="category-ledger-list">${cats.map((c,i)=>`<div class="category-row ledger-category"><span class="label">${esc(c.name)}</span><strong title="${money(c.total)}">${compact(c.total)}</strong><span class="category-share">${Math.round(Number(c.total)/sum*100)}%</span><span class="category-line"><i style="width:${Number(c.total)/sum*100}%;background:${colors[i]}"></i></span></div>`).join('')}</div><p class="category-caption"></p>`}</section>`;}
export function bindCharts(report){
  stopCharts();const panel=document.querySelector('.chart-panel');if(!panel)return;
  let lastWidth=0,dismissed=false;
  const draw=()=>{
    const width=Math.round(panel.querySelector('.chart-space').clientWidth);if(width===lastWidth)return;lastWidth=width;
    const selected=Number(panel.querySelector('.hit[tabindex="0"]')?.parentElement.dataset.point||0),hadFocus=panel.querySelector('.chart')?.contains(document.activeElement),keepDismissed=dismissed;
    guide?.destroy();panel.querySelector('.chart').outerHTML=svgChart(report.series,width);
    guide=createLiveCharts({series:report.series.map(d=>({...d,income:Number(d.income),expense:Number(d.expense),rawIncome:d.income,rawExpense:d.expense})),categories:categoryData(report).map(c=>({...c,total:Number(c.total),rawTotal:c.total})),colors:palette(),isBars:false,formatMoney:money,formatShort:compact,running:enabled&&!document.hidden&&!document.querySelector('#drawer').open,reduced:preference.matches});
    panel.querySelectorAll('[data-point]').forEach(point=>{
      // Blink can make SVG groups with focus listeners implicit tab stops.
      point.setAttribute('tabindex','-1');
      const show=hold=>{dismissed=false;const i=Number(point.dataset.point),d=report.series[i];if(hold)guide.holdPeriod(i);const tip=panel.querySelector('.chart-tip');tip.innerHTML=`<strong>${esc(d.label)}</strong><div>Income <b>${money(d.income)}</b></div><div>Expenses <b>${money(d.expense)}</b></div><div>Net <b>${money(BigInt(d.income)-BigInt(d.expense))}</b></div>`;tip.classList.add('visible');};
      const hide=()=>panel.querySelector('.chart-tip').classList.remove('visible');
      point.addEventListener('pointerenter',()=>show(false));point.addEventListener('pointerleave',hide);point.addEventListener('focusin',()=>show(true));point.addEventListener('focusout',()=>{hide();guide.releasePeriod();});
      const hit=point.querySelector('.hit');
      const select=()=>{panel.querySelectorAll('.hit').forEach(el=>el.setAttribute('tabindex',el===hit?'0':'-1'));hit.focus();show(true);};
      hit.addEventListener('click',select);
      hit.addEventListener('keydown',event=>{
        const hits=[...panel.querySelectorAll('.hit')],index=hits.indexOf(hit);
        const next={ArrowRight:Math.min(hits.length-1,index+1),ArrowLeft:Math.max(0,index-1),Home:0,End:hits.length-1}[event.key];
        if(next!==undefined){event.preventDefault();hits.forEach((el,i)=>el.setAttribute('tabindex',i===next?'0':'-1'));hits[next].focus();}
        else if(event.key==='Enter'||event.key===' '){event.preventDefault();show(true);}
        else if(event.key==='Escape'){event.preventDefault();dismissed=true;hide();guide.releasePeriod();}
      });
    });
    const hits=[...panel.querySelectorAll('.hit')];hits.forEach((hit,i)=>hit.setAttribute('tabindex',i===selected?'0':'-1'));
    if(hadFocus)hits[selected]?.focus({preventScroll:true});
    if(keepDismissed){dismissed=true;panel.querySelector('.chart-tip').classList.remove('visible');guide.releasePeriod();}
    syncCharts();
  };
  draw();observer=new ResizeObserver(()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(draw);});observer.observe(panel);
}
