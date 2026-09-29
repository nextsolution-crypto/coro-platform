export const PLATFORM_MFA_EMAIL_SENDER = {
  name: 'CORO',
  email: 'info@getcoro.io',
} as const;

export function renderPlatformMfaEmail(code: string): string {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;">
      <div style="background:#2C3E50;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
        <span style="color:#FFFFFF;font-size:28px;font-weight:900;">CO<span style="color:#C0392B;">RO</span></span>
      </div>
      <div style="background:#FFFFFF;padding:32px;border:1px solid #E9ECEF;border-radius:0 0 8px 8px;text-align:center;">
        <p style="margin:0 0 8px;font-size:16px;color:#2C3E50;">Votre code de connexion</p>
        <div style="margin:24px 0;padding:20px;background:#F8F9FA;border-radius:8px;border:2px dashed #C0392B;">
          <span style="font-size:40px;font-weight:900;letter-spacing:12px;color:#C0392B;">${code}</span>
        </div>
        <p style="margin:0;font-size:13px;color:#6C757D;">Ce code est valide pendant <strong>10 minutes</strong>.</p>
        <p style="margin:8px 0 0;font-size:13px;color:#ADB5BD;">Si vous n'avez pas demandé ce code, ignorez ce courriel.</p>
      </div>
    </div>
  `;
}
