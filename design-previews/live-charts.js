// Continuous, data-bound focus. The series and financial values never change here.
const NS='http://www.w3.org/2000/svg';
const node=(tag,attrs={})=>{const el=document.createElementNS(NS,tag);for(const [name,value] of Object.entries(attrs))el.setAttribute(name,String(value));return el;};
const lerp=(a,b,p)=>a+(b-a)*p;

function pointsFor(path){
  if(!path)return [];
  const length=path.getTotalLength();
  return Array.from({length:256},(_,i)=>{const p=path.getPointAtLength(length*i/255);return {x:p.x,y:p.y};});
}
function pointAtX(points,x){
  if(!points.length)return {x,y:0};
  let lo=0,hi=points.length-1;
  while(hi-lo>1){const mid=(lo+hi)>>1;if(points[mid].x<x)lo=mid;else hi=mid;}
  const a=points[lo],b=points[hi],p=Math.max(0,Math.min(1,(x-a.x)/(b.x-a.x||1)));
  return {x,y:lerp(a.y,b.y,p)};
}

export function createLiveCharts({root=document,series,categories,colors,isBars,formatMoney,formatShort,running=false,reduced=false}){
  const svg=root.querySelector('.chart');
  if(!svg||!series.length)return {setRunning(){},holdPeriod(){},releasePeriod(){},destroy(){}};
  const baseline=Number(svg.dataset.baseline),top=18;
  const hits=[...svg.querySelectorAll('.chart-point .hit')];
  const centers=hits.map(hit=>Number(hit.getAttribute('x'))+Number(hit.getAttribute('width'))/2);
  const bandWidth=Number(hits[0]?.getAttribute('width')||40);
  const pathIncome=pointsFor(svg.querySelector('.income-line'));
  const pathExpense=pointsFor(svg.querySelector('.expense-line'));
  const barPairs=series.map(d=>({income:svg.querySelector(`[data-bar="income-${d.key}"]`),expense:svg.querySelector(`[data-bar="expense-${d.key}"]`)}));
  const guide=node('g',{class:'live-guide','aria-hidden':'true','pointer-events':'none'});
  const band=node('rect',{class:'live-focus-band',y:top,width:bandWidth*.8,height:baseline-top,rx:6});
  const line=node('line',{class:'live-cursor',y1:top,y2:baseline});
  const halo=node('circle',{class:'live-halo',r:9});
  const inDot=node('circle',{class:'live-income-dot',r:4.5});
  const outDot=node('circle',{class:'live-expense-dot',r:3.5});
  guide.append(band,line,halo,inDot,outDot);
  const glints={};
  if(isBars){
    const defs=node('defs');
    for(const kind of ['income','expense']){
      const clip=node('clipPath',{id:`live-${kind}-clip`});const clipRect=node('rect');clip.append(clipRect);defs.append(clip);
      const group=node('g',{'clip-path':`url(#live-${kind}-clip)`});const glint=node('rect',{class:'live-bar-glint',height:15});group.append(glint);guide.append(group);glints[kind]={clipRect,glint};
    }
    guide.append(defs);
  }
  svg.append(guide);

  const reading=document.createElement('div');
  reading.className='live-reading';reading.setAttribute('aria-live','off');
  reading.innerHTML='<div class="reading-period"><span class="reading-label">Period spotlight</span><strong data-reading-period></strong><small data-reading-note></small></div><div><span class="reading-label">Income</span><strong data-reading-income></strong></div><div><span class="reading-label">Expenses</span><strong data-reading-expense></strong></div><div><span class="reading-label">Net</span><strong data-reading-net></strong></div>';
  const panel=svg.closest('.chart-panel');panel.querySelector('.chart-space').after(reading);
  const activePeriods=series.filter(d=>d.income||d.expense);
  const positive=activePeriods.filter(d=>d.income>d.expense).length;
  const bestNet=Math.max(...series.map(d=>d.income-d.expense));
  const bestIndex=series.findIndex(d=>d.income-d.expense===bestNet);
  const initialPhase=(bestIndex===series.length-1&&series.length>1) ? .93 : bestIndex/Math.max(1,series.length-1);
  const units=series[0].key.length>7?'days':'months';
  const summary=panel.querySelector('.chart-bottom');
  if(summary)summary.lastElementChild.textContent=activePeriods.length?`Income exceeded expenses in ${positive} of ${activePeriods.length} active ${units}`:'No recorded movement in this period';

  const categoryPanel=root.querySelector('.category-panel');
  const categoryRows=[...root.querySelectorAll(isBars?'.spend-row':'.category-row')];
  const totalExpenses=categories.reduce((sum,item)=>sum+item.total,0);
  const donut=root.querySelector('.donut');
  let orbit,arc;
  if(donut&&categories.length){orbit=node('svg',{class:'category-orbit',viewBox:'0 0 100 100','aria-hidden':'true'});arc=node('circle',{cx:50,cy:50,r:47,fill:'none','stroke-width':2.5,pathLength:100,transform:'rotate(-90 50 50)','stroke-linecap':'round'});orbit.append(arc);donut.append(orbit);}

  let frame=0,enabled=false,elapsed=0,previousTime=0,manualIndex=null,periodIndex=-1,categoryIndex=-1,bandX=centers.at(-1),destroyed=false;
  const duration=18000;
  const attrs=(el,values)=>{for(const [key,value] of Object.entries(values))el.setAttribute(key,String(value));};
  function updateReading(index){
    if(periodIndex===index)return;
    periodIndex=index;
    const d=series[index],net=d.income-d.expense;
    reading.dataset.activePeriod=d.key;
    reading.querySelector('[data-reading-period]').textContent=d.key.length===7?`${d.label} ${d.key.slice(0,4)}`:d.label;
    const note=net===bestNet&&net>0?'Strongest net period':net>0?'Income above expenses':net<0?'Expenses above income':'No net movement';
    reading.querySelector('[data-reading-note]').textContent=note;
    for(const [key,value] of [['income',d.income],['expense',d.expense],['net',net]]){
      const el=reading.querySelector(`[data-reading-${key}]`);el.textContent=formatShort(value);el.title=formatMoney(value);el.setAttribute('aria-label',formatMoney(value));
      if(key==='net')el.className=net>=0?'income':'expense';
    }
    svg.querySelectorAll('[data-time-label]').forEach(el=>el.classList.toggle('is-live-period',Number(el.dataset.timeLabel)===index));
    svg.querySelectorAll('[data-bar]').forEach(el=>el.classList.toggle('is-live-bar',el.dataset.bar.endsWith(d.key)));
    if(enabled&&!reduced){reading.getAnimations().forEach(a=>a.cancel());reading.animate([{opacity:.7,transform:'translateY(3px)'},{opacity:1,transform:'translateY(0)'}],{duration:180,easing:'ease-out'}).finished.catch(()=>{});}
  }
  function updateCategory(index){
    if(!categories.length||index===categoryIndex)return;
    categoryIndex=index;
    const item=categories[index],share=totalExpenses?item.total/totalExpenses*100:0;
    categoryRows.forEach((row,i)=>row.classList.toggle('is-live-category',i===index));
    if(categoryPanel)categoryPanel.dataset.activeCategory=item.name;
    if(donut){donut.querySelector('.donut-center>span').textContent=item.name;donut.querySelector('.donut-center>strong').textContent=`${Math.round(share)}%`;const start=categories.slice(0,index).reduce((sum,c)=>sum+c.total/totalExpenses*100,0);attrs(arc,{stroke:colors[index],'stroke-dasharray':`${Math.max(.1,share-1)} ${101-share}`,'stroke-dashoffset':-start});}
    const caption=categoryPanel?.querySelector(isBars?'.spend-footer':'.category-caption');
    if(caption){caption.replaceChildren();const strong=document.createElement('strong');strong.textContent=item.name;caption.append(strong,document.createTextNode(`: ${formatMoney(item.total)} · ${Math.round(share)}% of expenses`));}
  }
  function paint(phase,index,now,dt=16){
    updateReading(index);
    const x=manualIndex===null?lerp(centers[0],centers.at(-1),phase):centers[index];
    const desiredBand=isBars?centers[index]:x;
    bandX=enabled?lerp(bandX,desiredBand,1-Math.exp(-dt/115)):desiredBand;
    attrs(band,{x:bandX-bandWidth*.4});attrs(line,{x1:bandX,x2:bandX});
    if(isBars){
      for(const [kind,dot] of [['income',inDot],['expense',outDot]]){
        const bar=barPairs[index][kind];if(!bar)continue;
        const shape=Object.fromEntries(['x','y','width','height'].map(a=>[a,Number(bar.getAttribute(a))]));
        attrs(dot,{cx:shape.x+shape.width/2,cy:shape.y,opacity:shape.height?1:0});
        if(kind==='income')attrs(halo,{cx:shape.x+shape.width/2,cy:shape.y,opacity:shape.height ? .2 : 0});
        attrs(glints[kind].clipRect,shape);
        attrs(glints[kind].glint,{x:shape.x,width:shape.width,y:shape.y+shape.height-((now%1800)/1800)*(shape.height+18)});
      }
    }else{
      const income=pointAtX(pathIncome,x),expense=pointAtX(pathExpense,x);
      attrs(inDot,{cx:income.x,cy:income.y});attrs(halo,{cx:income.x,cy:income.y});attrs(outDot,{cx:expense.x,cy:expense.y});
      const edge=manualIndex!==null||!enabled?1:Math.min(1,phase/.035,(1-phase)/.035);
      guide.style.opacity=String(Math.max(.12,edge));
    }
  }
  function tick(now){
    if(destroyed||!enabled||!svg.isConnected)return;
    const dt=Math.min(50,previousTime?now-previousTime:16);previousTime=now;
    if(!svg.dataset.animating){
      if(manualIndex===null)elapsed+=dt;
      const phase=(initialPhase+elapsed/duration)%1;
      const index=manualIndex??Math.max(0,Math.min(series.length-1,Math.round(phase*(series.length-1))));
      paint(phase,index,elapsed,dt);
      updateCategory(categories.length?Math.floor(elapsed/5200)%categories.length:0);
    }
    frame=requestAnimationFrame(tick);
  }
  function setRunning(value){
    enabled=Boolean(value)&&!reduced&&activePeriods.length>0;
    cancelAnimationFrame(frame);previousTime=0;
    svg.dataset.liveRunning=String(enabled);if(categoryPanel)categoryPanel.dataset.liveRunning=String(enabled);
    if(enabled)frame=requestAnimationFrame(tick);
    else if(periodIndex>=0)paint(periodIndex/Math.max(1,series.length-1),periodIndex,elapsed);
  }
  updateCategory(0);paint(initialPhase,bestIndex,0);
  setRunning(running);
  return {
    setRunning,
    holdPeriod(index){manualIndex=index;paint(index/Math.max(1,series.length-1),index,elapsed);},
    releasePeriod(){if(manualIndex!==null){elapsed=((manualIndex/Math.max(1,series.length-1)-initialPhase+1)%1)*duration;manualIndex=null;previousTime=0;}},
    destroy(){destroyed=true;enabled=false;cancelAnimationFrame(frame);guide.remove();reading.remove();orbit?.remove();categoryRows.forEach(el=>el.classList.remove('is-live-category'));},
  };
}
