import express from "express";
import admin from "./firebase.mjs";
import { authenticateUser, handleValidation } from "./middleware.mjs";
import {
  signupValidator,
  loginValidator,
  updateProfileValidator,
  resetPasswordValidator,
  deleteAccountValidator,
  updatePasswordValidator,
} from "../../validators.mjs";
import transporter from "./transporter.mjs";
import {User} from '../../schemas.mjs';
import { authenticateCookie } from "../../middlewares.mjs";

const router = express.Router();

router.post("/signup", signupValidator, handleValidation, async (req, res) => {
  const { username, email, phone_number, status, date_joined, password } = req.body;
  const dateJoined = req.body.date_joined ? new Date(req.body.date_joined) : new Date();
  try {
    const user = await admin.auth().createUser({ email, password, username });
    const newUser = new User({ user_id: user.uid, email, username, phone_number, status, date_joined: dateJoined });
    await newUser.save();
    await transporter.sendMail({
      from: '"SIB - Sengundhar in Business" <sibconnect2025@gmail.com>',
      to: email,
      subject: "Your SIB Portal Login Credentials",
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; color: #222;">
            <div style="max-width: 480px; margin: auto; padding: 24px; border-radius: 8px; background: #f7f7fb; border: 1px solid #ddd;">
              <h2 style="color: #003366; margin-bottom: 16px;">Welcome to SIB Portal!</h2>
              <p>
                Visit the SIB portal at:<br>
                <a href="https://www.senguntharinbusiness.in" style="color: #2155cd; text-decoration: underline;">
                  www.senguntharinbusiness.in
                </a>
              </p>
              <p>Enter your username and password as provided below.</p>
              <div style="background: #eef4fd; padding: 14px 18px; border-radius: 6px; margin: 15px 0;">
                <strong>Username:</strong> <span style="color: #2155cd;">[${email}]</span><br>
                <strong>Password:</strong> <span style="color: #2155cd;">[${req.body.password}]</span>
              </div>
              <h3 style="color: #ff0000;margin-bottom: 8px;">Important:</h3>
              <ul style="margin: 0 0 12px 18px;">
                <li>Please change your password after your first login for security purposes.</li>
                <li>Keep your credentials confidential and do not share them with anyone.</li>
              </ul>
              <div style="background: #fff1c6; padding: 10px 18px; border-radius: 6px;">
                <strong>Password Change Steps:</strong>
                <ol style="margin: 9px 0 0 21px;">
                  <li>Go to <b>Dashboard</b></li>
                  <li>Click <b>Profile</b></li>
                  <li>Select <b>Settings</b></li>
                  <li>Go to <b>Security</b> section</li>
                  <li>Click <b>Change Password</b></li>
                </ol>
              </div>
            </div>
            <div style="max-width: 480px; margin: auto; margin-top: 14px; padding: 0 24px;">
              <p style="margin-top: 18px;">
                If you face any issues logging in or have any questions, please reply to this email or contact our support team:<br>
                <a href="mailto:sibconnect2025@gmail.com" style="color: #2155cd;">sibconnect2025@gmail.com</a><br>
                Phone: <b>9842875676</b>
              </p>
              <p style="margin-top: 20px;">
                <strong>Best regards,</strong><br>
                SIB Development Team
              </p>
            </div>
          </body>
        </html>
      `
    });
    return res.status(201).json({ message: "User created", uid: newUser._id });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.put("/signupadmin", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const userRecord = await admin.auth().createUser({ email, password, displayName: username });
    const updatedUser = await User.findOneAndUpdate(
      { email },
      { user_id: userRecord.uid },
      { new: true }
    );
    if (!updatedUser) throw new Error("User with this email not found in database");
    return res.status(201).json({ message: "User created", uid: userRecord.uid, dbId: updatedUser._id });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.post("/sessionLogin", loginValidator, handleValidation, async (req, res) => {
  const idToken = req.body.idToken?.toString();
  const user_id = req.body.user_id?.toString();
  const admins = process.env.ADMIN_UIDS ? process.env.ADMIN_UIDS.split(",") : [];
  const expiresIn = parseInt(process.env.SESSION_EXPIRY) || 60 * 60 * 24 * 5 * 1000;
  let isadmin = false ;
  if (!idToken) {
    return res.status(400).json({ error: "Missing ID token" });
  }
  if (user_id && admins.map(id => id.trim()).filter(Boolean).includes(user_id)) {
    isadmin = true;
  }
  try {
    const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });
    res.cookie("session", sessionCookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });
    // We keep the standard cookie for Web/Android, but also send it in the JSON for iOS!
    res.json({ message: "Session created", isadmin, sessionToken: sessionCookie });
  } catch (error) {
    console.error("Error creating session cookie:", error);
    res.status(401).json({ error: "Invalid token" });
  }
});

router.get("/profile", authenticateUser, (req, res) => {
  res.json({ user: req.user });
});

router.post("/sessionLogout", (req, res) => {
  res.clearCookie("session");
  res.json({ message: "Logged out" });
});

router.put("/updateProfile", authenticateUser, updateProfileValidator, handleValidation, async (req, res) => {
  const { displayName, password } = req.body;
  try {
    const updatedUser = await admin.auth().updateUser(req.user.uid, { displayName, password });
    res.json({ message: "Profile updated", user: updatedUser });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/resetPassword", resetPasswordValidator, handleValidation, async (req, res) => {
  const { email } = req.body;
  try {
    const link = await admin.auth().generatePasswordResetLink(email);
    await transporter.sendMail({
      from: '"SIB - Sengundhar in Business" <kairospredict@gmail.com>',
      to: email,
      subject: "Password Reset Request",
      html: `
        <p>Click the link to reset your password:</p>
        <a href="${link}">${link}</a>
        <p>If you didn’t ask to reset the password, you can ignore this email.</p>
        <p>Thanks,</p>
        <p>SIB - Sengundhar in Business</p>
      `
    });

    res.json({ message: "Password reset email sent successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/refreshSession", authenticateUser, async (req, res) => {
  const expiresIn = parseInt(process.env.SESSION_EXPIRY);
  
  // --- THE FIX: Look for the token in the cookie OR the custom header ---
  const currentToken = req.cookies.session || req.headers['x-session-token'];
  // ----------------------------------------------------------------------

  try {
    const newSessionCookie = await admin.auth().createSessionCookie(currentToken, { expiresIn });
    res.cookie("session", newSessionCookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: true,
      sameSite: "none",
      domain: ".vercel.app",
    });
    
    // --- THE FIX: Send the refreshed token back to iOS in the JSON body ---
    res.json({ message: "Session refreshed", sessionToken: newSessionCookie });
    // ----------------------------------------------------------------------
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/deleteAccount", authenticateUser, deleteAccountValidator, handleValidation, async (req, res) => {
  try {
    await admin.auth().deleteUser(req.user.uid);
    res.clearCookie("session");
    res.json({ message: "User deleted" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/updatePassword", updatePasswordValidator, handleValidation, async (req, res) => {
  const { email, oldPassword, newPassword } = req.body;
  try {
    const response = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" + process.env.FIREBASE_API_KEY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: oldPassword, returnSecureToken: true }),
    });

    const data = await response.json();
    if (!data.idToken) {
      return res.status(401).json({ error: "Old password is incorrect" });
    }
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(user.uid, { password: newPassword });
    res.json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/getuser", authenticateCookie, async (req, res) => {
  try {
    const userId = req.user && req.user.uid;
    if (!userId) {
      return res.status(400).json({ error: "Missing user id." });
    }
    const userObj = await User.findOne({ user_id: userId });
    res.json(userObj);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

import multer from 'multer'
import sharp from "sharp";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

router.post('/upload/photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) throw new Error('No file uploaded');
    const processedBuffer = await sharp(req.file.buffer)
      .resize({ width: 800, withoutEnlargement: true })
      .jpeg({ quality: 75 })
      .toBuffer();

    const bucket = admin.storage().bucket();
    const fileName = `photos/${Date.now()}_${req.file.originalname.replace(/\s/g, '_')}.jpg`;
    const file = bucket.file(fileName);

    await file.save(processedBuffer, {
      metadata: {
        contentType: 'image/jpeg'
      }
    });
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    res.status(200).json({ message: 'Photo uploaded and processed!', url: publicUrl });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

router.post("/register-fcm-token", authenticateCookie, async (req, res) => {
  try {
    const { fcmToken } = req.body;
    if (!fcmToken) return res.status(400).json({ error: "Missing FCM token" });
    const userId = req.user && req.user.uid;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    await User.updateOne(
      { user_id: userId },
      { $addToSet: { fcmTokens: fcmToken } }
    );
    res.json({ message: "FCM token registered successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/remove-fcm-token", authenticateCookie, async (req, res) => {
  try {
    const { fcmToken } = req.body;
    if (!fcmToken) return res.status(400).json({ error: "Missing FCM token" });
    const userId = req.user && req.user.uid;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    await User.updateOne(
      { user_id: userId },
      { $pull: { fcmTokens: fcmToken } }
    );
    res.json({ message: "FCM token removed successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
