export const K = {
  // user
  user: (id) => `u:${id}`,                 // hash/json
  userByEmail: (email) => `ue:${email}`,   // string -> userId
  userByUsername: (username) => `un:${username}`, // string -> userId

  // verify code
  code: (email) => `code:${email}`,        // string json {code}

  // posts
  postsZ: `posts:z`,                       // zset score=ts member=postId
  post: (id) => `p:${id}`,                 // string json post

  // chats
  chat: (id) => `c:${id}`,                 // string json chat meta
  chatMsgs: (id) => `c:${id}:m`,           // list of message json (ciphertext inside)
  userChatsZ: (userId) => `uc:${userId}`,  // zset score=lastTs member=chatId

  // presence
  presence: (userId) => `pr:${userId}`     // string lastTs (TTL)
};
