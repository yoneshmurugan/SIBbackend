import express from 'express';
import mongoose from 'mongoose';
import { Performance } from '../../schemas.mjs';
import {
  idValidation,
  createPerformanceValidation,
  updatePerformanceValidation
} from '../../validators.mjs';
import { handleValidationErrors, mapNamesToIds } from '../../middlewares.mjs';

const router = express.Router();

router.post(
  '/createstatistics',

  createPerformanceValidation,
  handleValidationErrors,
  mapNamesToIds,
  async (req, res) => {
    try {
      if (!req.body.user_id || !req.body.chapter_id) {
        return res.status(400).json({ message: 'Valid username and chapter_name required.' });
      }
      const doc = new Performance(req.body);
      const saved = await doc.save();
      res.status(201).json(saved);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.get('/getallstatistics', async (req, res) => {
  try {
    const docs = await Performance.aggregate([
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
        $project: {
          period_year: 1,
          period_6month: 1,
          period_month: 1,
          referrals_given: 1,
          referrals_received: 1,
          business_given: 1,
          business_received: 1,
          meetings_attended: 1,
          one_to_ones_held: 1,
          visitors_brought: 1,
          createdAt: 1,
          updatedAt: 1,
          user: { _id: 1, username: 1, name: 1, email: 1 },
          chapter: { _id: 1, chapter_name: 1, chapter_code: 1 }
        }
      }
    ]);
    res.status(200).json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/getstatisticsbyid/:id', idValidation, handleValidationErrors, async (req, res) => {
  try {
    const [doc] = await Performance.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
      { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'chapters', localField: 'chapter_id', foreignField: '_id', as: 'chapter' } },
      { $unwind: { path: '$chapter', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          period_year: 1,
          period_6month: 1,
          period_month: 1,
          referrals_given: 1,
          referrals_received: 1,
          business_given: 1,
          business_received: 1,
          meetings_attended: 1,
          one_to_ones_held: 1,
          visitors_brought: 1,
          createdAt: 1,
          updatedAt: 1,
          user: { _id: 1, username: 1, name: 1, email: 1 },
          chapter: { _id: 1, chapter_name: 1, chapter_code: 1 }
        }
      }
    ]);
    if (!doc) return res.status(404).json({ message: 'Performance not found' });
    res.status(200).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put(
  '/updatestatisticsbyid/:id',
  updatePerformanceValidation,
  handleValidationErrors,
  mapNamesToIds,
  async (req, res) => {
    try {
      const updated = await Performance.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      if (!updated) {
        return res.status(404).json({ message: 'Performance not found' });
      }
      res.status(200).json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.delete('/deletestatisticsbyid/:id', idValidation, handleValidationErrors, async (req, res) => {
  try {
    const deleted = await Performance.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Performance not found' });
    }
    res.status(200).json({ message: 'Performance deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
