import express from 'express';
import mongoose from 'mongoose';
import AttendanceRouter from './MeetigAttendanceRoute.mjs';
import {
  idValidation,
  createMeetingValidation
} from '../../validators.mjs';
import { handleValidationErrors,  mapNamesToIds } from '../../middlewares.mjs';
import { Meeting } from '../../schemas.mjs';

const router = express.Router();
router.use('/attendance', AttendanceRouter)

router.post('/createmeeting',
  createMeetingValidation,
  handleValidationErrors,
  mapNamesToIds,
  
  async (req, res) => {
    
    req.body.chapter_id = req.chapter._id;
    try {
      if (!req.body.chapter_id) {
        return res.status(400).json({ message: 'Valid chapter_name is required.' });
      }
      const meeting = new Meeting(req.body);
      const saved = await meeting.save();
      res.status(201).json({
        message: "success",
        id: saved._id
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.get('/getmeetings',  async (req, res) => {
  try {
    const docs = await Meeting.aggregate([
      { $match: { chapter_id: req.chapter._id } },
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
          meeting_date: 1,
          meeting_time: 1,
          meeting_type: 1,
          duration: 1,
          title: 1,
          location: 1,
          meeting_notes: 1,
          meeting_status: 1,
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

router.get('/getfalsemeetings',  async (req, res) => {
  try {
    
    const docs = await Meeting.aggregate([
      { $match: { chapter_id: req.chapter._id, attendance_status: false } },
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
          meeting_date: 1,
          meeting_time: 1,
          meeting_type: 1,
          duration: 1,
          title: 1,
          location: 1,
          meeting_notes: 1,
          meeting_status: 1,
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

router.get('/getmeetingbyid/:id',  idValidation, handleValidationErrors, async (req, res) => {
  try {
    const [doc] = await Meeting.aggregate([
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
          meeting_date: 1,
          meeting_time: 1,
          meeting_type: 1,
          title: 1,
          location: 1,
          agenda: 1,
          meeting_notes: 1,
          total_attendees: 1,
          total_visitors: 1,
          total_referrals: 1,
          total_tyftb: 1,
          meeting_status: 1,
          createdAt: 1,
          updatedAt: 1,
          chapter: { _id: 1, chapter_name: 1, chapter_code: 1 }
        }
      }
    ]);
    if (!doc) return res.status(404).json({ message: 'Meeting not found' });
    res.status(200).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put(
  '/updatemeeting',
  
  async (req, res) => {
    try {
      const id = req.body._id
      const updated = await Meeting.findByIdAndUpdate(
        id,
        req.body,
        { new: true, runValidators: true }
      );
      if (!updated)
        return res.status(404).json({ message: 'Meeting not found' });
      res.status(200).json({ message: "success", id: updated._id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.delete('/deletemeetingbyid/:id',  idValidation, handleValidationErrors, async (req, res) => {
  try {
    const deleted = await Meeting.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ message: 'Meeting not found' });
    res.status(200).json({ message: 'Meeting deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/getlatestmeeting', async (req, res) => {
  try {
    const now = new Date();
    const [doc] = await Meeting.aggregate([
      {
        $match: {
          meeting_status: "upcoming",
          meeting_date: { $gte: now }
        }
      },
      { $sort: { meeting_date: 1, meeting_time: 1 } },
      { $limit: 1 },
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
          meeting_date: 1,
          meeting_time: 1,
          meeting_type: 1,
          duration: 1,
          title: 1,
          location: 1,
          meeting_notes: 1,
          meeting_status: 1,
          createdAt: 1,
          updatedAt: 1,
          chapter: { _id: 1, chapter_name: 1, chapter_code: 1 }
        }
      }
    ]);
    if (!doc) return res.status(404).json({ message: 'No upcoming meetings found' });
    res.status(200).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;