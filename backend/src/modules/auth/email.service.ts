import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger('EmailService');
  private readonly resend = new Resend(process.env.RESEND_API_KEY);
  private readonly from = process.env.EMAIL_FROM ?? 'LaptopHub <onboarding@resend.dev>';

  async sendPasswordReset(to: string, resetLink: string) {
    try {
      await this.resend.emails.send({
        from: this.from,
        to,
        subject: 'LaptopHub — Password Reset',
        text:
          `Aapne password reset ki request ki hai.\n\n` +
          `Is link se naya password set karein (30 minute mein expire ho jayega):\n` +
          `${resetLink}\n\n` +
          `Agar aapne ye request nahi ki, to is email ko ignore karein.`,
      });
      this.logger.log(`Password reset email bheja: ${to}`);
    } catch (e) {
      // Email fail ho to bhi endpoint same response de (enumeration se bachne ke liye)
      this.logger.error(`Email bhejne mein masla: ${(e as any).message}`);
    }
  }
}