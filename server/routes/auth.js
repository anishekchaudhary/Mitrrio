const router = require('express').Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

// --- 1. REGISTER (With Verification & Guest Data Transfer) ---
router.post('/register', async (req, res) => {
  try {
    console.log("[Auth] Register request body:", req.body); // Debug Log

    const { username, email, password, guestData, elo, xp, gamesPlayed } = req.body;

    // 1. Validation
    if (!username || !email || !password) {
      return res.status(400).json({ message: "Please provide username, email, and password" });
    }

    // 2. Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    // 3. Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Generate Verification Token
    const verificationToken = crypto.randomBytes(20).toString('hex');

    // 5. Resolve Stats: Prioritize direct fields, fallback to guestData object
    // This ensures stats are carried over whether sent flat or nested
    const initialElo = elo || guestData?.elo || 1200;
    const initialXp = xp || guestData?.xp || 0;
    const initialGames = gamesPlayed || guestData?.gamesPlayed || 0;

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      
      // Transfer Stats
      elo: initialElo,
      xp: initialXp,
      gamesPlayed: initialGames,
      
      isGuest: false, // Explicitly mark as Registered User
      verificationToken: verificationToken
    });

    const savedUser = await newUser.save();
    console.log("[Auth] User saved successfully:", savedUser._id);

    // 6. Send Verification Email
    const verifyUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email/${verificationToken}`;
    const message = `
      <h1>Welcome to Mitrrio!</h1>
      <p>Please click the link below to verify your account:</p>
      <a href="${verifyUrl}" clicktracking=off>${verifyUrl}</a>
    `;

    try {
      await sendEmail({
        email: savedUser.email,
        subject: 'Mitrrio Account Verification',
        message
      });
      
      res.status(201).json({ 
        message: "Registration successful! Please check your email to verify account." 
      });

    } catch (emailError) {
      console.error("[Auth] Email sending failed:", emailError);
      // If email fails, delete the user so they aren't stuck in a "unverified" state they can't fix
      await User.findByIdAndDelete(savedUser._id);
      return res.status(500).json({ message: "Email could not be sent. Please try again.", error: emailError.message });
    }

  } catch (err) {
    console.error("[Auth] Register Error:", err);
    // Return specific error message instead of empty object
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

// --- 2. VERIFY EMAIL ---
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findOne({ verificationToken: token });

    if (!user) return res.status(400).json({ message: "Invalid or expired verification token" });

    // Mark as verified
    user.isVerified = true;
    user.verificationToken = undefined; // Clear token
    await user.save();

    // Auto-login logic
    const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    
    // FIX: Explicitly create userData object safely
    const userData = {
      id: user._id,
      username: user.username,
      email: user.email,
      elo: user.elo,
      xp: user.xp,
      gamesPlayed: user.gamesPlayed,
      isVerified: user.isVerified
    };

    res.status(200).json({ 
      message: "Email Verified Successfully!", 
      token: jwtToken, 
      user: userData // Now this variable definitely exists
    });

  } catch (err) {
    console.error("[Auth] Verification Error:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

// --- 3. LOGIN ---
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Check Verification Status
    if (!user.isVerified) {
      return res.status(401).json({ message: "Please verify your email first!" });
    }

    // Check Password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ message: "Wrong password" });

    // Generate Token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    const { password: _, ...userData } = user._doc;
    
    res.status(200).json({ token, user: userData });

  } catch (err) {
    console.error("[Auth] Login Error:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

// --- 4. FORGOT PASSWORD ---
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Security: Don't reveal if user exists or not, but for now we return 404 for debugging
    if (!user) return res.status(404).json({ message: "Email not found" }); 

    // Generate Reset Token
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 Minutes

    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;
    const message = `
      <h1>Password Reset Request</h1>
      <p>Click the link below to reset your password. This link expires in 10 minutes.</p>
      <a href="${resetUrl}" clicktracking=off>${resetUrl}</a>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Mitrrio Password Reset',
        message
      });
      res.status(200).json({ message: "Password reset link sent to email" });
    } catch (err) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ message: "Email could not be sent" });
    }

  } catch (err) {
    console.error("[Auth] Forgot Password Error:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

// --- 5. RESET PASSWORD ---
router.put('/reset-password/:resetToken', async (req, res) => {
  try {
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.resetToken).digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired token" });

    // Set new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(req.body.password, salt);
    
    // Clear fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({ message: "Password updated successfully" });

  } catch (err) {
    console.error("[Auth] Reset Password Error:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

module.exports = router;