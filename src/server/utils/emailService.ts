import nodemailer from 'nodemailer';

function getEmailHtml(resetUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperação de Senha - XLS Fusion</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F0F2F5; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F0F2F5; padding: 40px 10px;">
    <tr>
      <td align="center">
        <!--[if mso]>
        <table align="center" border="0" cellspacing="0" cellpadding="0" width="500">
        <tr>
        <td align="center" valign="top" width="500">
        <![endif]-->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; background-color: #ffffff; border-radius: 24px; border: 1px solid #E2E8F0; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">
          <!-- Logo -->
          <tr>
            <td align="left" style="padding-bottom: 24px;">
              <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 20px; font-weight: 900; color: #0F172A; letter-spacing: -0.02em;">
                XLS <span style="color: #6366F1;">FUSION</span>
              </span>
            </td>
          </tr>
          
          <!-- Title -->
          <tr>
            <td align="left">
              <h1 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 24px; font-weight: 800; color: #0F172A; margin: 0 0 16px 0; line-height: 1.2;">
                Recuperação de Senha
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td align="left">
              <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 24px 0;">
                Olá,
              </p>
              <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 24px 0;">
                Você solicitou a recuperação de senha da sua conta no <strong>XLS Fusion</strong>. Clique no botão abaixo para redefinir sua senha:
              </p>
            </td>
          </tr>
          
          <!-- Button -->
          <tr>
            <td align="center" style="padding: 8px 0 24px 0;">
              <a href="${resetUrl}" target="_blank" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; display: inline-block; background-color: #0F172A; color: #ffffff !important; font-weight: 700; text-transform: uppercase; font-size: 13px; letter-spacing: 0.15em; text-decoration: none; padding: 16px 32px; border-radius: 24px; text-align: center; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);">
                Redefinir Senha
              </a>
            </td>
          </tr>
          
          <!-- Warning & Alternative Link -->
          <tr>
            <td align="left">
              <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; color: #64748B; line-height: 1.5; margin: 0 0 12px 0;">
                Este link é válido por <strong>1 hora</strong>. Se você não solicitou essa alteração, por favor desconsidere este e-mail.
              </p>
              <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; color: #94A3B8; line-height: 1.5; margin: 0;">
                Caso o botão não funcione, copie e cole o endereço abaixo no seu navegador:
              </p>
              <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 11px; line-height: 1.5; margin: 8px 0 0 0; word-break: break-all;">
                <a href="${resetUrl}" style="color: #6366F1; text-decoration: underline;">${resetUrl}</a>
              </p>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 24px 0 12px 0;">
              <hr style="border: 0; border-top: 1px solid #F1F5F9; margin: 0;">
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center">
              <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 11px; color: #94A3B8; line-height: 1.5; margin: 0;">
                Este é um e-mail automático enviado pelo XLS Fusion.<br>
                Por favor, não responda a esta mensagem.
              </p>
            </td>
          </tr>
        </table>
        <!--[if mso]>
        </td>
        </tr>
        </table>
        <![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendResetEmail(email: string, token: string) {
  const resetUrl = `http://localhost:5173/#reset-password?token=${token}`;
  
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || 'no-reply@xlsfusion.com';

  const htmlContent = getEmailHtml(resetUrl);
  const textContent = `Olá!\n\nVocê solicitou a recuperação de senha da sua conta no XLS Fusion.\n\nClique no link a seguir ou copie e cole no seu navegador para redefinir sua senha:\n\n${resetUrl}\n\nEste link expira em 1 hora.\n\nSe você não solicitou essa alteração, por favor desconsidere este e-mail.\n`;

  if (host && user && pass) {
    console.log(`\n======================================================`);
    console.log(`📬 [SMTP CUSTOM]`);
    console.log(`Para: ${email}`);
    console.log(`Link: ${resetUrl}`);
    console.log(`======================================================\n`);
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });

      await transporter.sendMail({
        from,
        to: email,
        subject: 'Recuperação de Senha - XLS Fusion',
        text: textContent,
        html: htmlContent,
      });
      console.log(`✅ E-mail enviado com sucesso via SMTP para ${email}`);
      return { sent: true, method: 'SMTP', resetUrl };
    } catch (err: any) {
      console.error(`❌ Falha ao enviar e-mail via SMTP: ${err.message}`);
      return { sent: false, method: 'SMTP', error: err.message, resetUrl };
    }
  }

  // Fallback: Ethereal (Serviço SMTP Grátis do Nodemailer para Testes)
  try {
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    const info = await transporter.sendMail({
      from: '"XLS Fusion" <no-reply@xlsfusion.com>',
      to: email,
      subject: 'Recuperação de Senha - XLS Fusion',
      text: textContent,
      html: htmlContent,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`\n======================================================`);
    console.log(`📬 [SMTP GRATUITO - ETHEREAL]`);
    console.log(`Para: ${email}`);
    console.log(`Link de Redefinição: ${resetUrl}`);
    console.log(`Visualizar E-mail Real Enviado (Inbox): ${previewUrl}`);
    console.log(`======================================================\n`);

    return { sent: true, method: 'Ethereal', resetUrl, previewUrl };
  } catch (err: any) {
    console.warn(`⚠️ Falha ao iniciar SMTP Grátis Ethereal: ${err.message}`);
    // Fallback do simulador clássico de console
    console.log(`\n======================================================`);
    console.log(`📬 [EMAIL SIMULATOR]`);
    console.log(`Para: ${email}`);
    console.log(`Link: ${resetUrl}`);
    console.log(`======================================================\n`);
    return { sent: true, method: 'console', resetUrl };
  }
}

