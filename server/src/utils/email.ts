import nodemailer from 'nodemailer';
import { env } from '../config/env';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!env.emailUser || !env.emailAppPassword) return null;
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: env.emailUser, pass: env.emailAppPassword },
  });
  return transporter;
}

export async function sendInvitationEmail(input: {
  to: string;
  workspaceName: string;
  role: string;
  inviterName: string;
  inviteLink: string;
}) {
  const client = getTransporter();
  if (!client) {
    console.warn('[email] EMAIL_USER/EMAIL_APP_PASSWORD not set — skipping email send');
    return { sent: false };
  }

  const html = `
  <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #111827;">
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 24px;">
      <span style="font-size: 20px; font-weight: 700; color: #5B5FEF;">OrbitPM</span>
    </div>
    <h2 style="font-size: 18px; margin: 0 0 12px;">You've been invited to a workspace</h2>
    <p style="font-size: 14px; color: #4B5563; line-height: 1.5;">
      <strong>${input.inviterName}</strong> invited you to join
      <strong>${input.workspaceName}</strong> on OrbitPM as a
      <strong style="text-transform: capitalize;">${input.role}</strong>.
    </p>
    <a href="${input.inviteLink}"
       style="display: inline-block; margin-top: 20px; background: #5B5FEF; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600;">
      Accept invitation
    </a>
    <p style="font-size: 12px; color: #9CA3AF; margin-top: 24px;">
      If you weren't expecting this, you can safely ignore this email. This invitation expires in 7 days.
    </p>
  </div>`;

  try {
    await client.sendMail({
      from: `"OrbitPM" <${env.emailUser}>`,
      to: input.to,
      subject: `${input.inviterName} invited you to join ${input.workspaceName} on OrbitPM`,
      html,
    });
    return { sent: true };
  } catch (err) {
    console.error('[email] Failed to send invitation email:', err);
    return { sent: false };
  }
}
