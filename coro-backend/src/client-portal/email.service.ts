import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailService {

  private async getApi() {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const brevo = require('@getbrevo/brevo');
    const apiKey = brevo.ApiClient.instance.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY || '';
    return new brevo.TransactionalEmailsApi();
  }

  async sendClientInvitation(data: {
    toEmail: string;
    toName: string;
    clientName: string;
    temporaryPassword: string;
    organizationName: string;
  }) {
    try {
      const api = await this.getApi();
      const brevo = require('@getbrevo/brevo');
      const email = new brevo.SendSmtpEmail();

      email.sender = { name: 'CORO — Portail Client', email: 'info@getcoro.io' };
      email.to = [{ email: data.toEmail, name: data.toName }];
      email.subject = `Votre accès au portail client CORO — ${data.clientName}`;
      email.htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>
  body { font-family: -apple-system, sans-serif; background: #F8F9FA; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 40px auto; background: #FFFFFF; border-radius: 8px; border: 1px solid #E9ECEF; }
  .header { background: #2C3E50; padding: 32px; text-align: center; }
  .logo { font-size: 28px; font-weight: 900; color: #FFFFFF; letter-spacing: -1px; }
  .logo span { color: #C0392B; }
  .body { padding: 40px; }
  .title { font-size: 22px; font-weight: 700; color: #2C3E50; margin-bottom: 16px; }
  .text { font-size: 15px; color: #6C757D; line-height: 1.7; margin-bottom: 16px; }
  .credentials { background: #F8F9FA; border: 1px solid #E9ECEF; border-radius: 8px; padding: 24px; margin: 24px 0; }
  .cred-label { font-size: 12px; font-weight: 600; color: #ADB5BD; text-transform: uppercase; margin-bottom: 4px; }
  .cred-value { font-size: 16px; font-weight: 700; color: #2C3E50; margin-bottom: 16px; font-family: monospace; }
  .btn { display: inline-block; background: #C0392B; color: #FFFFFF; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 700; }
  .footer { background: #F8F9FA; padding: 24px; text-align: center; font-size: 13px; color: #ADB5BD; border-top: 1px solid #E9ECEF; }
  .warning { background: #FEF9E7; border: 1px solid #FAD7A0; border-radius: 6px; padding: 12px 16px; font-size: 13px; color: #F39C12; margin-top: 16px; }
</style>
</head>
<body>
  <div class="container">
    <div class="header"><div class="logo">CO<span>RO</span></div></div>
    <div class="body">
      <p class="title">Bonjour ${data.toName},</p>
      <p class="text"><strong>${data.organizationName}</strong> vous a créé un accès au portail client CORO pour <strong>${data.clientName}</strong>.</p>
      <div class="credentials">
        <p class="cred-label">Portail</p><p class="cred-value">client.getcoro.io</p>
        <p class="cred-label">Courriel</p><p class="cred-value">${data.toEmail}</p>
        <p class="cred-label">Mot de passe temporaire</p><p class="cred-value">${data.temporaryPassword}</p>
      </div>
      <a href="https://client.getcoro.io" class="btn">Accéder au portail →</a>
      <div class="warning">⚠️ Changez votre mot de passe lors de votre première connexion.</div>
    </div>
    <div class="footer">© 2026 CORO — <a href="https://getcoro.io" style="color:#ADB5BD;">getcoro.io</a></div>
  </div>
</body>
</html>`;

      await api.sendTransacEmail(email);
      return { success: true };
    } catch (err) {
      console.error('Erreur envoi email Brevo:', err);
      return { success: false };
    }
  }

  async sendDocumentAvailable(data: {
    toEmail: string;
    toName: string;
    projectName: string;
    documentType: string;
    clientName: string;
  }) {
    try {
      const api = await this.getApi();
      const brevo = require('@getbrevo/brevo');
      const email = new brevo.SendSmtpEmail();

      email.sender = { name: 'CORO — Portail Client', email: 'info@getcoro.io' };
      email.to = [{ email: data.toEmail, name: data.toName }];
      email.subject = `Nouveau document disponible — ${data.projectName}`;
      email.htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>
  body { font-family: -apple-system, sans-serif; background: #F8F9FA; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 40px auto; background: #FFFFFF; border-radius: 8px; border: 1px solid #E9ECEF; }
  .header { background: #2C3E50; padding: 32px; text-align: center; }
  .logo { font-size: 28px; font-weight: 900; color: #FFFFFF; letter-spacing: -1px; }
  .logo span { color: #C0392B; }
  .body { padding: 40px; }
  .doc-card { background: #EAFAF1; border: 1px solid #A9DFBF; border-radius: 8px; padding: 20px; margin: 24px 0; }
  .btn { display: inline-block; background: #C0392B; color: #FFFFFF; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 700; }
  .footer { background: #F8F9FA; padding: 24px; text-align: center; font-size: 13px; color: #ADB5BD; border-top: 1px solid #E9ECEF; }
</style>
</head>
<body>
  <div class="container">
    <div class="header"><div class="logo">CO<span>RO</span></div></div>
    <div class="body">
      <p style="font-size:22px;font-weight:700;color:#2C3E50;">Nouveau document disponible ✅</p>
      <p style="font-size:15px;color:#6C757D;">Bonjour ${data.toName},</p>
      <p style="font-size:15px;color:#6C757D;">Un document a été approuvé et est disponible dans votre portail.</p>
      <div class="doc-card">
        <p style="font-size:13px;font-weight:700;color:#27AE60;margin:0 0 8px 0;">✓ Document approuvé</p>
        <p style="font-size:16px;font-weight:700;color:#2C3E50;margin:0 0 4px 0;">${data.projectName}</p>
        <p style="font-size:14px;color:#6C757D;margin:0;">${data.documentType} — ${data.clientName}</p>
      </div>
      <a href="https://client.getcoro.io" class="btn">Consulter →</a>
    </div>
    <div class="footer">© 2026 CORO — <a href="https://getcoro.io" style="color:#ADB5BD;">getcoro.io</a></div>
  </div>
</body>
</html>`;

      await api.sendTransacEmail(email);
      return { success: true };
    } catch (err) {
      console.error('Erreur envoi email Brevo:', err);
      return { success: false };
    }
  }
}