const nodemailer = require('nodemailer');

let transporter = null;

let etherealAccount = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    });
  } else {
    // If SMTP is not provided, use Ethereal test account so emails are physically dispatched and viewable
    try {
      if (!etherealAccount) {
        etherealAccount = await nodemailer.createTestAccount();
        console.log(`[EmailService] Created Ethereal test inbox: ${etherealAccount.user}`);
      }
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: etherealAccount.user,
          pass: etherealAccount.pass,
        },
      });
    } catch (err) {
      console.warn('[EmailService] Fallback to simulated delivery:', err.message);
      transporter = {
        sendMail: async (mailOptions) => {
          console.log(`[EmailService] Simulated delivery to: ${mailOptions.to} | Subject: ${mailOptions.subject}`);
          return { messageId: `dev-sim-${Date.now()}`, accepted: [mailOptions.to] };
        },
      };
    }
  }
  return transporter;
}

const FROM_HEADER = process.env.EMAIL_FROM || '"FinMan Assistant" <no-reply@finman.app>';

function getTransporterMode() {
  const hasHost = Boolean(process.env.SMTP_HOST);
  const hasUser = Boolean(process.env.SMTP_USER);
  const hasPass = Boolean(process.env.SMTP_PASS);

  if (hasHost && hasUser && hasPass) {
    return {
      isLive: true,
      mode: 'SMTP_CONFIGURED',
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      from: FROM_HEADER,
    };
  }

  const missing = [];
  if (!hasHost) missing.push('SMTP_HOST');
  if (!hasUser) missing.push('SMTP_USER');
  if (!hasPass) missing.push('SMTP_PASS');

  return {
    isLive: false,
    mode: 'SIMULATED_DEV',
    from: FROM_HEADER,
    missingVars: missing,
  };
}

/**
 * Send daily expense reminder email to user.
 */
async function sendDailyExpenseReminder({ email, name, reminderTime }) {
  if (!email) return;
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const transport = await getTransporter();

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; rounded: 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #0284c7; margin: 0; font-size: 24px; font-weight: 800;">FinMan</h2>
        <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">AI Personal Finance Assistant</p>
      </div>
      <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <h3 style="color: #0f172a; margin-top: 0; font-size: 18px;">Daily Expense Check-in 📝</h3>
        <p style="color: #334155; font-size: 14px; line-height: 1.6;">
          Hi <strong>${name || 'there'}</strong>,
        </p>
        <p style="color: #334155; font-size: 14px; line-height: 1.6;">
          It is time for your scheduled <strong>${reminderTime || 'evening'}</strong> check-in. Recording your purchases today—including small spends under ₹250—keeps your budget discipline sharp and prevents surprise deficits at the end of the month.
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${clientUrl}/expenses" style="background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 28px; font-size: 14px; font-weight: 700; border-radius: 10px; display: inline-block;">
            Record Today's Expenses →
          </a>
        </div>
      </div>
      <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
        You received this notification because Daily Expense Reminders are enabled on your FinMan profile. You can adjust your reminder time or disable this in Settings.
      </p>
    </div>
  `;

  return transport.sendMail({
    from: FROM_HEADER,
    to: email,
    subject: `FinMan — Daily Expense Check-in (${reminderTime || 'Evening'})`,
    html,
  });
}

/**
 * Send secure password reset link.
 */
async function sendPasswordResetEmail({ email, name, resetUrl }) {
  if (!email) return;
  const transport = await getTransporter();

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #0284c7; margin: 0; font-size: 24px; font-weight: 800;">FinMan</h2>
        <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Secure Account Recovery</p>
      </div>
      <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <h3 style="color: #0f172a; margin-top: 0; font-size: 18px;">Reset Your Password 🔒</h3>
        <p style="color: #334155; font-size: 14px; line-height: 1.6;">
          Hi <strong>${name || 'there'}</strong>,
        </p>
        <p style="color: #334155; font-size: 14px; line-height: 1.6;">
          We received a request to reset the password for your FinMan account. Click the button below to choose a new password. This link is valid for <strong>1 hour</strong>.
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${resetUrl}" style="background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 28px; font-size: 14px; font-weight: 700; border-radius: 10px; display: inline-block;">
            Reset Password →
          </a>
        </div>
        <p style="color: #64748b; font-size: 12px; margin: 0;">
          If you did not request a password reset, you can safely disregard this email. Your existing password will remain intact.
        </p>
      </div>
      <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
        FinMan Personal Finance Assistant • Secure Authentication
      </p>
    </div>
  `;

  const recipient = email.toLowerCase().trim();
  const info = await transport.sendMail({
    from: FROM_HEADER,
    to: recipient,
    subject: 'FinMan — Reset Your Password',
    html,
  });

  let previewUrl = null;
  try {
    previewUrl = nodemailer.getTestMessageUrl(info) || null;
  } catch (_) {}

  console.log(`[EmailService] 📧 Password reset dispatched to: ${recipient}`);
  console.log(`[EmailService] 🔑 Reset URL: ${resetUrl}`);
  if (previewUrl) {
    console.log(`[EmailService] 🌐 Preview Email Online: ${previewUrl}`);
  }

  return {
    messageId: info?.messageId || `sent-${Date.now()}`,
    previewUrl,
    resetUrl,
  };
}

module.exports = {
  sendDailyExpenseReminder,
  sendPasswordResetEmail,
  getTransporterMode,
};
