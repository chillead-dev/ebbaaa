const API = {
  async call(m, body, token){
    const res = await fetch(`/api?m=${encodeURIComponent(m)}`, {
      method: "POST",
      headers: {"Content-Type":"application/json", ...(token?{"Authorization":`Bearer ${token}`}:{})},
      body: JSON.stringify(body || {})
    });
    let data=null; try{ data=await res.json(); }catch{ data=null; }
    if(!res.ok){
      const err=(data&&typeof data==="object")?data:{error:"request_failed"};
      err.status=res.status;
      throw err;
    }
    return data;
  },

  // auth
  requestCode(email){ return this.call("auth_request_code",{email}); },
  signup(email,password,code){ return this.call("auth_signup",{email,password,code}); },
  login(email,password){ return this.call("auth_login",{email,password}); },

  // profile
  profileGet(token){ return this.call("profile_get",{},token); },
  profileUpdate(token,patch){ return this.call("profile_update",patch,token); },
  userGet(token,username){ return this.call("user_get",{username},token); },

  // presence
  presencePing(token){ return this.call("presence_ping",{},token); },

  // users
  usersSearch(token,q){ return this.call("users_search",{q},token); },

  // chats/messages
  chatsList(token){ return this.call("chats_list",{},token); },
  chatsStartDm(token,username){ return this.call("chats_start_dm",{username},token); },
chatsDelete(token,chat_id,for_all=0){ return this.call("chats_delete",{chat_id,for_all},token); },
  messagesClear(token,chat_id,for_all=0){ return this.call("messages_clear",{chat_id,for_all},token); },
  messagesDelete(token,chat_id,msg_id){ return this.call("messages_delete",{chat_id,msg_id},token); },
  messagesList(token,chat_id){ return this.call("messages_list",{chat_id},token); },
  messagesSend(token,chat_id,text){ return this.call("messages_send",{chat_id,text},token); },
  messagesMarkRead(token,chat_id){ return this.call("messages_mark_read",{chat_id},token); },

  // pinned
  pinGet(token,chat_id){ return this.call("pin_get",{chat_id},token); },
  pinSet(token,chat_id,pinned){ return this.call("pin_set",{chat_id,pinned},token); },
  pinClear(token,chat_id){ return this.call("pin_clear",{chat_id},token); },

  // feed
  postsCreate(token,text){ return this.call("posts_create",{text},token); },
  postsList(token){ return this.call("posts_list",{},token); },
  postsLike(token,post_id){ return this.call("posts_like",{post_id},token); },
};
export default API;
