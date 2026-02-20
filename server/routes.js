import * as Auth from "./svc/auth.js";
import * as Profile from "./svc/profile.js";
import * as Users from "./svc/users.js";
import * as Chats from "./svc/chats.js";
import * as Messages from "./svc/messages.js";
import * as Posts from "./svc/posts.js";
import * as Admin from "./svc/admin.js";

export const ROUTES = {
  auth_request_code: Auth.requestCode,
  auth_signup: Auth.signup,
  auth_login: Auth.login,

  profile_get: Profile.getMe,
  profile_update: Profile.updateMe,
  presence_ping: Profile.presencePing,

  users_search: Users.search,
  user_get: Users.getUser,

  chats_list: Chats.list,
  chats_start_dm: Chats.startDm,
  chats_delete: Chats.deleteChat,

  messages_list: Messages.list,
  messages_send: Messages.send,
  messages_mark_read: Messages.markRead,
  messages_clear: Messages.clear,
  messages_delete: Messages.deleteOne,

  pin_get: Messages.pinGet,
  pin_set: Messages.pinSet,
  pin_clear: Messages.pinClear,

  posts_create: Posts.create,
  posts_list: Posts.list,
  posts_like: Posts.likeToggle,
  chat_pin_last: Chats.pinLast,
};
