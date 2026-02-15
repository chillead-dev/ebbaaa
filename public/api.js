const API = {
  async req(path, { method="GET", body=null, token=null } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null
    });
    const data = await res.json().catch(()=> ({}));
    if (!res.ok) throw data;
    return data;
  },

  requestCode(email) {
    return this.req("/api/auth_request_code", { method:"POST", body:{ email } });
  },
  signup(email, password, code, username) {
    return this.req("/api/auth_signup", { method:"POST", body:{ email, password, code, username } });
  },
  login(email, password) {
    return this.req("/api/auth_login", { method:"POST", body:{ email, password } });
  },

  me(token) {
    return this.req("/api/me", { token });
  },
  meUpdate(token, patch) {
    return this.req("/api/me_update", { method:"PATCH", token, body: patch });
  },

  usersSearch(token, q) {
    return this.req(`/api/users_search?q=${encodeURIComponent(q)}`, { token });
  },

  postsList(token) {
    return this.req("/api/posts_list", { token });
  },
  postsCreate(token, text) {
    return this.req("/api/posts_create", { method:"POST", token, body:{ text } });
  },

  chatsList(token) {
    return this.req("/api/chats_list", { token });
  },

  dmSend(token, toUserId, text) {
    return this.req("/api/dm_send", { method:"POST", token, body:{ toUserId, text } });
  },
  dmList(token, chatId, afterTs=0) {
    return this.req(`/api/dm_list?chatId=${encodeURIComponent(chatId)}&afterTs=${afterTs}`, { token });
  },

  presencePing(token) {
    return this.req("/api/presence_ping", { token });
  }
};

export default API;
