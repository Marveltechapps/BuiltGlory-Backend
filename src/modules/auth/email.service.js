import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import nodemailer from "nodemailer";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { AppError } from "../../shared/errors/AppError.js";

let transporter;

const getTransporter = () => {
  if (transporter) return transporter;
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    throw new AppError(500, "EMAIL_CONFIG_MISSING", "SMTP email configuration is missing.");
  }
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT),
    secure: Number(env.SMTP_PORT) === 465,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS
    }
  });
  return transporter;
};

const smtpConfigSummary = () => ({
  host: env.SMTP_HOST,
  port: Number(env.SMTP_PORT),
  secure: Number(env.SMTP_PORT) === 465,
  authUser: env.SMTP_USER
});

const serializeSendMailInfo = (info = {}) => ({
  messageId: info.messageId,
  response: info.response,
  accepted: info.accepted,
  rejected: info.rejected,
  pending: info.pending,
  envelope: info.envelope
});

const serializeSmtpError = (error) => ({
  name: error.name,
  message: error.message,
  code: error.code,
  command: error.command,
  responseCode: error.responseCode,
  response: error.response
});

const isSmtpAuthFailure = (error) => error.code === "EAUTH"
  || error.responseCode === 534
  || error.responseCode === 535
  || /auth|authentication|credentials|login/i.test(`${error.command || ""} ${error.message || ""} ${error.response || ""}`);

const EMAIL_DEBUG_DIR = join(process.cwd(), "logs");
const EMAIL_DEBUG_HTML_PATH = join(EMAIL_DEBUG_DIR, "email-otp-debug.html");

const renderEmailOtpTemplate = ({ otp }) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>BuiltGlory Email Verification</title>
  </head>
  <body style="margin:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f7fb;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="padding:28px 32px;background:#111827;color:#ffffff;">
                <h1 style="margin:0;font-size:22px;line-height:1.3;">BuiltGlory Email Verification</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Your verification code is:</p>
                <div style="letter-spacing:8px;font-size:36px;font-weight:700;text-align:center;background:#f3f4f6;border-radius:12px;padding:18px 12px;color:#111827;">${otp}</div>
                <p style="margin:20px 0 0;font-size:15px;line-height:1.6;">This code expires in 5 minutes.</p>
                <p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#6b7280;">If you did not request this code, you can safely ignore this email.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

export const sendEmailOtp = async ({ email, otp }) => {
  const from = env.EMAIL_FROM || "support@builtglory.com";
  const message = {
    from,
    to: email,
    subject: "BuiltGlory Email Verification",
    text: `Your verification code is ${otp}.\nThis code expires in 5 minutes.`,
    html: renderEmailOtpTemplate({ otp })
  };

  console.log("MAIL_OPTIONS_DEBUG", message);
  await mkdir(EMAIL_DEBUG_DIR, { recursive: true });
  await writeFile(EMAIL_DEBUG_HTML_PATH, message.html, "utf8");
  console.log("EMAIL_HTML_DEBUG_SAVED", {
    path: EMAIL_DEBUG_HTML_PATH
  });

  logger.info({
    event: "email_otp_sendmail_attempt",
    email,
    from,
    smtp: smtpConfigSummary()
  });
  console.log("EMAIL_SEND_START", {
    email,
    from,
    smtp: smtpConfigSummary()
  });

  try {
    const mailTransporter = getTransporter();
    console.log("EMAIL_SEND_TRANSPORT_READY", {
      email,
      smtp: smtpConfigSummary()
    });
    const info = await mailTransporter.sendMail(message);
    const smtpInfo = serializeSendMailInfo(info);
    logger.info({
      event: "email_otp_sendmail_success",
      email,
      smtp: smtpConfigSummary(),
      smtpResponse: smtpInfo.response,
      smtpInfo
    });
    console.log("EMAIL_SEND_SUCCESS", {
      email,
      smtpResponse: smtpInfo.response,
      smtpInfo
    });

    if (Array.isArray(info.accepted) && info.accepted.length === 0) {
      throw new AppError(502, "EMAIL_DELIVERY_REJECTED", "SMTP server did not accept the OTP email.", [smtpInfo]);
    }

    return info;
  } catch (error) {
    const smtpError = serializeSmtpError(error);
    const level = isSmtpAuthFailure(error) ? "error" : "warn";
    logger[level]({
      event: isSmtpAuthFailure(error) ? "email_otp_smtp_auth_failed" : "email_otp_sendmail_failed",
      email,
      smtp: smtpConfigSummary(),
      smtpResponse: smtpError.response,
      smtpError
    });
    console.error("EMAIL_SEND_FAILED", {
      email,
      smtpResponse: smtpError.response,
      smtpError
    });

    if (error instanceof AppError) throw error;
    throw new AppError(502, "EMAIL_DELIVERY_FAILED", "Failed to send verification email.", [smtpError]);
  }
};
