export const $=(id)=>document.getElementById(id);
export const qsa=(sel,root=document)=>[...root.querySelectorAll(sel)];
export function esc(s){return String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}
