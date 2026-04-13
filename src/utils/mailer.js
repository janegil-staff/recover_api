// src/utils/mailer.js
import { Resend } from 'resend';

// Lazy init so the key is read after dotenv has loaded
let _resend = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

export async function sendResetCode(toEmail, code) {
  await getResend().emails.send({
    from:    process.env.SMTP_FROM ?? 'Recover <onboarding@resend.dev>',
    to:      toEmail,
    subject: 'Your Recover PIN reset code',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
        <h2 style="color:#2d4a6e">Recover — PIN Reset</h2>
        <p>Use the code below to reset your PIN. It expires in <strong>15 minutes</strong>.</p>
        <div style="font-size:36px;font-weight:800;letter-spacing:8px;color:#4a7ab5;margin:24px 0;text-align:center">
          ${code}
        </div>
        <p style="color:#888;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#aaa;font-size:11px">Qup DA · support@qupda.com</p>
      </div>
    `,
  });
}