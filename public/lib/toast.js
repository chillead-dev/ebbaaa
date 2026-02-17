import { $ } from "./dom.js";
let t=null;
export function toast(msg){
  const host=$("toastHost"); if(!host) return;
  if(t) t.remove();
  t=document.createElement("div"); t.className="toast"; t.textContent=msg; host.appendChild(t);
  requestAnimationFrame(()=>t.classList.add("show"));
  setTimeout(()=>{ if(!t) return; t.classList.remove("show"); setTimeout(()=>{t?.remove(); t=null;},220); },1600);
}
