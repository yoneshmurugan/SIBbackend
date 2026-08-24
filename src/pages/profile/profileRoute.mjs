import express from 'express';
import mongoose from 'mongoose';
import { MemberProfile, User, Chapter, Membership, Vertical } from '../../schemas.mjs';
import { idValidation, createProfileValidation, updateProfileValidation, searchUserValidator } from '../../validators.mjs';
import { handleValidationErrors, mapNamesToIds, mapverticalIds } from '../../middlewares.mjs';
import pageRouter from './profilepagereqiests.mjs';

const router = express.Router();
router.use(pageRouter);

router.post(
  '/createprofile',
  mapNamesToIds,
  createProfileValidation,
  handleValidationErrors,
  mapverticalIds,
  async (req, res) => {
    try {
      const chapter = await Chapter.findById(req.chapter._id);
      if (!chapter) {
        return res.status(404).json({ error: "Chapter not found." });
      }
      req.body.chapter_id = chapter._id;
      req.body.region_id = chapter.region_id;
      req.body.user_id = req.userid
      if (req.body.vertical_ids && !Array.isArray(req.body.vertical_ids)) {
        req.body.vertical_ids = [req.body.vertical_ids];
      }
      const doc = new MemberProfile(req.body);
      const saved = await doc.save();
      res.status(201).json(saved);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.get('/getallprofiles', async (req, res) => {
  try {
    const { region, chapter, vertical, sort, search, myChapterOnly } = req.query;

    const pipeline = [];

    pipeline.push(
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
          from: 'memberships',
          localField: 'user_id',
          foreignField: 'user_id',
          as: 'membership'
        }
      },
      { $unwind: { path: '$membership', preserveNullAndEmptyArrays: true } },
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
          from: 'regions',
          localField: 'region_id',
          foreignField: '_id',
          as: 'region'
        }
      },
      { $unwind: { path: '$region', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'verticals',
          localField: 'vertical_ids',
          foreignField: '_id',
          as: 'verticals'
        }
      }
    );

    pipeline.push({
      $addFields: {
        chapter_name: '$chapter.chapter_name',
        region_name: '$region.region_name',
        vertical_names: {
          $map: { input: "$verticals", as: "v", in: "$$v.vertical_name" }
        },
        username: '$user.username',
        membership_status: '$membership.membership_status'
      }
    });

    const matchStage = {};

    if (region && region !== "All Regions") {
      matchStage.region_name = { $regex: `^${region}$`, $options: 'i' };
    }

    if (chapter && chapter !== "All Chapters") {
      matchStage.chapter_name = { $regex: `^${chapter}$`, $options: 'i' };
    }

    if (vertical && vertical !== "All Verticals") {
      matchStage.vertical_names = { $regex: `^${vertical}$`, $options: 'i' };
    }

    if (myChapterOnly === "true") {
      const user_id = req.user?.uid;
      if (!user_id) {
        return res.status(400).json({ error: "Missing user id." });
      }

      const userObj = await User.findOne({ user_id });
      if (!userObj || !userObj._id) {
        return res.status(404).json({ error: "User not found with UID" });
      }

      const membership = await Membership.findOne({ user_id: userObj._id });
      if (!membership || !membership.chapter_id) {
        return res.status(404).json({ error: "Membership or chapter not found." });
      }
      matchStage.chapter_id = new mongoose.Types.ObjectId(membership.chapter_id);
    }

    if (search && search.trim() !== "") {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      matchStage.$or = [
        { display_name: searchRegex },
        { username: searchRegex },
        { company_name: searchRegex },
        { company_email: searchRegex },
        { native_place: searchRegex },
        { chapter_name: searchRegex },
        { region_name: searchRegex },
        { vertical_names: searchRegex },
        { services: searchRegex }
      ];
    }

    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    let sortConfig = { createdAt: -1 };

    if (sort === "Name A-Z") {
      sortConfig = { username: 1 };
    } else if (sort === "Name Z-A") {
      sortConfig = { username: -1 };
    } else if (sort === "Chapter") {
      sortConfig = { chapter_name: 1, username: 1 };
    } else if (sort === "Region") {
      sortConfig = { region_name: 1, username: 1 };
    }

    pipeline.push({ $sort: sortConfig });

    pipeline.push({
      $project: {
        _id: 1,
        display_name: 1,
        profile_image_url: 1,
        company_phone: 1,
        company_email: 1,
        company_address: 1,
        blood_group: 1,
        vagai_category: 1,
        kulam_category: 1,
        native_place: 1,
        kuladeivam: 1,
        company_name: 1,
        user: {
          _id: "$user._id",
          username: "$username"
        },
        verticals: "$vertical_names",
        chapter: "$chapter_name",
        region: "$region_name",
        services: 1,
        createdAt: 1
      }
    });

    const docs = await MemberProfile.aggregate(pipeline);

    res.status(200).json(docs);
  } catch (err) {
    console.error('Error in /getallprofiles:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/getallprofiles', async (req, res) => {
  try {
    const docs = await MemberProfile.aggregate([
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
          from: 'verticals',
          localField: 'vertical_ids',
          foreignField: '_id',
          as: 'verticals'
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
      {
        $lookup: {
          from: 'regions',
          localField: 'region_id',
          foreignField: '_id',
          as: 'region'
        }
      },
      {
        $addFields: {
          chapter: { $ifNull: [{ $arrayElemAt: ["$chapter.chapter_name", 0] }, null] },
          region: { $ifNull: [{ $arrayElemAt: ["$region.region_name", 0] }, null] },
          verticals: { $ifNull: [{ $arrayElemAt: ["$verticals.vertical_name", 0] }, null] },
          user: {
            $cond: {
              if: { $isArray: ["$user"] },
              then: null,
              else: {
                _id: "$user._id",
                username: "$user.username"
              }
            }
          }
        }
      },
      {
        $project: {
          display_name: 1,
          profile_image_url: 1,
          company_phone: 1,
          company_email: 1,
          company_address: 1,
          blood_group: 1,
          vagai_category: 1,
          kulam_category: 1,
          native_place: 1,
          kuladeivam: 1,
          company_name: 1,
          user: 1,
          verticals: 1,
          services: 1,
          chapter: 1,
          region: 1
        }
      }
    ]);
    res.status(200).json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/getprofile', async (req, res) => {
  try {
    
    const chapter = await Chapter.findById(req.chapter._id);

    const [doc] = await MemberProfile.aggregate([
      { $match: { user_id: req.userid } },
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
          from: 'chapter_memberships',
          localField: 'user_id',
          foreignField: 'user_id',
          as: 'membership'
        }
      },
      { $unwind: { path: '$membership', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'verticals',
          localField: 'vertical_ids',
          foreignField: '_id',
          as: 'verticals'
        }
      },
      {
        $project: {
          _id: 1,
          display_name: 1,
          profile_image_url: 1,
          company_phone: 1,
          company_email: 1,
          company_address: 1,
          personal_address: 1,
          dob: 1,
          wedding_date: 1,
          blood_group: 1,
          vagai_category: 1,
          kulam_category: 1,
          native_place: 1,
          kuladeivam: 1,
          company_name: 1,
          years_in_business: 1,
          annual_turnover: 1,
          website: 1,
          services: 1,
          ideal_referral: 1,
          bio: 1,
          elevator_pitch_30s: 1,
          why_sib: 1,
          createdAt: 1,
          updatedAt: 1,
          user: { _id: 1, name: 1, email: 1, username: 1 },
          verticals: { vertical_name: 1 },
          membership: { idno: 1 }
        }
      }
    ]);

    if (!doc) return res.status(200).json({ message: 'Profile not found' });

    if (doc.verticals) {
      doc.vertical_names = doc.verticals.map(v => v.vertical_name)
    } else {
      doc.vertical_names = [];
    }

    doc.chaptername = chapter ? chapter.chapter_name : null;

    res.status(200).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/getprofilebyid/:id', async (req, res) => {
  try {
    const profileId = req.params.id;

    if (!profileId) {
      return res.status(400).json({ error: 'Missing profile_id or user_id' });
    }

    if (!mongoose.Types.ObjectId.isValid(profileId)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const chapter = await Chapter.findById(req.chapter._id);

    const [doc] = await MemberProfile.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(profileId) } },

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
          from: 'verticals',
          localField: 'vertical_ids',
          foreignField: '_id',
          as: 'verticals'
        }
      },

      {
        $project: {
          _id: 1,
          display_name: 1,
          profile_image_url: 1,
          company_phone: 1,
          company_email: 1,
          company_address: 1,
          personal_address: 1,
          dob: 1,
          wedding_date: 1,
          blood_group: 1,
          vagai_category: 1,
          kulam_category: 1,
          native_place: 1,
          kuladeivam: 1,
          company_name: 1,
          years_in_business: 1,
          annual_turnover: 1,
          website: 1,
          services: 1,
          ideal_referral: 1,
          bio: 1,
          elevator_pitch_30s: 1,
          why_sib: 1,
          createdAt: 1,
          updatedAt: 1,
          user: { _id: 1, name: 1, email: 1, username: 1 },
          verticals: { vertical_name: 1 }
        }
      }
    ]);

    if (!doc) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    if (doc.verticals) {
      doc.vertical_names = doc.verticals.map(v => v.vertical_name)
    } else {
      doc.vertical_names = [];
    }

    doc.chaptername = chapter ? chapter.chapter_name : null;

    res.status(200).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put(
  '/updateprofile',
  updateProfileValidation,
  handleValidationErrors,

  mapNamesToIds,
  mapverticalIds,
  async (req, res) => {
    try {
      
      const userProfile = await MemberProfile.findOne({ user_id: req.userid });

      if (!userProfile) {
        return res.status(404).json({ error: "User profile not found" });
      }

      if (req.body.vertical_ids && !Array.isArray(req.body.vertical_ids)) {
        req.body.vertical_ids = [req.body.vertical_ids];
      }
      const updated = await MemberProfile.findByIdAndUpdate(
        userProfile._id,
        req.body,
        { new: true, runValidators: true }
      );
      if (!updated)
        return res.status(404).json({ message: 'Profile not found' });
      res.status(200).json(updated);
    } catch (err) {
      console.log(err)
      res.status(500).json({ error: err.message });
    }
  }
);

router.delete(
  '/deleteprofilebyid/:id',

  idValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const deleted = await MemberProfile.findByIdAndDelete(req.params.id);
      if (!deleted)
        return res.status(404).json({ message: 'Profile not found' });
      res.status(200).json({ message: 'Profile deleted successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.post(
  '/searchvertical',
  searchUserValidator,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { substr } = req.body;

      if (!substr || substr.trim() === "") {
        return res.status(400).json({ error: "Search substring required." });
      }

      const matchedChapters = await Vertical.find({
        vertical_name: { $regex: substr.trim(), $options: "i" }
      })
        .select("vertical_name")
        .limit(10);

      return res.status(200).json({
        results: matchedChapters.map(c => (c.vertical_name))
      });
    } catch (error) {
      return res.status(500).json({ error: "Internal Server Error." });
    }
  }
);

export default router;
