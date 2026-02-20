import { esc } from "../lib/dom.js";

export function openSheet(actions=[]){
  const scrim = document.createElement("div");
  scrim.className = "scrim";
  scrim.innerHTML = `
    <div class="actionSheet" role="dialog" aria-modal="true">
      <div class="sheetBlock" id="sheetBlock"></div>
      <button class="sheetCancel" id="sheetCancel" type="button">Отмена</button>
    </div>`;
  document.body.appendChild(scrim);

  const block = scrim.querySelector("#sheetBlock");
  for(const a of actions){
    const btn = document.createElement("button");
    btn.className = "sheetBtn" + (a.danger ? " danger" : "");
    btn.type = "button";
    btn.textContent = a.label;
    btn.onclick = async () => {
      close();
      try{ await a.onClick?.(); }catch{}
    };
    block.appendChild(btn);
  }

  function close(){ scrim.remove(); }
  scrim.querySelector("#sheetCancel").onclick = close;
  scrim.onclick = (e)=>{ if(e.target===scrim) close(); };
}
