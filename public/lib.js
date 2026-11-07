export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
export const icon = name => `<svg class="icon" aria-hidden="true"><use href="/assets/icons.svg#${name}"></use></svg>`;
export const today = () => new Date().toISOString().slice(0,10);
export const money = value => {
  const n = BigInt(value ?? 0), positive = n < 0n ? -n : n;
  return `${n < 0n ? '−' : ''}₹${new Intl.NumberFormat('en-IN').format(positive/100n)}.${String(positive%100n).padStart(2,'0')}`;
};
export const compact = value => new Intl.NumberFormat('en-IN',{ style:'currency', currency:'INR', notation:'compact', maximumFractionDigits:2 }).format(Number(value)/100);
export const decimal = minor => { const n=BigInt(minor); return `${n/100n}.${String(n%100n).padStart(2,'0')}`; };
export const dateLabel = value => new Date(value+'T00:00:00Z').toLocaleDateString('en-IN',{timeZone:'UTC',day:'2-digit',month:'short',year:'numeric'});
export const initials = name => name.split(' ').map(s=>s[0]||'').slice(0,2).join('').toUpperCase();
export const preference = matchMedia('(prefers-reduced-motion: reduce)');
export const palette = () => document.documentElement.dataset.theme === 'dark' ? ['#d9e0dc','#acb9b1','#7e9186','#52675b'] : ['#2f5644','#617e6d','#96ab9c','#c3cec6'];
export function applyTheme(theme) {
  document.documentElement.dataset.theme=theme;
  try { localStorage.setItem('finance.theme',theme); } catch {}
}
try { applyTheme(localStorage.getItem('finance.theme') || (matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light')); } catch {}
export class ApiError extends Error { constructor(status,message) { super(message); this.status=status; } }
export async function api(path,{method='GET',body,signal,download=false}={}) {
  const res=await fetch('/api'+path,{method,credentials:'same-origin',signal,headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  if(!res.ok){const error=await res.json().catch(()=>({error:'The server could not complete the request.'}));throw new ApiError(res.status,error.error);}
  if(download)return res.blob();
  return res.status===204?null:res.json();
}
export async function download(path,name) {
  const blob=await api(path,{download:true}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
