import { PrismaClient } from "../generated/prisma/index.js";
const prisma = new PrismaClient();
import nodemailer from "nodemailer";

export const submitSupportFeedback = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // 🔹 Basic Validation
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        error: "All fields are required",
      });
    }

    // 🔹 Save in Database
    await prisma.platformFeedback.create({
      data: {
        name,
        email,
        subject,
        message,
        user_type: "guest",
        feedback_type: "general",
        consent: true,
      },
    });

    // 🔹 Create transporter using SAME ENV
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // 🔹 Send Email
    await transporter.sendMail({
      from: `"MSME Sahaay Support" <${process.env.EMAIL_USER}>`,
      to: "dhruvjansari@nextgenconsultancy.in",
      subject: `New Support Feedback: ${subject}`,
      html: `
  <div style="background-color:#f4f6f9; padding:30px 0; font-family:Arial, sans-serif;">
    <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
      
      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg,#4f46e5,#6366f1); padding:20px 30px; text-align:center;">
          <h2 style="color:#ffffff; margin:0; font-size:22px; letter-spacing:0.5px;">
            New Support Request
          </h2>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:30px;">
          
          <p style="font-size:14px; color:#555; margin-bottom:20px;">
            You have received a new support request from your platform.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
            <tr>
              <td style="padding:8px 0; font-size:14px; color:#333;">
                <strong>Name:</strong> ${name}
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0; font-size:14px; color:#333;">
                <strong>Email:</strong> 
                <a href="mailto:${email}" style="color:#4f46e5; text-decoration:none;">
                  ${email}
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0; font-size:14px; color:#333;">
                <strong>Subject:</strong> ${subject}
              </td>
            </tr>
          </table>

          <!-- Message Box -->
          <div style="background:#f9fafb; border:1px solid #e5e7eb; padding:15px; border-radius:6px;">
            <p style="margin:0; font-size:14px; color:#444; line-height:1.6;">
              ${message}
            </p>
          </div>

        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#f9fafb; padding:15px 30px; text-align:center; font-size:12px; color:#888;">
          © ${new Date().getFullYear()} MSME Sahaay Platform<br/>
          This email was generated automatically from your support system.
        </td>
      </tr>

    </table>
  </div>
`,
    });

    return res.status(200).json({
      success: true,
      message: "Feedback submitted successfully",
    });
  } catch (error) {
    console.error("Support Feedback Error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};
