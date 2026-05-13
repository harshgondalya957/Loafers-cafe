const User = require('../models/User');
const OTP = require('../models/OTP');
const nodemailer = require('nodemailer');

// --- Email Transporter Configuration ---
// Using port 465 with IPv4 forcing which is the most reliable for Gmail on Render
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, '') : ''
    },
    tls: {
        rejectUnauthorized: false
    },
    family: 4 // Force IPv4
});

// Verify connection on startup
transporter.verify((error, success) => {
    if (error) {
        console.error("❌ SMTP Connection Error:", error.message);
    } else {
        console.log("✅ SMTP Server is ready to take messages");
    }
});

const sendEmail = async (to, subject, html) => {
    try {
        await transporter.sendMail({
            from: `"Loafers" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html
        });
        console.log(`📧 OTP Email sent successfully to: ${to}`);
        return true;
    } catch (error) {
        console.error("❌ Nodemailer Error:", error.message);
        throw error;
    }
};

exports.sendOtp = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: "Email is required" });

        // Generate 6-digit random OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Save OTP to DB (with 10-minute expiry handled by model)
        await OTP.findOneAndUpdate(
            { email }, 
            { otp, createdAt: new Date() }, 
            { upsert: true, new: true }
        );

        const emailHtml = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #e63946; text-align: center;">Loafers Login OTP</h2>
                <p>Hello,</p>
                <p>Your verification code for Loafers is:</p>
                <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #333; border-radius: 8px; margin: 20px 0;">
                    ${otp}
                </div>
                <p>This code will expire in 10 minutes.</p>
                <p style="font-size: 12px; color: #888;">If you didn't request this, please ignore this email.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="text-align: center; font-weight: bold; color: #e63946;">The Loafers Team</p>
            </div>
        `;

        await sendEmail(email, "Your Loafers Verification Code", emailHtml);
        res.json({ message: "OTP sent successfully" });

    } catch (err) {
        console.error("sendOtp error:", err);
        res.status(500).json({ 
            error: "Failed to send OTP", 
            details: err.message 
        });
    }
};

exports.verifyOtpAndLogin = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required" });

        const otpRecord = await OTP.findOne({ email });

        if (!otpRecord || otpRecord.otp !== otp) {
            return res.status(400).json({ error: "Invalid or expired OTP" });
        }

        // Delete OTP after use
        await OTP.deleteOne({ email });

        // Find or create user
        let user = await User.findOne({ email });
        if (!user) {
            user = await User.create({
                name: email.split('@')[0],
                email,
                phone: ''
            });
        }

        res.json({ message: "Login successful", user });
    } catch (err) {
        console.error("verifyOtp error:", err);
        res.status(500).json({ error: "Server error" });
    }
};

exports.verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const otpRecord = await OTP.findOne({ email });
        if (!otpRecord || otpRecord.otp !== otp) {
            return res.status(400).json({ error: "Invalid OTP" });
        }
        res.json({ message: "OTP Verified" });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
};

exports.signup = async (req, res) => {
    try {
        const { name, email, phone, otp } = req.body;

        const otpRecord = await OTP.findOne({ email });
        if (!otpRecord || otpRecord.otp !== otp) {
            return res.status(400).json({ error: "Invalid or expired OTP" });
        }

        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ error: "User already exists" });

        user = await User.create({ name, email, phone });
        await OTP.deleteOne({ email });

        res.json({ message: "Signup successful", user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
