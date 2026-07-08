import express from 'express';
import mongoose from 'mongoose';
import { Membership, Chapter, User } from '../../schemas.mjs';
import { handleValidationErrors, mapNamesToIds } from '../../middlewares.mjs'
import {
  idValidation,
  createMembershipValidation,
  updateMembershipValidation
} from '../../validators.mjs';

const router = express.Router();

router.post(
  '/createmembership',
  createMembershipValidation,
  handleValidationErrors,
  mapNamesToIds,
  async (req, res) => {
    try {

      req.body.chapter_id = req.chapter._id;

      let newUserId = req.body.user_id;
      if (!newUserId && req.body.username) {
        const newUser = await User.findOne({ username: req.body.username });
        if (!newUser) {
          return res.status(404).json({ error: "Target user for membership not found." });
        }
        newUserId = newUser._id;
        req.body.user_id = newUserId;
      }

      if (!req.body.user_id || !req.body.chapter_id) {
        return res.status(400).json({ message: 'Both valid user_id and chapter_id are required.' });
      }
      const membership = new Membership(req.body);
      let nextIdnoNum = 1000 + await Membership.countDocuments() + 10;
      const lastMembership = await Membership.findOne({ idno: { $exists: true } }).sort({ createdAt: -1 });
      if (lastMembership && lastMembership.idno) {
        const match = lastMembership.idno.match(/\d+/);
        if (match) {
          nextIdnoNum = parseInt(match[0], 10) + 1;
        }
      }
      membership.idno = `SIB${nextIdnoNum}`;
      const saved = await membership.save();
      return res.status(201).json(saved);

    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: err.message });
    }
  }
);

router.post(
  '/createpresident',
  createMembershipValidation,
  handleValidationErrors,
  mapNamesToIds,
  async (req, res) => {
    try {
      let newUserId = req.body.user_id;
      if (!newUserId && req.body.username) {
        const newUser = await User.findOne({ username: req.body.username });
        if (!newUser) {
          return res.status(404).json({ error: "Target user for membership not found." });
        }
        newUserId = newUser._id;
        req.body.user_id = newUserId;
      }

      if (!req.body.user_id || !req.body.chapter_id) {
        return res.status(400).json({ message: 'Both valid user_id and chapter_id are required.' });
      }

      const membership = new Membership(req.body);
      let nextIdnoNum = 1000 + await Membership.countDocuments() + 10;
      const lastMembership = await Membership.findOne({ idno: { $exists: true } }).sort({ createdAt: -1 });
      if (lastMembership && lastMembership.idno) {
        const match = lastMembership.idno.match(/\d+/);
        if (match) {
          nextIdnoNum = parseInt(match[0], 10) + 1;
        }
      }
      membership.idno = `SIB${nextIdnoNum}`;
      const saved = await membership.save();
      return res.status(201).json(saved);

    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: err.message });
    }
  }
);

router.get('/getallmemberships', async (req, res) => {
  try {
    const chapterid = req.query.chapter_id || (req.chapter && req.chapter._id);
    const matchStage = chapterid
      ? { $match: { chapter_id: new mongoose.Types.ObjectId(chapterid) } }
      : {};
    const pipeline = [
      ...(chapterid ? [matchStage] : []),
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: 'users',
          localField: 'user_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'chapters',
          localField: 'chapter_id',
          foreignField: '_id',
          as: 'chapter'
        }
      },
      { $unwind: { path: '$chapter', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'profiles',
          localField: 'user_id',
          foreignField: 'user_id',
          as: 'profile'
        }
      },
      { $unwind: { path: '$profile', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          role: 1,
          membership_status: 1,
          join_date: 1,
          renewal_date: 1,
          termination_date: 1,
          termination_reason: 1,
          createdAt: 1,
          updatedAt: 1,
          display_name: '$profile.display_name',
          company_phone: '$profile.company_phone',
          user: { _id: 1, username: 1, name: 1, email: 1, phone_number: 1 },
          chapter: { _id: 1, chapter_name: 1, chapter_code: 1 }
        }
      }
    ];
    const docs = await Membership.aggregate(pipeline);
    res.status(200).json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/getmembershipbyid/:id', idValidation, handleValidationErrors, async (req, res) => {
  try {
    const [doc] = await Membership.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
      {
        $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'user' }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $lookup: { from: 'chapters', localField: 'chapter_id', foreignField: '_id', as: 'chapter' }
      },
      { $unwind: { path: '$chapter', preserveNullAndEmptyArrays: true } },
      {
        $lookup: { from: 'profiles', localField: 'user_id', foreignField: 'user_id', as: 'profile' }
      },
      { $unwind: { path: '$profile', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          role: 1,
          membership_status: 1,
          join_date: 1,
          renewal_date: 1,
          termination_date: 1,
          termination_reason: 1,
          createdAt: 1,
          updatedAt: 1,
          display_name: '$profile.display_name',
          company_phone: '$profile.company_phone',
          user: { _id: 1, username: 1, name: 1, email: 1, phone_number: 1 },
          chapter: { _id: 1, chapter_name: 1, chapter_code: 1 }
        }
      }
    ]);
    if (!doc) return res.status(404).json({ message: 'Membership not found' });
    res.status(200).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put(
  '/updatemembershipbyid/:id',
  updateMembershipValidation,
  handleValidationErrors,
  mapNamesToIds,
  async (req, res) => {
    try {
      const updated = await Membership.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      if (!updated)
        return res.status(404).json({ message: 'Membership not found' });
      res.status(200).json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.put(
  '/updatemembershipbyids',
  async (req, res) => {
    try {
      const ids = req.body.ids;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: 'ids must be a non-empty array' });
      }
      const renewal_date = req.body.renewal_date;
      if (!renewal_date) {
        return res.status(400).json({ message: 'renewal_date is required' });
      }
      const updated = await Membership.updateMany(
        { _id: { $in: ids } },
        req.body,
        { new: true, runValidators: true }
      );
      if (!updated)
        return res.status(404).json({ message: 'Membership not found' });
      res.status(200).json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.delete('/deletemembershipbyid/:id', idValidation, handleValidationErrors, async (req, res) => {
  try {
    const deleted = await Membership.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ message: 'Membership not found' });
    res.status(200).json({ message: 'Membership deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/setidno', async (req, res) => {
  try {
    let id = 1001 ;
    const contdoc = await Membership.countDocuments();
    const memberships = await Membership.find();
    for (const membership of memberships) {
      if (!membership.idno) {
        membership.idno = `SIB${id++}`;
        await membership.save();
      }
    }
    res.status(200).json({ message: `Updated ${memberships.length} memberships with idno` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
