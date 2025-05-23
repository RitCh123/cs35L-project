const nodemailer = require('nodemailer');

// Create a transporter using Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Add debug logging
console.log('Email configuration:', {
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASSWORD ? 'Password is set' : 'Password is missing'
});

// Function to send notification email
const sendQueueNotification = async (userEmail, userName, queueType) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject: 'Your Gaming Lounge Reservation is Almost Ready!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4a5568;">Hello ${userName},</h2>
          <p style="color: #2d3748; font-size: 16px;">
            Your ${queueType} reservation at the Gaming Lounge is about to be ready!
          </p>
          <p style="color: #2d3748; font-size: 16px;">
            Please make your way to the Gaming Lounge within the next 5 minutes to claim your spot.
          </p>
          <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #4a5568; margin: 0;">
              <strong>Queue Type:</strong> ${queueType}<br>
              <strong>Status:</strong> Ready Soon
            </p>
          </div>
          <p style="color: #718096; font-size: 14px;">
            If you cannot make it, please cancel your reservation to allow others to take your spot.
          </p>
          <p style="color: #718096; font-size: 14px;">
            Best regards,<br>
            Gaming Lounge Team
          </p>
        </div>
      `
    };

    console.log('Attempting to send email to:', userEmail);
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.response);
    return true;
  } catch (error) {
    console.error('Detailed error sending email:', error);
    return false;
  }
};

module.exports = {
  sendQueueNotification
}; 