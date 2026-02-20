export function errorText(e){
  const m=e?.error||"Ошибка";
  if(m==="gmail_only") return "Пока только Gmail (@gmail.com).";
  if(m==="too_fast") return "Слишком часто. Подожди немного.";
  if(m==="code_invalid") return "Неверный код.";
  if(m==="code_missing_or_expired") return "Код истёк или не найден.";
  if(m==="email_taken") return "Аккаунт уже существует. Нажми «Вход».";
  if(m==="invalid_credentials") return "Неверная почта или пароль.";
  if(m==="username_not_found") return "Пользователь не найден.";
  if(m==="dm_not_allowed") return "Пользователь запретил личные сообщения.";
  if(m==="unauthorized") return "Сессия устарела. Войди заново.";
  if(m==="username_invalid") return "Неверный username (a-z0-9_ 3–20).";
  if(m==="username_taken") return "Этот username уже занят.";
  if(m==="blocked") return "Аккаунт заблокирован.";
  if(m==="server_error") return "Ошибка сервера. Проверь логи.";
  return m;
}
