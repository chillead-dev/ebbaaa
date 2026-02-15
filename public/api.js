const API = {
  async _req(path, body, token) {
    const res = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      },
      body: JSON.stringify(body || {})
    });

    let data = null;
    try { data = await res.json(); } catch { data = null; }

    if (!res.ok) {
      const err = (data && typeof data === "object") ? data : { error: "request_failed" };
      err.status = res.status;
      throw err;
    }
    return data;
  },

  requestCode(email){ return this._req("/api/auth_request_code", { email }); },
  signup(email,password,code,username){ return this._req("/api/auth_signup", { email,password,code,username }); },
  login(email,password){ return this._req("/api/auth_login", { email,password }); },
  me(token){ return this._req("/api/me", {}, token); },

  chatsList(token){ return this._req("/api/chats_list", {}, token); },
  messagesList(token, chat_id){ return this._req("/api/messages_list", { chat_id }, token); },
  messagesSend(token, chat_id, text){ return this._req("/api/messages_send", { chat_id, text }, token); }
};

export default API;
