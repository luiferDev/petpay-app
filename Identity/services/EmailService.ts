import { IEmailService } from '../interfaces/IEmailService'
import { sendVerificationEmail } from '../utils/nodemailer'

export class EmailService implements IEmailService {
  async sendVerificationEmail(email: string, firstName: string, verificationLink: string): Promise<void> {
    await sendVerificationEmail(email, firstName, verificationLink)
  }
}