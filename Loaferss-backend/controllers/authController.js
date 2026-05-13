const User = require('../models/User');
const OTP = require('../models/OTP');
const axios = require('axios');

// --- Email Config (Resend API for Render Compatibility) ---
const RESEND_API_KEY = 're_Ro71RxMB_6QbhgPLcaPZEQBfLUguz1N6a';

const sendEmail = async (to, subject, text) => {
    try {
        await axios.post('https://api.resend.com/emails', {
            from: 'Loafers <onboarding@resend.dev>',
            to: [to],
            subject: subject,
            html: text
        }, {
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        console.log(`Email sent via Resend to ${to}`);
        return true;
    } catch (error) {
        console.error("Resend API Error:", error.response ? error.response.data : error.message);
        throw new Error(error.response ? error.response.data.message : "Failed to send email via Resend");
    }
};

exports.sendOtp = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: "Email is required" });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Remove existing OTPs for this email to avoid duplicates
        await OTP.deleteMany({ email });

        // Save new OTP
        await OTP.create({ email, otp });

        // Send Email (Async)
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <h3>Hello!</h3>
                <p>Welcome to <strong>Loafers</strong>! We are excited to serve you.</p>
                <p style="font-size: 16px;">Your Login OTP is: <strong style="font-size: 24px; color: #e63946; letter-spacing: 2px;">${otp}</strong></p>
                <p>Please enter this code to securely access your account.</p>
                <p>Get ready to enjoy the best food in town!</p>
                <br/>
                <p>Best Regards,<br/><strong>The Loafers Team</strong></p>
            </div>
        `;
        // Send Email (Wait for it)
        try {
            await sendEmail(email, "Your Loafers Login OTP", emailHtml);
            res.json({ message: "OTP sent successfully" });
        } catch (emailErr) {
            console.error("Failed to send OTP email:", emailErr);
            res.status(500).json({ 
                error: "Failed to send OTP email", 
                details: emailErr.message 
            });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
};

exports.verifyOtpAndLogin = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required" });

        const otpRecord = await OTP.findOne({ email });

        if (!otpRecord) {
            return res.status(400).json({ error: "OTP expired or invalid" });
        }

        if (otpRecord.otp !== otp) {
            return res.status(400).json({ error: "Invalid OTP" });
        }

        // OTP Valid. Check User.
        let user = await User.findOne({ email });

        if (!user) {
            // Create new user
            const defaultName = email.split('@')[0];
            user = await User.create({
                name: defaultName,
                email,
                phone: ''
            });
        } else {
            // Update name from default 'Customer' if possible
            if (user.name === 'Customer') {
                user.name = email.split('@')[0];
                await user.save();
            }
        }

        // Delete used OTP
        await OTP.deleteMany({ email });

        res.json({ message: "Login successful", user });
    } catch (err) {
        console.error(err);
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

        // Verify OTP
        const otpRecord = await OTP.findOne({ email });
        if (!otpRecord || otpRecord.otp !== otp) {
            return res.status(400).json({ error: "Invalid or expired OTP" });
        }

        // Check if user exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ error: "Email already exists" });
        }

        user = await User.create({ name, email, phone });

        await OTP.deleteMany({ email });

        res.json({ message: "Signup successful", user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};
