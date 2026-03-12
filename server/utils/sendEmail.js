// No need to require 'nodemailer' anymore!

const sendEmail = async (options) => {
  try {
    // 1. Send an HTTPS POST request to Brevo's REST API
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY, // Your new Brevo API Key
        'content-type': 'application/json'
      },
      // 2. Define Email Options (Mapped to Brevo's format)
      body: JSON.stringify({
        sender: {
          name: 'Mitrrio Game Support',
          email: process.env.EMAIL_USER // The email you verified on Brevo
        },
        to: [{ email: options.email }],
        subject: options.subject,
        htmlContent: options.message
      })
    });

    // 3. Handle any errors from Brevo
    if (!response.ok) {
      const errorData = await response.json();
      console.error("[Brevo] API Error Details:", errorData);
      throw new Error("Brevo API rejected the email");
    }

    console.log(`[Brevo] Email sent successfully to: ${options.email}`);
    return await response.json();

  } catch (error) {
    console.error("[Brevo] Network/Sending Error:", error);
    throw new Error("Failed to send email");
  }
};

module.exports = sendEmail;