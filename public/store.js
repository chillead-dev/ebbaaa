export const store={
  token: localStorage.getItem("ex_token")||"",
  me:null,
  chats:[],
  activeTab:"chats",
  activeChatId:null,
  activeChatTitle:"",
  pollTimer:null,
};
export function setToken(t){
  store.token=t||"";
  if(store.token) localStorage.setItem("ex_token",store.token);
  else localStorage.removeItem("ex_token");
}
