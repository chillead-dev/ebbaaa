export const I18N = {
  ru: {
    advanced: "Дополнительно",
    verified_note: "Этот профиль подтверждён Exuberant",
    login: "Вход",
    signup: "Регистрация",
    email: "Почта",
    password: "Пароль",
    send_code: "Отправить код",
    confirm: "Подтвердить",
    back: "Назад",
    chats: "Чаты",
    feed: "Лента",
    settings: "Настройки",
    profile: "Профиль",
    favorites: "Избранное",
    deleted_ru: "Аккаунт удален",
    deleted_en: "Deleted Account",
    online: "в сети",
    last_seen: "был(а) недавно",
    just_now: "был(а) только что",
    hidden: "скрыто",
    verify: "Верификация",
    security: "Безопасность",
    privacy: "Приватность",
    appearance: "Оформление",
    language: "Язык",
    logout: "Выйти",
  },
  en: {
    advanced: "Advanced",
    verified_note: "This profile has been verified by Exuberant",
    login: "Login",
    signup: "Sign up",
    email: "Email",
    password: "Password",
    send_code: "Send code",
    confirm: "Confirm",
    back: "Back",
    chats: "Chats",
    feed: "Feed",
    settings: "Settings",
    profile: "Profile",
    favorites: "Saved Messages",
    deleted_ru: "Аккаунт удален",
    deleted_en: "Deleted Account",
    online: "online",
    last_seen: "last seen recently",
    just_now: "last seen just now",
    hidden: "hidden",
    verify: "Verification",
    security: "Security",
    privacy: "Privacy",
    appearance: "Appearance",
    language: "Language",
    logout: "Log out",
  }
};

export function detectLang(){
  const saved = localStorage.getItem("ex_lang");
  if(saved==="ru" || saved==="en") return saved;
  const nav = (navigator.language||"en").toLowerCase();
  return nav.startsWith("ru") ? "ru" : "en";
}

export function t(key){
  const lang = detectLang();
  return (I18N[lang] && I18N[lang][key]) || (I18N.en[key]) || key;
}

export function setLang(lang){
  localStorage.setItem("ex_lang", lang);
}
