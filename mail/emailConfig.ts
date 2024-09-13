import nodemailer from 'nodemailer'
import dotenv from 'dotenv'

dotenv.config()

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false, // Usar TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
})

export const enviarEmail = async (para: string, assunto: string, corpo: string) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: para,
      subject: assunto,
      html: corpo,
    });
    console.log('E-mail enviado com sucesso');
  } catch (erro) {
    console.error('Erro ao enviar e-mail:', erro);
    throw erro;
  }
}

export default transporter