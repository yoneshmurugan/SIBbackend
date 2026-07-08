import express from 'express';
import mongoose from 'mongoose';
import { Attendance, User, Membership } from '../../schemas.mjs';
import {
  idValidation,
  createAttendanceValidation,
  updateAttendanceValidation,
  createBulkAttendanceValidation
} from '../../validators.mjs';
import { handleValidationErrors, mapNamesToIds } from '../../middlewares.mjs';

const router = express.Router();

router.post(
  '/createattendance',
  createAttendanceValidation,
  handleValidationErrors,

  mapNamesToIds,
  async (req, res) => {
    try {
      if (!req.body.user_id) {
        return res.status(400).json({ error: 'Valid user_id is required.' });
      }
      if (!req.body.meeting_id) {
        return res.status(400).json({ error: 'Valid meeting_id is required.' });
      }
      req.body.meeting_id = new mongoose.Types.ObjectId(req.body.meeting_id);
      req.body.user_id = new mongoose.Types.ObjectId(req.body.user_id);
      const doc = new Attendance(req.body);
      const saved = await doc.save();
      res.status(201).json(saved);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.post(
  '/createbulkattendances',
  createBulkAttendanceValidation,
  handleValidationErrors,

  async (req, res) => {
    try {
      const { usersdata, meeting_id, date } = req.body;

      if (!usersdata || !Array.isArray(usersdata) || usersdata.length === 0) {
        console.log("user data error")
        return res.status(400).json({ error: 'Valid usersdata array is required.' });
      }
      if (!meeting_id) {
        console.log("meeting id error")
        return res.status(400).json({ error: 'Valid meeting_id is required.' });
      }
      if (!date) {
        console.log("date error")
        return res.status(400).json({ error: 'Valid date is required.' });
      }

      const objectMeetingId = new mongoose.Types.ObjectId(meeting_id);
      const usernames = usersdata.map(data => data.name);

      const users = await User.find({ username: { $in: usernames } }).select('_id username');

      if (users.length !== usernames.length) {
        const foundUsernames = new Set(users.map(u => u.username));
        const missingUsernames = usernames.filter(name => !foundUsernames.has(name));
        console.log(missingUsernames)
        return res.status(400).json({
          error: `Some users not found: ${missingUsernames.join(', ')}`
        });
      }

      const usernameToIdMap = new Map(users.map(user => [user.username, user._id]));

      const attendanceDocuments = usersdata.map(data => {
        const userId = usernameToIdMap.get(data.name);
        return {
          user_id: userId,
          attendance_status: data.attendance.toLowerCase(),
          meeting_id: objectMeetingId,
          date: new Date(date)
        };
      });

      const savedAttendances = await Attendance.insertMany(attendanceDocuments);
      res.status(201).json({ message: 'Attendances created successfully', savedAttendances });
    } catch (err) {
      console.log(err)
      res.status(500).json({ error: err.message });
    }
  }
);

router.get('/getallattendances', async (req, res) => {
  try {

    const allMemberships = await Membership.find({
      chapter_id: req.chapter._id,
      membership_status: true
    }).select('user_id');

    const chapterUserIds = allMemberships.map(m => m.user_id);

    if (!chapterUserIds.length) {
      return res.status(200).json([]);
    }

    const docs = await Attendance.aggregate([
      { $match: { user_id: { $in: chapterUserIds } } },
      { $sort: { created_at: -1 } },
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
          from: 'meetings',
          localField: 'meeting_id',
          foreignField: '_id',
          as: 'meeting'
        }
      },
      { $unwind: { path: '$meeting', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          attendance_status: 1,
          date: 1,
          user: { _id: 1, username: 1, email: 1, phone_number: 1 },
          meeting: { _id: 1, meeting_date: 1, title: 1, location: 1 }
        }
      }
    ]);
    res.status(200).json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/getattendancebyid/:id',

  idValidation,
  handleValidationErrors,
  async (req, res) => {
    try {

      const allMemberships = await Membership.find({
        chapter_id: req.chapter._id,
        membership_status: true
      }).select("user_id");

      const chapterUserIds = allMemberships.map(m => m.user_id);

      const [doc] = await Attendance.aggregate([
        {
          $match: {
            _id: new mongoose.Types.ObjectId(req.params.id),
            user_id: { $in: chapterUserIds }
          }
        },
        {
          $lookup: {
            from: "users",
            localField: "user_id",
            foreignField: "_id",
            as: "user"
          }
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "meetings",
            localField: "meeting_id",
            foreignField: "_id",
            as: "meeting"
          }
        },
        { $unwind: { path: "$meeting", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            attendance_status: 1,
            date: 1,
            user: { _id: 1, username: 1, email: 1, phone_number: 1 },
            meeting: { _id: 1, meeting_date: 1, title: 1, location: 1 }
          }
        }
      ]);
      if (!doc) {
        return res.status(404).json({ error: 'Attendance record not found or not accessible' });
      }
      res.status(200).json(doc);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.get('/getattendanceofuser/:userid', async (req, res) => {
  try {
    
    const allMemberships = await Membership.find({
      chapter_id: req.chapter._id,
      membership_status: true
    }).select('user_id');
    const chapterUserIds = allMemberships.map(m => m.user_id.toString());

    const { userid } = req.params;
    let targetUserObj;
    if (mongoose.Types.ObjectId.isValid(userid)) {
      targetUserObj = await User.findById(userid).lean();
    } else {
      targetUserObj = await User.findOne({ user_id: userid }).lean();
    }
    if (!targetUserObj?._id) {
      return res.status(404).json({ error: 'Target user not found.' });
    }

    if (!chapterUserIds.includes(targetUserObj._id.toString())) {
      return res.status(403).json({ error: 'User not in the same chapter.' });
    }

    const docs = await Attendance.aggregate([
      { $match: { user_id: targetUserObj._id } },
      { $sort: { date: -1 } },
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
          from: 'meetings',
          localField: 'meeting_id',
          foreignField: '_id',
          as: 'meeting'
        }
      },
      { $unwind: { path: '$meeting', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          attendance_status: 1,
          date: 1,
          user: { _id: 1, username: 1, email: 1, phone_number: 1 },
          meeting: { _id: 1, meeting_date: 1, title: 1, location: 1 }
        }
      }
    ]);

    if (!docs || docs.length === 0) {
      return res.status(200).json([]);
    }
    res.status(200).json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/getattendanceofmine', async (req, res) => {
  try {
    
    const allMemberships = await Membership.find({
      chapter_id: req.chapter._id,
      membership_status: true
    }).select('user_id');
    const chapterUserIds = allMemberships.map(m => m.user_id.toString());

    const userId = req.user && req.user.uid;

    const userObj = await User.findOne({ user_id: userId });
    if (!userObj) {
      return res.status(404).json({ error: "User not found." });
    }

    let targetUserObj = userObj._id;

    if (!chapterUserIds.includes(targetUserObj._id.toString())) {
      return res.status(403).json({ error: 'User not in the same chapter.' });
    }

    const docs = await Attendance.aggregate([
      { $match: { user_id: targetUserObj._id } },
      { $sort: { date: -1 } },
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
          from: 'meetings',
          localField: 'meeting_id',
          foreignField: '_id',
          as: 'meeting'
        }
      },
      { $unwind: { path: '$meeting', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          attendance_status: 1,
          date: 1,
          user: { _id: 1, username: 1, email: 1, phone_number: 1 },
          meeting: { _id: 1, meeting_date: 1, title: 1, location: 1, meeting_type: 1, duration: 1 }
        }
      }
    ]);

    if (!docs || docs.length === 0) {
      return res.status(200).json([]);
    }
    res.status(200).json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put(
  '/updateattendancebyid/:id',
  updateAttendanceValidation,
  handleValidationErrors,

  mapNamesToIds,
  async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'Invalid attendance ID' });
      }

      if (req.body.meeting_id && typeof req.body.meeting_id === 'string') {
        req.body.meeting_id = new mongoose.Types.ObjectId(req.body.meeting_id);
      }
      if (req.body.user_id && typeof req.body.user_id === 'string') {
        req.body.user_id = new mongoose.Types.ObjectId(req.body.user_id);
      }

      const updated = await Attendance.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );

      if (!updated) {
        return res.status(404).json({ error: 'Attendance record not found' });
      }

      res.status(200).json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.delete(
  '/deleteattendancebyid/:id',

  idValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'Invalid attendance ID' });
      }

      const deleted = await Attendance.findByIdAndDelete(req.params.id);

      if (!deleted) {
        return res.status(404).json({ error: 'Attendance record not found' });
      }

      res.status(200).json({ message: 'Attendance deleted successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;
