import express from 'express';
import mongoose from 'mongoose';
import { Visitor } from '../../schemas.mjs';
import {
  idValidation,
  createVisitorValidation,
  updateVisitorValidation
} from '../../validators.mjs';
import { mapNamesToIds, handleValidationErrors } from '../../middlewares.mjs'

const router = express.Router();

router.post(
  '/createvisitor',
  createVisitorValidation,
  handleValidationErrors,
  mapNamesToIds,
  async (req, res) => {
    try {
      if (!req.body.inviting_member_id)
        return res.status(400).json({ message: 'Valid inviting_member_display_name is required.' });
      const doc = new Visitor(req.body);
      const saved = await doc.save();
      res.status(201).json(saved);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.get('/getallvisitors', async (req, res) => {
  try {
    const docs = await Visitor.aggregate([
      { $sort: { createdAt: -1 } },
      { $lookup: { from: 'profiles', localField: 'inviting_member_id', foreignField: '_id', as: 'inviting_member' } },
      { $unwind: { path: '$inviting_member', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'users', localField: 'member_user_id', foreignField: '_id', as: 'member_user' } },
      { $unwind: { path: '$member_user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          visitor_name: 1,
          visitor_company: 1,
          visitor_phone: 1,
          visitor_email: 1,
          business_category: 1,
          industry: 1,
          presentation_given: 1,
          follow_up_notes: 1,
          converted_to_member: 1,
          createdAt: 1,
          updatedAt: 1,
          status: 1,
          inviting_member: { _id: 1, display_name: 1 },
          member_user: { _id: 1, username: 1, email: 1 }
        }
      }
    ]);
    res.status(200).json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/getvisitorbyid/:id', idValidation, handleValidationErrors, async (req, res) => {
  try {
    const [doc] = await Visitor.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
      { $lookup: { from: 'profiles', localField: 'inviting_member_id', foreignField: '_id', as: 'inviting_member' } },
      { $unwind: { path: '$inviting_member', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'users', localField: 'member_user_id', foreignField: '_id', as: 'member_user' } },
      { $unwind: { path: '$member_user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          visitor_name: 1,
          visitor_company: 1,
          visitor_phone: 1,
          visitor_email: 1,
          business_category: 1,
          industry: 1,
          presentation_given: 1,
          follow_up_notes: 1,
          converted_to_member: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
          inviting_member: { _id: 1, display_name: 1 },
          member_user: { _id: 1, username: 1, email: 1 }
        }
      }
    ]);
    if (!doc) return res.status(404).json({ message: 'Visitor not found' });
    res.status(200).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.put('/updatevisitorbyid/:id',
  updateVisitorValidation,
  handleValidationErrors,
  mapNamesToIds,
  async (req, res) => {
    try {
      const updated = await Visitor.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      if (!updated) return res.status(404).json({ message: 'Visitor not found' });
      res.status(200).json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.delete('/deletevisitorbyid/:id', idValidation, handleValidationErrors, async (req, res) => {
  try {
    const deleted = await Visitor.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Visitor not found' });
    res.status(200).json({ message: 'Visitor deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
