export function codeEmailHtml(code){return `
<div style="font-family:-apple-system,Segoe UI,Roboto,Arial;padding:24px;background:#f6f7f9;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:20px;border:1px solid rgba(0,0,0,.08);">
    <div style="font-weight:800;font-size:18px;">Exuberant</div>
    <div style="color:#666;margin-top:6px;">Код подтверждения</div>
    <div style="margin-top:16px;font-size:34px;letter-spacing:6px;font-weight:900;">${code}</div>
    <div style="color:#666;margin-top:12px;font-size:13px;line-height:1.4;">Если это были не вы — игнорируйте письмо. Код действует 10 минут.</div>
    <div style="margin-top:18px;color:#999;font-size:12px;">auth@exuberant.pw</div>
  </div>
</div>`;}