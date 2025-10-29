export interface IEmailService {
  sendVerificationEmail(email: string, firstName: string, verificationLink: string): Promise<void>
}