import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 465,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export const sendOTPEmail = async (email, otpCode, userName = "User") => {
  try {
    const mailOptions = {
      from: `"MSME Guru" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Reset OTP - MSME Guru",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Hello ${userName},</p>
          <p>You have requested to reset your password for your MSME Guru account.</p>
          <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
            <h3 style="margin: 0; color: #333;">Your OTP Code:</h3>
            <div style="font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 5px; margin: 15px 0;">
              ${otpCode}
            </div>
          </div>
          <p>This OTP is valid for 10 minutes. Please do not share this code with anyone.</p>
          <p>If you didn't request this reset, please ignore this email.</p>
          <br>
          <p>Best regards,<br>MSME Guru Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent to ${email}`);
    return true;
  } catch (error) {
    console.error("❌ Error sending OTP email:", error);
    return false;
  }
};

export const sendPasswordChangedEmail = async (email, userName = "User") => {
  try {
    const mailOptions = {
      from: `"MSME Guru" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Changed Successfully - MSME Guru",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Changed Successfully</h2>
          <p>Hello ${userName},</p>
          <p>Your password has been successfully changed for your MSME Guru account.</p>
          <p>If you did not make this change, please contact our support team immediately.</p>
          <br>
          <p>Best regards,<br>MSME Guru Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Password change email sent to ${email}`);
    return true;
  } catch (error) {
    console.error("❌ Error sending password change email:", error);
    return false;
  }
};
