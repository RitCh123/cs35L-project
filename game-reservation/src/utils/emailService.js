const nodemailer = require('nodemailer');

// Configure Nodemailer transporter using environment variables
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail', // Default to Gmail if not specified
  auth: {
    user: process.env.EMAIL_USER,
    // Use EMAIL_PASSWORD as primary, fallback to EMAIL_PASS
    pass: process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS,
  },
});

// Add debug logging
console.log('Email configuration:', {
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASSWORD ? 'Password is set' : 'Password is missing'
});

async function sendQueueNotification(to, stationName, position) {
  const now = new Date();
  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateString = now.toLocaleDateString();

  let subject;
  let htmlContent;

  if (position === 1) {
    subject = `You're Next at ${stationName}! - Eclipse Gaming`;
    htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>You're Next in Line!</h2>
        <p>Hi there,</p>
        <p>Great news! You've reached the <strong>top of the queue</strong> for <strong>${stationName}</strong> at Eclipse Gaming.</p>
        <p>Please head over to the station. If you're no longer interested or available, please remove yourself from the queue via our app as soon as possible to allow the next person to play.</p>
        <p>Notified at: ${timeString} on ${dateString}</p>
        <p>Thanks,<br/>The Eclipse Gaming Team</p>
      </div>
    `;
  } else {
    subject = `Queue Update for ${stationName} - Eclipse Gaming`;
    htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Queue Position Update</h2>
        <p>Hi there,</p>
        <p>This is an update on your queue status for <strong>${stationName}</strong> at Eclipse Gaming.</p>
        <p>Your current position in the queue is: <strong>#${position}</strong>.</p>
        <p>We'll notify you again when you reach the front of the queue.</p>
        <p>Notified at: ${timeString} on ${dateString}</p>
        <p>Thanks,<br/>The Eclipse Gaming Team</p>
      </div>
    `;
  }

  const mailOptions = {
    from: `"Eclipse Gaming Notifier" <${process.env.EMAIL_USER}>`,
    to: to,
    subject: subject,
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Queue notification email sent to ${to} for ${stationName}, position ${position}.`);
  } catch (error) {
    console.error(`Error sending queue notification email to ${to}:`, error);
    // Depending on requirements, you might want to throw the error
    // or handle it silently so queue operations can continue.
    // For now, logging and not throwing.
  }
}

async function sendWaitlistConfirmationEmail(to, reservationType, reservationName) {
  const now = new Date();
  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateString = now.toLocaleDateString();

  const subject = `Reservation Waitlisted - Eclipse Gaming`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Your Reservation is Waitlisted</h2>
      <p>Hi ${reservationName || 'there'},</p>
      <p>Thank you for your reservation request. Your request for a <strong>${reservationType}</strong> has been added to our waitlist.</p>
      <p>We are currently experiencing high demand, but we'll do our best to get you a spot as soon as possible.</p>
      <p>You will be notified once your reservation becomes active and a spot is assigned to you.</p>
      <p>Reservation placed at: ${timeString} on ${dateString}</p>
      <p>Thanks for your patience,<br/>The Eclipse Gaming Team</p>
    </div>
  `;

  const mailOptions = {
    from: `"Eclipse Gaming Notifier" <${process.env.EMAIL_USER}>`,
    to: to,
    subject: subject,
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Waitlist confirmation email sent to ${to} for ${reservationType}.`);
  } catch (error) {
    console.error(`Error sending waitlist confirmation email to ${to}:`, error);
  }
}

async function sendReservationActiveEmail(to, reservationType, reservationName, assignedDetails) {
  const now = new Date();
  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateString = now.toLocaleDateString();

  let detailsString = '';
  if (reservationType === "PC" && assignedDetails && assignedDetails.length > 0) {
    detailsString = `You have been assigned PC(s): <strong>${assignedDetails.join(', ')}</strong>.`;
  } else if (reservationType === "CONSOLE" && assignedDetails) { // assignedDetails here would be consoleType
    detailsString = `Your reservation for <strong>${assignedDetails}</strong> is now active.`;
  } else {
    detailsString = "Your reservation is now active.";
  }

  const subject = `Your Reservation is Active! - Eclipse Gaming`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Your Reservation is Now Active!</h2>
      <p>Hi ${reservationName || 'there'},</p>
      <p>Great news! Your waitlisted reservation for a <strong>${reservationType}</strong> is now active.</p>
      <p>${detailsString}</p>
      <p>Please head over to claim your spot. Your reservation starts now and will typically last for ${process.env.RESERVATION_DURATION_HOURS || 1} hour(s).</p>
      <p>Activated at: ${timeString} on ${dateString}</p>
      <p>Enjoy your gaming session!<br/>The Eclipse Gaming Team</p>
    </div>
  `;

  const mailOptions = {
    from: `"Eclipse Gaming Notifier" <${process.env.EMAIL_USER}>`,
    to: to,
    subject: subject,
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Reservation active email sent to ${to} for ${reservationType}.`);
  } catch (error) {
    console.error(`Error sending reservation active email to ${to}:`, error);
  }
}

// Exporting transporter as well in case it's used directly elsewhere (e.g., for test emails)
module.exports = { 
  sendQueueNotification, 
  transporter, 
  sendWaitlistConfirmationEmail,
  sendReservationActiveEmail
}; 