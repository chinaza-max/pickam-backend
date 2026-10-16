import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS, // Gmail App Password (16-char)
      },
    });
  }

  async sendOtpEmail(to: string, otp: string, purpose: string): Promise<void> {
    const purposeLabel =
      purpose === 'PASSWORD_RESET' ? 'Password Reset' : 'Email Verification';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Pickam OTP</title>
        </head>
        <body style="margin:0;padding:0;background-color:#0f0f1a;font-family:'Segoe UI',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f1a;padding:40px 20px;">
            <tr>
              <td align="center">
                <table width="480" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
                  <!-- Header -->
                  <tr>
                    <td style="background:linear-gradient(135deg,#6c63ff 0%,#3ecfcf 100%);padding:32px 40px;text-align:center;">
                      <h1 style="margin:0;color:#fff;font-size:28px;font-weight:700;letter-spacing:2px;">PICKAM</h1>
                      <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;letter-spacing:1px;">LOGISTICS PLATFORM</p>
                    </td>
                  </tr>
                  <!-- Body -->
                  <tr>
                    <td style="padding:40px 40px 32px;">
                      <p style="color:#a0aec0;font-size:15px;margin:0 0 8px;">Hi there 👋</p>
                      <h2 style="color:#e2e8f0;font-size:22px;font-weight:600;margin:0 0 20px;">${purposeLabel}</h2>
                      <p style="color:#a0aec0;font-size:14px;line-height:1.6;margin:0 0 32px;">
                        Use the one-time code below to complete your ${purposeLabel.toLowerCase()}. 
                        This code expires in <strong style="color:#e2e8f0;">10 minutes</strong>.
                      </p>
                      <!-- OTP Box -->
                      <div style="background:rgba(108,99,255,0.12);border:2px solid rgba(108,99,255,0.4);border-radius:12px;padding:24px;text-align:center;margin:0 0 32px;">
                        <p style="margin:0 0 8px;color:#a0aec0;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Your OTP Code</p>
                        <span style="font-size:44px;font-weight:800;color:#6c63ff;letter-spacing:12px;display:block;">${otp}</span>
                      </div>
                      <p style="color:#718096;font-size:13px;line-height:1.6;margin:0;">
                        If you did not request this, please ignore this email. Your account remains secure.
                      </p>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="padding:20px 40px 32px;border-top:1px solid rgba(255,255,255,0.06);">
                      <p style="color:#4a5568;font-size:12px;text-align:center;margin:0;">
                        © ${new Date().getFullYear()} Pickam Logistics. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from: `"Pickam" <${process.env.SMTP_USER}>`,
        to,
        subject: `Your Pickam ${purposeLabel} Code: ${otp}`,
        html,
      });
      this.logger.log(`OTP email sent to ${to} for purpose: ${purpose}`);
    } catch (err) {
      this.logger.error(`Failed to send OTP email to ${to}: ${err.message}`);
      throw err;
    }
  }
}
