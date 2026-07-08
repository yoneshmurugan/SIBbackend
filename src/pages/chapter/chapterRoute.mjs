import express from 'express';
import mongoose from 'mongoose';
import { createChapterValidation, updateChapterValidation, idValidation } from '../../validators.mjs';
import { handleValidationErrors } from '../../middlewares.mjs';
import { Region, Chapter } from '../../schemas.mjs';
import fetch from 'node-fetch';

const router = express.Router();

router.post('/createchapter', createChapterValidation, handleValidationErrors,
  async (req, res) => {
    try {
      const region = await Region.findOne({ region_name: req.body.region_name }).select('_id');
      if (!region) {
        return res.status(400).json({
          errors: [{ type: 'field', path: 'region_name', msg: 'Region not found by name' }]
        });
      }
      req.body.region_id = region._id;
      delete req.body.region_name;
      const chapter = new Chapter(req.body);
      const saved = await chapter.save();

      const galleryPayload = {
        title: `${saved.chapter_name} M2M gallery`,
        date: saved.founded_date || new Date(),
        coverImg: "",
        photos: []
      };

      fetch('https://api.senguntharinbusiness.in/gallery/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(galleryPayload)
      }).catch(err => {
        console.error('Failed to create gallery:', err.message);
      });

      res.status(201).json(saved);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.get('/getallchapters', async (req, res) => {
  try {
    const chapters = await Chapter.aggregate([
      { $sort: { founded_date: -1 } },
      {
        $lookup: {
          from: 'regions',
          localField: 'region_id',
          foreignField: '_id',
          as: 'region'
        }
      },
      { $unwind: { path: '$region', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          chapter_name: 1,
          chapter_code: 1,
          meeting_day: 1,
          meeting_time: 1,
          meeting_location: 1,
          meeting_address: 1,
          chapter_status: 1,
          founded_date: 1,
          max_members: 1,
          current_member_count: 1,
          region: 1
        }
      }
    ]);
    res.status(200).json(chapters);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get(
  '/getchapterbyid/:id',
  idValidation,
  handleValidationErrors,

  async (req, res) => {
    try {
      const [chapter] = await Chapter.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
        {
          $lookup: {
            from: 'regions',
            localField: 'region_id',
            foreignField: '_id',
            as: 'region'
          }
        },
        { $unwind: { path: '$region', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            chapter_name: 1,
            chapter_code: 1,
            meeting_day: 1,
            meeting_time: 1,
            meeting_location: 1,
            meeting_address: 1,
            chapter_status: 1,
            founded_date: 1,
            max_members: 1,
            current_member_count: 1,
            region: 1
          }
        }
      ]);

      if (!chapter) return res.status(404).json({ message: 'Chapter not found' });
      res.status(200).json(chapter);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.put(
  '/updatechapterbyid/:id',
  updateChapterValidation,
  handleValidationErrors,

  async (req, res) => {
    try {
      if (typeof req.body.region_name === 'string' && req.body.region_name.trim().length) {
        const region = await Region.findOne({ region_name: req.body.region_name }).select('_id');
        if (!region) {
          return res.status(400).json({
            errors: [{ type: 'field', path: 'region_name', msg: 'Region not found by name' }]
          });
        }
        req.body.region_id = region._id;
        delete req.body.region_name;
      }

      const updated = await Chapter.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );

      if (!updated) return res.status(404).json({ message: 'Chapter not found' });
      res.status(200).json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.delete('/deletechapterbyid/:id', idValidation, handleValidationErrors, async (req, res) => {
  try {
    const deleted = await Chapter.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Chapter not found' });
    res.status(200).json({ message: 'Chapter deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/getallchapternames', async (req, res) => {
  try {
    const chapters = await Chapter.find().sort({ founded_date: -1 }).select('chapter_name');
    const chapterNames = chapters.map(ch => ch.chapter_name);
    res.status(200).json(chapterNames);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;