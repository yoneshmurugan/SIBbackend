import nodemailer from 'nodemailer'

if (!process.env.GMAIL || !process.env.APP_PASSWORD) {
  throw new Error('GMAIL and APP_PASSWORD environment variables must be set');
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL,
    pass: process.env.APP_PASSWORD
  }
});

export default transporter