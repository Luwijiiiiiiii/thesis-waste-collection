import { createTransport, type SendMailOptions } from "nodemailer";
import {
  MAILER_EMAIL,
  MAILER_FROM_NAME,
  MAILER_PASSWORD,
  MAILER_TRANSPORT_HOST,
  MAILER_TRANSPORT_PORT,
  MAILER_TRANSPORT_SECURE,
} from "../config.js";

export async function sendEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}): Promise<string> {
  const transporter = createTransport({
    host: MAILER_TRANSPORT_HOST,
    port: MAILER_TRANSPORT_PORT,
    secure: MAILER_TRANSPORT_SECURE,
    auth: {
      user: MAILER_EMAIL,
      pass: MAILER_PASSWORD,
    },
  });

  const mailOptions: SendMailOptions = {
    from: `${MAILER_FROM_NAME} <${MAILER_EMAIL}>`,
    to,
    subject,
  };

  if (text) {
    mailOptions.text = text;
  }

  if (html) {
    mailOptions.html = html;
  }

  await transporter.sendMail(mailOptions);
  return "Email sent successfully";
}
