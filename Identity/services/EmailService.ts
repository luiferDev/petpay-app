import { autoInjectable, inject } from 'tsyringe'
import { IEmailService } from '../interfaces/IEmailService'
import { TOKENS } from '../lib/tokens'

export interface IEmailTransport {
  send(template: string, to: string, subject: string, locals?: Record<string, any>): Promise<any>
}

@autoInjectable()
export class EmailService implements IEmailService {
  constructor(@inject(TOKENS.Transport) private readonly transport: IEmailTransport) { }

  async sendVerificationEmail(email: string, firstName: string, verificationLink: string): Promise<void> {
    await this.transport.send('verificationEmail', email, 'Verificación de Correo Electrónico', { firstName, verificationLink })
  }
}