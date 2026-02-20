import { $ } from "./lib/dom.js";
export function initTheme(){
  const saved=localStorage.getItem("ex_theme")||"dark";
  document.documentElement.setAttribute("data-theme",saved);
  const lab=$("themeToggleLabel"); if(lab) lab.textContent=saved==="dark"?"Тёмная":"Светлая";
  $("themeToggle").onclick=()=>{
    const cur=document.documentElement.getAttribute("data-theme")||"dark";
    const next=cur==="dark"?"light":"dark";
    document.documentElement.setAttribute("data-theme",next);
    localStorage.setItem("ex_theme",next);
    if(lab) lab.textContent=next==="dark"?"Тёмная":"Светлая";
  };
}
