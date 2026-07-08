import admin from "./pages/Auth/firebase.mjs";
import mongoose from 'mongoose';
import { validationResult } from 'express-validator';
import { Chapter, Membership, Referral, MemberProfile, User, Vertical } from "./schemas.mjs";

export const authenticateCookie = async (req, res, next) => {
  // --- 🚨 TRAP 3 (Placed at the very start) ---
  console.log("🚨 TRAP 3: Incoming request to ->", req.originalUrl);
  console.log("🚨 TRAP 3: Authorization Header received ->", req.headers.authorization);
  // --------------------------------------------

  let sessionCookie = req.cookies.session;
  
  if (!sessionCookie && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    sessionCookie = req.headers.authorization.split('Bearer ')[1];
  }
  
  sessionCookie = sessionCookie || "";
  
  try {
    const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, true);
    req.user = decodedClaims;
    req.uid = decodedClaims.uid;
    if (!req.uid) {
      return res.status(400).json({ error: "Missing user id." });
    }

    const userObj = await User.findOne({ user_id: req.uid }).select('_id');
    if (!userObj) {
      return res.status(404).json({ error: "User not found with UID" });
    }
    req.userid = userObj._id;

    const membership = await Membership.findOne({ user_id: userObj._id }).select('_id chapter_id');
    if (!membership || !membership.chapter_id) {
      return res.status(404).json({ error: "Membership or chapter not found." });
    }
    req.memberid = membership._id;

    const chapter = await Chapter.findById(membership.chapter_id);
    if (!chapter) {
      return res.status(404).json({ error: "Chapter not found." });
    }
    req.chapter = chapter;
    next();
  } catch (err) {
    res.status(401).json({ message: "Unauthorized", error: err.message || err });
  }
};

export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(201).json({ errors: errors.array() });
  }
  next();
}

