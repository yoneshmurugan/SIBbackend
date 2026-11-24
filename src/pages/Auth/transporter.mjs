import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const gmailUser = process.env.GMAIL || 'sibconnect2025@gmail.com';
const gmailPass = process.env.APP_PASSWORD || 'dcklbbynriephmne';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: gmailUser,
    pass: gmailPass
  }
});

export default transporter;
