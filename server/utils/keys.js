export const K={
  user:(uid)=>`user:${uid}`,
  userByEmail:(email)=>`userByEmail:${email}`,
  userByUsername:(u)=>`userByUsername:${u}`,
  code:(email)=>`code:${email}`,

  chat:(id)=>`chat:${id}`,
  chatMsgs:(id)=>`chat:${id}:msgs`,
  chatLast:(id)=>`chat:${id}:last`,
  pinned:(id)=>`chat:${id}:pinned`,

  userChats:(uid)=>`u:${uid}:chats`,
  unread:(uid,chatId)=>`u:${uid}:unread:${chatId}`,

  presence:(uid)=>`presence:${uid}`,

  post:(id)=>`post:${id}`,
  postLikes:(id)=>`post:${id}:likes`,
};