export async function mapNamesToIds(req, res, next) {
  try {
    if (typeof req.body.receiver === 'string' && req.body.receiver.trim()) {
      const user = await User.findOne({ username: req.body.receiver }).select('_id');
      if (!user) {
        return res.status(400).json({
          errors: [{ type: 'field', path: 'receiver', msg: 'User not found by username' }]
        });
      }
      req.body.receiver = user._id;
    }

    if (typeof req.body.sender === 'string' && req.body.sender.trim()) {
      const user = await User.findOne({ username: req.body.sender }).select('_id');
      if (!user) {
        return res.status(400).json({
          errors: [{ type: 'field', path: 'sender', msg: 'User not found by username' }]
        });
      }
      req.body.sender = user._id;
    }
    if (typeof req.body.username === 'string' && req.body.username.trim()) {
      const user = await User.findOne({ username: req.body.username }).select('_id');
      if (!user) {
        return res.status(400).json({
          errors: [{ type: 'field', path: 'username', msg: 'User not found by username' }]
        });
      }
      req.body.user_id = user._id;
      delete req.body.username;
    }
    if (typeof req.body.vertical_name === 'string' && req.body.vertical_name.trim()) {
      const vertical = await Vertical.findOne({ vertical_name: req.body.vertical_name }).select('_id');
      if (!vertical) {
        return res.status(400).json({
          errors: [{ type: 'field', path: 'vertical_name', msg: 'Vertical not found by name' }]
        });
      }
      req.body.vertical_id = vertical._id;
      delete req.body.vertical_name;
    }
    if (typeof req.body.chapter_name === 'string' && req.body.chapter_name.trim()) {
      const chapter = await Chapter.findOne({ chapter_name: req.body.chapter_name }).select('_id');
      if (!chapter) {
        return res.status(400).json({
          errors: [{ type: 'field', path: 'chapter_name', msg: 'Chapter not found by name' }]
        });
      }
      req.body.chapter_id = chapter._id;
    }
    if (typeof req.body.member1_name === 'string' && req.body.member1_name.trim()) {
      const member1 = await MemberProfile.findOne({ display_name: req.body.member1_name }).select('_id');
      if (!member1) {
        return res.status(400).json({
          errors: [{ type: 'field', path: 'member1_name', msg: 'Member 1 not found by display name' }]
        });
      }
      req.body.member1_id = member1._id;
      delete req.body.member1_name;
    }
    if (typeof req.body.member2_name === 'string' && req.body.member2_name.trim()) {
      const member2 = await User.findOne({ username: req.body.member2_name }).select('_id');
      if (!member2) {
        return res.status(400).json({
          errors: [{ type: 'field', path: 'member2_name', msg: 'Member 2 not found by display name' }]
        });
      }
      req.body.member2_id = member2._id;
      delete req.body.member2_name;
    }
    if (typeof req.body.created_by_username === 'string' && req.body.created_by_username.trim()) {
      const user = await User.findOne({ username: req.body.created_by_username }).select('_id');
      if (!user) {
        return res.status(400).json({
          errors: [{ type: 'field', path: 'created_by_username', msg: 'User not found by username' }]
        });
      }
      req.body.created_by = user._id;
      delete req.body.created_by_username;
    }
    if (typeof req.body.referrer_username === 'string' && req.body.referrer_username.trim()) {
      const user = await User.findOne({ username: req.body.referrer_username }).select('_id');
      if (!user) {
        return res.status(400).json({
          errors: [{ type: 'field', path: 'referrer_username', msg: 'Referrer user not found by username' }]
        });
      }
      req.body.referrer_id = user._id;
      delete req.body.referrer_username;
    }
    if (typeof req.body.referee_username === 'string' && req.body.referee_username.trim()) {
      const user = await User.findOne({ username: req.body.referee_username }).select('_id');
      if (!user) {
        return res.status(400).json({
          errors: [{ type: 'field', path: 'referee_username', msg: 'Referee user not found by username' }]
        });
      }
      req.body.referee_id = user._id;
      delete req.body.referee_username;
    }
    if (typeof req.body.member_username === 'string' && req.body.member_username.trim()) {
      const user = await User.findOne({ username: req.body.member_username }).select('_id');
      if (!user) {
        return res.status(400).json({
          errors: [{ type: 'field', path: 'username', msg: 'User not found by username' }]
        });
      }
      req.body.member_user_id = user._id;
      delete req.body.member_username;
    }
    if (typeof req.body.inviting_member_display_name === 'string' && req.body.inviting_member_display_name.trim()) {
      const member = await MemberProfile.findOne({ display_name: req.body.inviting_member_display_name }).select('_id');
      if (!member) {
        return res.status(400).json({
          errors: [{ type: 'field', path: 'inviting_member_display_name', msg: 'Inviting member not found by display name' }]
        });
      }
      req.body.inviting_member_id = member._id;
      delete req.body.inviting_member_display_name;
    }
    if (typeof req.body.referral_code === 'string' && req.body.referral_code.trim()) {
      const referral = await Referral.findOne({ referral_code: req.body.referral_code }).select('_id');
      if (!referral) {
        return res.status(400).json({
          errors: [{ type: 'field', path: 'referral_code', msg: 'Referral not found by code' }]
        });
      }
      req.body.referral_id = referral._id;
      delete req.body.referral_code;
    }
    if (typeof req.body.payer_displayname === 'string' && req.body.payer_displayname.trim()) {
      const payer = await MemberProfile.findOne({ display_name: req.body.payer_displayname }).select('_id');
      if (!payer) {
        return res.status(400).json({
          errors: [{ type: 'field', path: 'payer_displayname', msg: 'Payer profile not found by display name' }]
        });
      }
      req.body.payer_id = payer._id;
      delete req.body.payer_displayname;
    }
    if (typeof req.body.receiver_displayname === 'string' && req.body.receiver_displayname.trim()) {
      const receiver = await User.findOne({ username: req.body.receiver_displayname }).select('_id');
      if (!receiver) {
        return res.status(400).json({
          errors: [{ type: 'field', path: 'receiver_displayname', msg: 'Receiver profile not found by display name' }]
        });
      }
      req.body.receiver_id = receiver._id;
      delete req.body.receiver_displayname;
    }
    next();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export const mapverticalIds = async (req, res, next) => {
  try {
    const { vertical_ids } = req.body;

    if (!vertical_ids?.length || !Array.isArray(vertical_ids)) {
      return next();
    }

    const objectIds = [];
    const namesToLookup = [];

    for (const item of vertical_ids) {
      if (mongoose.Types.ObjectId.isValid(item)) {
        objectIds.push(new mongoose.Types.ObjectId.createFromHexString(item));
      } else if (typeof item === 'string' && item.trim()) {
        namesToLookup.push(item.trim());
      }
    }

    if (namesToLookup.length > 0) {
      const verticals = await Vertical.find({ vertical_name: { $in: namesToLookup } }).select('_id vertical_name');
      const verticalMap = new Map(verticals.map(v => [v.vertical_name, v._id]));

      for (const name of namesToLookup) {
        const id = verticalMap.get(name);
        if (!id) {
          return res.status(400).json({
            error: `Vertical '${name}' not found. Please provide a valid vertical name or ID.`
          });
        }
        objectIds.push(id);
      }
    }

    req.body.vertical_ids = objectIds;
    next();
  } catch (err) {
    console.error('Error in mapverticalIds:', err);
    res.status(500).json({ error: `Server error while mapping vertical names to IDs ${err.message}` });
  }
};
