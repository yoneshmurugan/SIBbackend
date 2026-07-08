import express from 'express';
import mongoose from 'mongoose';
import { OneToOneMeeting, Membership, Gallery } from '../../schemas.mjs';
import { idValidation, createOneToOneMeetingValidation, updateOneToOneMeetingValidation, updateBulkM2MStatusValidation } from '../../validators.mjs';
import { mapNamesToIds, handleValidationErrors } from '../../middlewares.mjs'
import fetch from 'node-fetch';

const router = express.Router();

router.post(
  '/createone2one',
  createOneToOneMeetingValidation,
  handleValidationErrors,
  mapNamesToIds,
  async (req, res) => {
    try {
      console.log(req.body)
      req.body.member1_id = req.userid;

      if (!req.body.member1_id || !req.body.member2_id || !req.body.chapter_id || !req.body.created_by) {
        return res.status(400).json({ message: 'All member, chapter, and user references are required and must be valid.' });
      }

      let gallery = await Gallery.findOne({ chapter_id: req.body.chapter_id }).select('_id').lean();
      if (req.body.chapter_name) {
        const galname = req.body.chapter_name
          .split(' ')
          .map(word => word.charAt(0).toUpperCase())
          .join('');

        gallery = await Gallery.findOne({ title: `${galname} M2M gallery` }).select('_id').lean();
      }

      if (req.body.image_url) {
        fetch(`https://api.senguntharinbusiness.in/gallery/add-photos/${gallery._id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photos: [req.body.image_url] })
        }).catch(err => {
          console.error('Failed to add photo to gallery:', err.message);
        });
      }

      const meeting = new OneToOneMeeting(req.body);
      const saved = await meeting.save();
      res.status(201).json({ message: "One-to-One Meeting created successfully", id: saved._id });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

router.get('/getone2ones', async (req, res) => {
  try {

    const userId = req.userid;

    const chapterMemberships = await Membership.find({
      chapter_id: req.chapter._id,
      membership_status: true
    }).select('user_id');

    const chapterUserIds = chapterMemberships.map(m => m.user_id);
    if (chapterUserIds.length === 0) {
      return res.status(200).json([]);
    }

    const docs = await OneToOneMeeting.aggregate([
      {
        $match: {
          chapter_id: req.chapter._id,
          $or: [
            { member1_id: { $in: chapterUserIds } },
            { member2_id: { $in: chapterUserIds } }
          ]
        }
      },
      { $sort: { meeting_date: -1 } },
      {
        $lookup: {
          from: 'users',
          localField: 'member1_id',
          foreignField: '_id',
          as: 'member1'
        }
      },
      { $unwind: { path: '$member1', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'member2_id',
          foreignField: '_id',
          as: 'member2'
        }
      },
      { $unwind: { path: '$member2', preserveNullAndEmptyArrays: true } },
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
          from: 'users',
          localField: 'created_by',
          foreignField: '_id',
          as: 'created_by_user'
        }
      },
      { $unwind: { path: '$created_by_user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          member1: {
            _id: 1,
            username: 1,
            email: 1
          },
          member2: {
            _id: 1,
            username: 1,
            email: 1
          },
          chapter: {
            _id: 1,
            chapter_name: 1,
            chapter_code: 1
          },
          created_by_user: {
            _id: 1,
            username: 1,
            email: 1
          },
          image_url: 1,
          status: 1,
          meeting_date: 1,
          location: 1,
          discussion_points: 1,
          createdAt: 1,
          updatedAt: 1
        }
      }
    ]);

    return res.status(200).json(docs);
  } catch (err) {
    console.error('Error in /getone2ones:', err);
    return res.status(500).json({ error: err.message });
  }
});

router.get('/getone2onebyid/:id', idValidation, handleValidationErrors, async (req, res) => {
  try {
    const [doc] = await OneToOneMeeting.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
      {
        $lookup: {
          from: 'users',
          let: { member1_id: '$member1_id', member2_id: '$member2_id', created_by: '$created_by' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$_id', '$$member1_id'] },
                    { $eq: ['$_id', '$$member2_id'] },
                    { $eq: ['$_id', '$$created_by'] }
                  ]
                }
              }
            },
            { $project: { _id: 1, username: 1, email: 1 } }
          ],
          as: 'users'
        }
      },
      {
        $addFields: {
          member1: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$users',
                  as: 'u',
                  cond: { $eq: ['$$u._id', '$member1_id'] }
                }
              }, 0
            ]
          },
          member2: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$users',
                  as: 'u',
                  cond: { $eq: ['$$u._id', '$member2_id'] }
                }
              }, 0
            ]
          },
          created_by_user: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$users',
                  as: 'u',
                  cond: { $eq: ['$$u._id', '$created_by'] }
                }
              }, 0
            ]
          }
        }
      },
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
          _id: 1,
          member1: 1,
          member2: 1,
          chapter: {
            _id: 1,
            chapter_name: 1,
            chapter_code: 1
          },
          created_by_user: 1,
          image_url: 1,
          status: 1,
          meeting_date: 1,
          location: 1,
          discussion_points: 1,
          createdAt: 1,
          updatedAt: 1
        }
      }
    ]);
    if (!doc) return res.status(404).json({ message: 'Meeting not found' });
    res.status(200).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/updateone2onebyid/:id',
  updateOneToOneMeetingValidation,
  handleValidationErrors,
  mapNamesToIds,
  async (req, res) => {
    try {
      const updated = await OneToOneMeeting.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      if (!updated)
        return res.status(404).json({ message: 'Meeting not found' });
      res.status(200).json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.put('/updatebulkm2mstatusbyuserid',

  updateBulkM2MStatusValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { list } = req.body;

      const result = await OneToOneMeeting.updateMany(
        { $or: [{ member1_id: { $in: list } }, { member2_id: { $in: list } }] },
        { $set: { status: true } }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: 'No one-to-one meetings found for the provided users.' });
      }

      if (result.modifiedCount === 0) {
        return res.status(200).json({ message: `Found ${result.matchedCount} one-to-one meetings, but no changes were needed (status was already true).` });
      }

      res.status(200).json({ message: `Successfully updated ${result.modifiedCount} one-to-one meetings to status=true.` });
    } catch (e) {
      console.error('Error updating bulk one-to-one meeting status:', e);
      res.status(500).json({ error: e.message });
    }
  }
);

router.delete('/deleteone2onebyid/:id', idValidation, handleValidationErrors, async (req, res) => {
  try {
    const deleted = await OneToOneMeeting.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ message: 'Meeting not found' });
    res.status(200).json({ message: 'Meeting deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;