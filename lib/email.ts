// Shared frame for Ticher's emails. Tables and inline styles only: Gmail and Outlook ignore <style>
// blocks and most modern CSS. Email clients don't render SVG, so the logo is public/email-logo.png.
const LOGO = "https://www.ticher.pro/email-logo.png"

// Student-written text (exam names) goes into HTML, so it must be escaped.
export const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")

export const emailLayout = ({ title, preheader, body }: { title: string; preheader: string; body: string }) => `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f5f5f4">
<div style="display:none;max-height:0;overflow:hidden">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4">
  <tr><td align="center" style="padding:40px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0a0a0a">
      <tr><td style="padding:0 4px 20px">
        <img src="${LOGO}" width="32" height="32" alt="" style="vertical-align:middle;border:0;border-radius:8px">
        <span style="vertical-align:middle;margin-left:8px;font-size:20px;font-weight:600;letter-spacing:0.05em"><span style="color:#ffa247">T</span>icher</span>
      </td></tr>
      <tr><td style="background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;padding:36px 32px">
        ${body}
      </td></tr>
      <tr><td style="padding:20px 4px 0;text-align:center;font-size:12px;line-height:1.6;color:#a8a29e">
        Correo automático de <a href="https://www.ticher.pro" style="color:#a8a29e">ticher.pro</a>, no lo respondas.
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`

// Primary call to action, in Ticher's orange.
export const emailButton = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:#ffa247;color:#3b1d06;text-decoration:none;font-weight:600;font-size:15px;padding:12px 20px;border-radius:10px">${label}</a>`
