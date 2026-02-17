import API from "../api.js";
import { $, esc } from "../lib/dom.js";
import { store } from "../store.js";
import { toast } from "../lib/toast.js";
import { errorText } from "../lib/errors.js";

function avatarHtml(u){
  if(u?.avatar_url) return `<img src="${esc(u.avatar_url)}" alt="">`;
  const ch=(u?.display_name||u?.username||"U").trim().slice(0,1).toUpperCase();
  return `<div class="ph">${esc(ch)}</div>`;
}

export async function renderFeed(){
  const v=$("view-feed");
  v.innerHTML=`<div class="feedBox"><div class="feedComposer"><div style="font-weight:1000">Создать пост</div><textarea id="postText" class="textarea" placeholder="Что нового?"></textarea><button id="btnPost" class="btn primary" type="button">Опубликовать</button></div></div><div id="feedList"></div>`;
  $("btnPost").onclick=async()=>{
    const text=$("postText").value.trim();
    if(!text) return;
    $("postText").value="";
    try{ await API.postsCreate(store.token,text); toast("Опубликовано ✅"); await loadFeed(); }catch(e){ toast(errorText(e)); }
  };
  await loadFeed();
}

export async function loadFeed(){
  const data=await API.postsList(store.token);
  const list=document.getElementById("feedList"); list.innerHTML="";
  for(const p of data.posts){
    const item=document.createElement("div");
    item.className="feedItem";
    item.innerHTML=`<div class="feedTop"><div class="avatar" style="width:42px;height:42px">${avatarHtml(p.author)}</div><div><div class="feedName">${esc(p.author.display_name||p.author.username)}</div><div class="feedMeta">@${esc(p.author.username)} · ${new Date(p.ts).toLocaleString()}</div></div></div><div class="feedText">${esc(p.text)}</div><div class="likeRow"><button class="likeBtn ${p.liked?"on":""}" data-like="${esc(p.id)}" type="button">❤️ ${p.likes}</button></div>`;
    list.appendChild(item);
  }
  list.querySelectorAll("[data-like]").forEach(btn=>btn.onclick=async()=>{
    try{ await API.postsLike(store.token,btn.getAttribute("data-like")); await loadFeed(); }catch(e){ toast(errorText(e)); }
  });
}
