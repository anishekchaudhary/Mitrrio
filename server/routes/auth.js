const router = require('express').Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

// --- 1. REGISTER (Updated with Verification) ---
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, guestData } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate Verification Token
    const verificationToken = crypto.randomBytes(20).toString('hex');

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      elo: guestData?.elo || 1200,
      xp: guestData?.xp || 0,
      verificationToken: verificationToken
    });

    const savedUser = await newUser.save();

    // Send Verification Email
    const verifyUrl = `http://localhost:5173/verify-email/${verificationToken}`;
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
      // If email fails, delete user so they can try again
      await User.findByIdAndDelete(savedUser._id);
      return res.status(500).json({ message: "Email could not be sent", error: emailError.message });
    }

  } catch (err) {
    res.status(500).json(err);
  }
});

// --- 2. VERIFY EMAIL (New) ---
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findOne({ verificationToken: token });

    if (!user) return res.status(400).json({ message: "Invalid or expired token" });

    user.isVerified = true;
    user.verificationToken = undefined; // Clear token
    await user.save();

    // Auto-login after verification
    const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    const { password, ...userData } = user._doc;

    res.status(200).json({ 
      message: "Email Verified Successfully!", 
      token: jwtToken, 
      user: userData 
    });

  } catch (err) {
    res.status(500).json(err);
  }
});

// --- 3. LOGIN (Updated check) ---
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found" });

    // Check Verification Status
    if (!user.isVerified) {
      return res.status(401).json({ message: "Please verify your email first!" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ message: "Wrong password" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    const { password: _, ...userData } = user._doc;
    
    res.status(200).json({ token, user: userData });

  } catch (err) {
    res.status(500).json(err);
  }
});

// --- 4. FORGOT PASSWORD (New) ---
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "Email not sent" }); 

    // Generate Reset Token
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 Minutes

    await user.save();

    const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;
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
      res.status(200).json({ message: "Email sent" });
    } catch (err) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();
      return res.status(500).json({ message: "Email could not be sent" });
    }

  } catch (err) {
    res.status(500).json(err);
  }
});

// --- 5. RESET PASSWORD (New) ---
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
    res.status(500).json(err);
  }
});

module.exports = router;