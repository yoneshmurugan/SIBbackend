import express from 'express';
import mongoose from 'mongoose';
import { ChapterSummary } from '../../schemas.mjs';
import {handleValidationErrors ,  mapNamesToIds } from '../../middlewares.mjs'
import {
  idValidation,
  createSummaryValidation,
  updateSummaryValidation
} from '../../validators.mjs';

const router = express.Router();

router.post(
  '/createstatistics',
  createSummaryValidation,
  handleValidationErrors,
   mapNamesToIds,
  async (req, res) => {
    try {
      if (!req.body.chapter_id) {
        return res.status(400).json({ message: 'Valid chapter_name is required.' });
      }
      const summary = new ChapterSummary(req.body);
      const saved = await summary.save();
      res.status(201).json(saved);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.get('/getstatistics', async (req, res) => {
  try {
    const docs = await ChapterSummary.aggregate([
      { $sort: { createdAt: -1 } },
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
          period_month: 1,
          total_members: 1,
          active_members: 1,
          total_referrals: 1,
          total_business: 1,
          meetings_held: 1,
          average_attendance: 1,
          visitors_total: 1,
          new_members_joined: 1,
          members_terminated: 1,
          one_to_ones_total: 1,
          createdAt: 1,
          updatedAt: 1,
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
    const [doc] = await ChapterSummary.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
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
          period_month: 1,
          total_members: 1,
          active_members: 1,
          total_referrals: 1,
          total_business: 1,
          meetings_held: 1,
          average_attendance: 1,
          visitors_total: 1,
          new_members_joined: 1,
          members_terminated: 1,
          one_to_ones_total: 1,
          createdAt: 1,
          updatedAt: 1,
          chapter: { _id: 1, chapter_name: 1, chapter_code: 1 }
        }
      }
    ]);
    if (!doc) return res.status(404).json({ message: 'Summary not found' });
    res.status(200).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put(
  '/updatestatisticsbyid/:id',
  updateSummaryValidation,
  handleValidationErrors,
   mapNamesToIds,
  async (req, res) => {
    try {
      const updated = await ChapterSummary.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      if (!updated)
        return res.status(404).json({ message: 'Summary not found' });
      res.status(200).json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.delete('/deletestatisticsbyid/:id', idValidation, handleValidationErrors, async (req, res) => {
  try {
    const deleted = await ChapterSummary.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ message: 'Summary not found' });
    res.status(200).json({ message: 'Summary deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;