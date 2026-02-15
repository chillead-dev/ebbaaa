import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function getFrom() {
  const from = String(process.env.MAIL_FROM || "").trim();

  // Валидируем формат: Name <email@domain>
  // (упрощённая проверка, но ловит 99% косяков с кавычками и отсутствующим ">")
  const ok = /^[^<>"]+\s<[^<>@\s]+@[^<>@\s]+\.[^<>@\s]+>$/.test(from);
  if (!ok) {
    throw new Error(
      `MAIL_FROM is invalid. Set it like: Exuberant <auth@exuberant.pw>. Got: ${from}`
    );
  }
  return from;
}

export async function sendVerifyCodeEmail({ to, code }) {
  const brand = process.env.APP_NAME || "Exuberant";
  const from = getFrom();

  const html = `
  <div style="margin:0;padding:0;background:#0b0b0f;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial;">
    <div style="max-width:560px;margin:0 auto;padding:24px;">
      <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.10);border-radius:24px;overflow:hidden;">
        <div style="padding:22px 22px 10px 22px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:40px;height:40px;border-radius:14px;background:linear-gradient(135deg,#7C3AED,#06B6D4);"></div>
            <div>
              <div style="color:#fff;font-size:16px;font-weight:700;letter-spacing:-0.2px">${brand}</div>
              <div style="color:rgba(255,255,255,0.65);font-size:12px">Подтверждение входа</div>
            </div>
          </div>
        </div>

        <div style="padding:8px 22px 20px 22px;">
          <h1 style="margin:10px 0 0 0;color:#fff;font-size:22px;letter-spacing:-0.4px;">
            Код подтверждения
          </h1>
          <p style="margin:10px 0 16px 0;color:rgba(255,255,255,0.75);font-size:14px;line-height:1.5;">
            Введите этот код в ${brand}, чтобы завершить действие. Он действителен 10 минут.
          </p>

          <div style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.10);border-radius:18px;padding:18px;text-align:center;">
            <div style="font-size:34px;letter-spacing:10px;color:#fff;font-weight:800;">${code}</div>
          </div>

          <p style="margin:16px 0 0 0;color:rgba(255,255,255,0.55);font-size:12px;line-height:1.5;">
            Если это были не вы — просто проигнорируйте письмо.
          </p>
        </div>

        <div style="padding:14px 22px;border-top:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.45);font-size:11px;line-height:1.4;">
          © ${new Date().getFullYear()} ${brand}. Это автоматическое письмо, отвечать не нужно.
        </div>
      </div>
    </div>
  </div>`;

  await resend.emails.send({
    from,
    to,
    subject: `Ваш код для ${brand}: ${code}`,
    html
  });
}
