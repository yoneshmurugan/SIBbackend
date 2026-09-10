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
import { getWelcomeEmailTemplate, getPasswordResetTemplate } from "./emailTemplates.mjs";
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
      html: getWelcomeEmailTemplate(email, req.body.password)
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
  const expiresIn = parseInt(process.env.SESSION_EXPIRY) || 1209600000;
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
    
    if (user_id) {
      await User.findOneAndUpdate({ user_id: user_id }, { last_signed_in: new Date() });
    }
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
      html: getPasswordResetTemplate(link)
    });

    res.json({ message: "Password reset email sent successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/refreshSession", authenticateUser, async (req, res) => {
  const expiresIn = parseInt(process.env.SESSION_EXPIRY) || 1209600000;
  
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

// Lookup email by identifier (email or phone)
router.post("/lookup-email", async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ error: "Identifier is required" });
    }

    // If it's already an email, just return it
    if (identifier.includes("@")) {
      return res.json({ email: identifier.trim() });
    }

    // Otherwise, assume it's a phone number. Clean it up (strip spaces, hyphens).
    const cleanPhone = identifier.replace(/[\s-]/g, "");

    // Find the user by phone number. 
    // We try to match either exact phone, or if they forgot country code, ending with it
    const user = await User.findOne({
      $or: [
        { phone_number: cleanPhone },
        { phone_number: { $regex: new RegExp(cleanPhone + "$") } }
      ]
    });

    if (!user || !user.email) {
      return res.status(404).json({ error: "No account found with this phone number" });
    }

    return res.json({ email: user.email });
  } catch (error) {
    console.error("Error in lookup-email:", error);
    return res.status(500).json({ error: "Internal server error during lookup" });
  }
});

export default router;
