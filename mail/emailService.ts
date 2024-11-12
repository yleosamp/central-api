import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

dotenv.config();

// Configuração do provedor de email atual
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'nodemailer'; // 'nodemailer' ou 'sendgrid'

// Configuração do SendGrid
if (EMAIL_PROVIDER === 'sendgrid') {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');
}

// Configuração do Nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false
  }
});

export const enviarEmail = async (para: string, assunto: string, corpo: string) => {
  try {
    if (EMAIL_PROVIDER === 'sendgrid') {
      const msg = {
        to: para,
        from: process.env.EMAIL_FROM || '',
        subject: assunto,
        html: corpo,
      };
      await sgMail.send(msg);
    } else {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: para,
        subject: assunto,
        html: corpo,
      });
    }
    console.log('E-mail enviado com sucesso');
  } catch (erro) {
    console.error('Erro ao enviar e-mail:', erro);
    throw erro;
  }
}

export default enviarEmail;