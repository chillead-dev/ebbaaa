import API from "../api.js";
import { toast } from "../lib/toast.js";
import { errorText } from "../lib/errors.js";

function makeOverlay(items){
  const overlay=document.createElement("div");
  overlay.className="modalOverlay";
  overlay.innerHTML = `
    <div class="modal" style="max-width:420px">
      <div class="modalHeader">
        <div class="modalTitle">Меню</div>
        <button class="modalClose" id="cmClose" type="button">✕</button>
      </div>
      <div class="grid" id="cmItems"></div>
    </div>`;
  const box=overlay.querySelector("#cmItems");
  for(const it of items){
    const b=document.createElement("button");
    b.className="btn "+(it.kind||"");
    b.textContent=it.label;
    b.onclick=async()=>{ await it.onClick(); overlay.remove(); };
    box.appendChild(b);
  }
  overlay.addEventListener("click",(e)=>{ if(e.target===overlay) overlay.remove(); });
  overlay.querySelector("#cmClose").onclick=()=>overlay.remove();
  document.body.appendChild(overlay);
}

export function showChatMenu(ev, chat, token){
  // special case: delete message
  if(chat?.action==="delete_message"){
    return makeOverlay([
      {label:"Удалить сообщение", kind:"danger", onClick: async()=>{
        try{
          await API.messagesDelete(token, chat.id, chat.mid);
          toast("Удалено ✅");
        }catch(e){ toast(errorText(e)); }
      }},
      {label:"Отмена", kind:"ghost", onClick: async()=>{}},
    ]);
  }

  makeOverlay([
    {label:"Закрепить последнее", onClick: async()=>{
      try{
        await API.chatPinLast(token, chat.id);
        toast("Закреплено ✅");
      }catch(e){ toast(errorText(e)); }
    }},
    {label:"Открепить", onClick: async()=>{
      try{
        await API.chatUnpin(token, chat.id);
        toast("Откреплено ✅");
      }catch(e){ toast(errorText(e)); }
    }},
    {label:"Очистить у меня", kind:"", onClick: async()=>{
      try{ await API.chatClearMe(token, chat.id); toast("Очищено ✅"); location.reload(); }catch(e){ toast(errorText(e)); }
    }},
    {label:"Очистить у всех", kind:"danger", onClick: async()=>{
      try{ await API.chatClearAll(token, chat.id); toast("Очищено ✅"); location.reload(); }catch(e){ toast(errorText(e)); }
    }},
    {label:"Удалить у меня", kind:"", onClick: async()=>{
      try{ await API.chatDeleteMe(token, chat.id); toast("Удалено ✅"); location.reload(); }catch(e){ toast(errorText(e)); }
    }},
    {label:"Удалить у всех", kind:"danger", onClick: async()=>{
      try{ await API.chatDeleteAll(token, chat.id); toast("Удалено ✅"); location.reload(); }catch(e){ toast(errorText(e)); }
    }},
    {label:"Отмена", kind:"ghost", onClick: async()=>{}},
  ]);
}
