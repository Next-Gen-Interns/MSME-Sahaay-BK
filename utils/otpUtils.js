// utils/otpUtils.js
import crypto from "crypto";

// Generate 6-digit OTP
export const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Check if OTP is expired
export const isOTPExpired = (expiresAt) => {
  return new Date() > new Date(expiresAt);
};

// Clean up expired OTPs
export const cleanupExpiredOTPs = async (prisma) => {
  try {
    await prisma.passwordResetOTP.deleteMany({
      where: {
        expires_at: {
          lt: new Date(),
        },
      },
    });
  } catch (error) {
    console.error("Error cleaning up expired OTPs:", error);
  }
};
