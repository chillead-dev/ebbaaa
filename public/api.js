const API = {
  async call(m, body, token){
    const res = await fetch(`/api?m=${encodeURIComponent(m)}`, {
      method: "POST",
      headers: {"Content-Type":"application/json", ...(token?{"Authorization":`Bearer ${token}`}:{})},
      body: JSON.stringify(body || {})
    });
    let data=null; try{ data=await res.json(); }catch{ data=null; }
    if(!res.ok){ const err=(data&&typeof data==="object")?data:{error:"request_failed"}; err.status=res.status; throw err; }
    return data;
  },
  requestCode(email){ return this.call("auth_request_code",{email}); },
  signup(email,password,code){ return this.call("auth_signup",{email,password,code}); },
  login(email,password){ return this.call("auth_login",{email,password}); },
  profileGet(token){ return this.call("profile_get",{},token); },
  profileUpdate(token,patch){ return this.call("profile_update",patch,token); },
  usersSearch(token,q){ return this.call("users_search",{q},token); },
  chatsList(token){ return this.call("chats_list",{},token); },
  chatsStartDm(token,username){ return this.call("chats_start_dm",{username},token); },
  messagesList(token,chat_id){ return this.call("messages_list",{chat_id},token); },
  messagesSend(token,chat_id,text){ return this.call("messages_send",{chat_id,text},token); },
  messagesMarkRead(token,chat_id){ return this.call("messages_mark_read",{chat_id},token); },
  postsCreate(token,text){ return this.call("posts_create",{text},token); },
  postsList(token){ return this.call("posts_list",{},token); },
  postsLike(token,post_id){ return this.call("posts_like",{post_id},token); },
};
export default API;
