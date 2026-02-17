const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // 1. Create Transporter (Using Gmail as example)
  // For dev, you can also use Ethereal.email
  const transporter = nodemailer.createTransport({
    service: 'gmail', // or 'SendGrid', 'Mailgun', etc.
    auth: {
      user: process.env.EMAIL_USER, // Your email
      pass: process.env.EMAIL_PASS  // Your App Password (Not your normal password)
    }
  });

  // 2. Define Email Options
  const mailOptions = {
    from: `"Mitrrio Game Support" <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    html: options.message
  };

  // 3. Send Email
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;