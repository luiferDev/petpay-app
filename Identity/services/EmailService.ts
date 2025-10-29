import { IEmailService } from '../interfaces/IEmailService'

export interface IEmailTransport {
  send(template: string, to: string, subject: string, locals?: Record<string, any>): Promise<any>
}

export class EmailService implements IEmailService {
  constructor(private readonly transport: IEmailTransport) { }

  async sendVerificationEmail(email: string, firstName: string, verificationLink: string): Promise<void> {
    await this.transport.send('verificationEmail', email, 'Verificación de Correo Electrónico', { firstName, verificationLink })
  }
}