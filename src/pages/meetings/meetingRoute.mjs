import express from 'express';
import mongoose from 'mongoose';
import AttendanceRouter from './MeetigAttendanceRoute.mjs';
import {
  idValidation,
  createMeetingValidation
} from '../../validators.mjs';
import { handleValidationErrors,  mapNamesToIds } from '../../middlewares.mjs';
import { Meeting, Membership, Notification } from '../../schemas.mjs';
import { sendPushNotification } from '../../utils/fcmHelper.mjs';
import { autoUpdateMeetingStatuses } from '../../utils/meetingStatusHelper.mjs';

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

      // Dispatch In-App & Mobile Push Notifications to Active Chapter Members
      try {
        const activeMemberships = await Membership.find({
          chapter_id: req.chapter._id,
          membership_status: true
        }, 'user_id');

        const senderId = req.userid;
        const targetUserIds = activeMemberships
          .map(m => m.user_id)
          .filter(uid => uid && String(uid) !== String(senderId));

        if (targetUserIds.length > 0) {
          const meetingDateStr = saved.meeting_date 
            ? new Date(saved.meeting_date).toLocaleDateString('en-GB') 
            : '';
          const header = `🗓️ New Chapter Meeting: ${saved.title}`;
          const content = `A new meeting titled "${saved.title}" has been scheduled for ${meetingDateStr} at ${saved.meeting_time || ''}${saved.location ? ` in ${saved.location}` : ''}. Please review the details and ensure your attendance.`;

          // 1. In-App Notifications
          await Notification.insertMany(
            targetUserIds.map(uid => ({
              receiver: uid,
              sender: senderId,
              header,
              content,
              data: {
                action: "OPEN_MEETINGS",
                meetingId: String(saved._id),
                chapterId: String(req.chapter._id)
              },
              read: false
            }))
          );

          // 2. Mobile Push Notifications (FCM + APNs)
          sendPushNotification(
            targetUserIds,
            `🗓️ New Meeting: ${saved.title}`,
            `${meetingDateStr} at ${saved.meeting_time || ''} • ${saved.location || req.chapter.chapter_name || 'Chapter Meeting'}`,
            {
              action: "OPEN_MEETINGS",
              meetingId: String(saved._id)
            }
          ).catch(err => console.error("Push notification error on meeting create:", err));
        }
      } catch (notifErr) {
        console.error("Meeting notification dispatch error:", notifErr);
      }

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
    if (req.chapter?._id) {
      await autoUpdateMeetingStatuses(req.chapter._id);
    }
    const docs = await Meeting.aggregate([
      { $match: { chapter_id: req.chapter._id } },
      { $sort: { meeting_date: -1, createdAt: -1 } },
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
    if (req.chapter?._id) {
      await autoUpdateMeetingStatuses(req.chapter._id);
    }
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
    if (req.chapter?._id) {
      await autoUpdateMeetingStatuses(req.chapter._id);
    }
    const [doc] = await Meeting.aggregate([
      {
        $match: {
          chapter_id: req.chapter._id,
          meeting_status: "upcoming"
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