// controllers/authController.js
import { PrismaClient } from "../generated/prisma/index.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  generateOTP,
  isOTPExpired,
  cleanupExpiredOTPs,
} from "../utils/otpUtils.js";
import {
  sendOTPEmail,
  sendPasswordChangedEmail,
} from "../utils/emailService.js";

const prisma = new PrismaClient();

export const register = async (req, res) => {
  try {
    const { email, password, role, fullname } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    if (!email || !password || !fullname) {
      return res
        .status(400)
        .json({ error: "Email, password and fullname are required" });
    }

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
        fullname,
      },
    });

    res.status(201).json({ message: "User registered", user_id: user.user_id });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(400).json({ error: "Email already exists" });
    }
    res.status(400).json({ error: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    // Update last login
    await prisma.user.update({
      where: { user_id: user.user_id },
      data: { last_login: new Date() },
    });

    const token = jwt.sign(
      { user_id: user.user_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        fullname: user.fullname,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Request password reset - Send OTP
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Don't reveal if email exists or not for security
    if (!user) {
      return res.status(200).json({
        message: "If the email exists, an OTP has been sent",
      });
    }

    // Clean up expired OTPs first
    await cleanupExpiredOTPs(prisma);

    // Generate OTP
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create or update OTP record
    await prisma.passwordResetOTP.upsert({
      where: {
        user_id: user.user_id,
      },
      update: {
        otp_code: otpCode,
        expires_at: expiresAt,
        used: false,
      },
      create: {
        user_id: user.user_id,
        email: user.email,
        otp_code: otpCode,
        expires_at: expiresAt,
      },
    });

    // Send OTP via email
    const emailSent = await sendOTPEmail(user.email, otpCode, user.fullname);

    if (!emailSent) {
      return res.status(500).json({ error: "Failed to send OTP email" });
    }

    res.status(200).json({
      message: "OTP sent to your email",
      expires_in: "10 minutes",
    });
  } catch (error) {
    console.error("Error in requestPasswordReset:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Verify OTP
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp_code } = req.body;

    if (!email || !otp_code) {
      return res.status(400).json({
        error: "Email and OTP code are required",
      });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Find valid OTP
    const otpRecord = await prisma.passwordResetOTP.findFirst({
      where: {
        user_id: user.user_id,
        otp_code: otp_code,
        used: false,
      },
    });

    if (!otpRecord) {
      return res.status(400).json({ error: "Invalid OTP code" });
    }

    // Check if OTP is expired
    if (isOTPExpired(otpRecord.expires_at)) {
      await prisma.passwordResetOTP.delete({
        where: { id: otpRecord.id },
      });
      return res.status(400).json({ error: "OTP has expired" });
    }

    // Mark OTP as used
    await prisma.passwordResetOTP.update({
      where: { id: otpRecord.id },
      data: { used: true },
    });

    // Generate verification token for password reset
    const resetToken = jwt.sign(
      {
        user_id: user.user_id,
        email: user.email,
        purpose: "password_reset",
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" } // Short-lived token
    );

    res.status(200).json({
      message: "OTP verified successfully",
      reset_token: resetToken,
      user_id: user.user_id,
    });
  } catch (error) {
    console.error("Error in verifyOTP:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Reset password with token
export const resetPassword = async (req, res) => {
  try {
    const { reset_token, new_password } = req.body;

    if (!reset_token || !new_password) {
      return res.status(400).json({
        error: "Reset token and new password are required",
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters long",
      });
    }

    // Verify reset token
    let decoded;
    try {
      decoded = jwt.verify(reset_token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    // Check if token is for password reset
    if (decoded.purpose !== "password_reset") {
      return res.status(400).json({ error: "Invalid token purpose" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Update user password
    await prisma.user.update({
      where: { user_id: decoded.user_id },
      data: {
        password: hashedPassword,
        updated_at: new Date(),
      },
    });

    // Send password change notification
    await sendPasswordChangedEmail(decoded.email, decoded.fullname);

    // Clean up any remaining OTPs for this user
    await prisma.passwordResetOTP.deleteMany({
      where: { user_id: decoded.user_id },
    });

    res.status(200).json({
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Error in resetPassword:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Logout user
export const logout = async (req, res) => {
  try {
    // Since JWT is stateless, we typically handle logout on client side
    // by removing the token. However, we can implement server-side token
    // blacklisting if needed in the future.

    // Get token from header
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(400).json({
        success: false,
        error: "No token provided",
      });
    }

    // In a production system, you might want to:
    // 1. Add token to a blacklist (Redis or database)
    // 2. Set token expiration to a past date
    // 3. Track logout events for security

    // For now, we'll just return success and let client remove the token
    res.json({
      success: true,
      message: "Logged out successfully",
      logout_time: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in logout:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};
