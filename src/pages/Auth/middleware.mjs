import admin from "./firebase.mjs";
import { validationResult } from "express-validator";

export const authenticateUser = async (req, res, next) => {
  // --- THE BULLETPROOF FIX ---
  let sessionCookie = req.cookies.session;
  
  if (!sessionCookie && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    sessionCookie = req.headers.authorization.split('Bearer ')[1];
  }
  
  sessionCookie = sessionCookie || "";

  try {
    const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, true);
    req.user = decodedClaims;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized", error: err.message || err });
  }
};

export const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};
