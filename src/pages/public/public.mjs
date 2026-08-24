import express from 'express';
import { MemberProfile, Vertical, Chapter, Region, Referral, Membership, TYFTB, Meeting, Event, OneToOneMeeting } from '../../schemas.mjs';
import mongoose from 'mongoose';

const Public = express.Router();

Public.get('/getallprofiles', async (req, res) => {
  try {
    const { region, chapter, vertical, sort, search } = req.query;

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
        createdAt: 1,
        membership_status: 1
      }
    });

    const docs = await MemberProfile.aggregate(pipeline);

    res.status(200).json(docs);
  } catch (err) {
    console.error('Error in /getallprofiles:', err);
    res.status(500).json({ error: err.message });
  }
});

Public.get('/getallverticals', async (req, res) => {
  try {
    const verticals = await Vertical.find().sort({ created_at: -1 }).select("vertical_name");
    const verticalNames = verticals.map(v => v.vertical_name);
    res.status(200).json(verticalNames);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

Public.get('/getallchapternames', async (req, res) => {
  try {
    const chapters = await Chapter.find().sort({ founded_date: -1 }).select('chapter_name');
    const chapterNames = chapters.map(ch => ch.chapter_name);
    res.status(200).json(chapterNames);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

Public.get('/getallregions', async (req, res) => {
  try {
    const regions = await Region.find().sort({ created_at: -1 }).select('region_name');
    const regionNames = regions.map(r => r.region_name);
    res.status(200).json(regionNames);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

Public.get('/stats', async (req, res) => {
  try {
    const { time } = req.query; // all, year, month, week
    let dateFilter = {};
    if (time && time !== 'all') {
      const now = new Date();
      let fromDate;
      if (time === 'year') {
      fromDate = new Date(now);
      fromDate.setFullYear(now.getFullYear() - 1);
      } else if (time === 'month') {
      fromDate = new Date(now);
      fromDate.setDate(now.getDate() - 30);
      } else if (time === 'week') {
      fromDate = new Date(now);
      fromDate.setDate(now.getDate() - 7);
      }
      if (fromDate) {
      dateFilter = { createdAt: { $gte: fromDate } };
      }
    }

    const verticalcount = await Vertical.countDocuments(dateFilter);
    const referralcount = await Referral.countDocuments(dateFilter);
    const membershipcount = await Membership.countDocuments(dateFilter);
    const chaptercount = await Chapter.countDocuments(dateFilter);
    const regioncount = await Region.countDocuments(dateFilter);


    const results = await TYFTB.aggregate([
      {
        $match: {
          ...dateFilter
        }
      },
      {
        $group: {
          _id: null,
          totalBusinessAmount: {
            $sum: '$business_amount'
          }
        }
      }
    ]);

    const totalRevenue = parseInt(results[0]?.totalBusinessAmount ?? 0, 10);

    res.status(200).json({
      verticalcount,
      referralcount,
      membershipcount,
      chaptercount,
      bussinessamount: totalRevenue,
      regioncount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

Public.get('/getprofilebyid/:id', async (req, res) => {
  try {
    const profileId = req.params.id;

    if (!profileId) {
      return res.status(400).json({ error: 'Missing profile_id or user_id' });
    }

    if (!mongoose.Types.ObjectId.isValid(profileId)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

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
          user: {
            _id: "$user._id",
            username: "$user.username",
            email: "$user.email"
          },
          verticals: {
            $cond: {
              if: { $isArray: "$verticals" },
              then: {
                $map: {
                  input: "$verticals",
                  as: "v",
                  in: {
                    _id: "$$v._id",
                    vertical_name: "$$v.vertical_name"
                  }
                }
              },
              else: []
            }
          },
          chapter_name: "$chapter.chapter_name"
        }
      }
    ]);

    if (!doc) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    doc.vertical_names = Array.isArray(doc.verticals)
      ? doc.verticals.map(v => v.vertical_name)
      : [];

    doc.chaptername = doc.chapter_name || null;

    // Ensure all fields exist and match the sample response
    const response = {
      _id: doc._id,
      display_name: doc.display_name ?? null,
      profile_image_url: doc.profile_image_url ?? null,
      company_phone: doc.company_phone ?? null,
      company_email: doc.company_email ?? null,
      company_address: doc.company_address ?? null,
      personal_address: doc.personal_address ?? null,
      dob: doc.dob ?? null,
      wedding_date: doc.wedding_date ?? null,
      blood_group: doc.blood_group ?? null,
      vagai_category: doc.vagai_category ?? null,
      kulam_category: doc.kulam_category ?? null,
      native_place: doc.native_place ?? null,
      kuladeivam: doc.kuladeivam ?? null,
      company_name: doc.company_name ?? "",
      years_in_business: doc.years_in_business ?? 0,
      annual_turnover: doc.annual_turnover ?? 0,
      website: doc.website ?? "",
      services: doc.services ?? [],
      ideal_referral: doc.ideal_referral ?? "",
      bio: doc.bio ?? "",
      elevator_pitch_30s: doc.elevator_pitch_30s ?? null,
      why_sib: doc.why_sib ?? null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      user: {
        _id: doc.user?._id ?? null,
        username: doc.user?.username ?? null,
        email: doc.user?.email ?? null
      },
      verticals: doc.verticals ?? [],
      chapter_name: doc.chapter_name ?? null,
      vertical_names: doc.vertical_names ?? [],
      chaptername: doc.chaptername ?? null
    };

    res.status(200).json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

Public.get('/showprofile',
  async (req, res) => {
    res.send({ editable:false })
  }
);

Public.get('/getmeetings',  async (req, res) => {
  try {
    const docs = await Meeting.aggregate([
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
    console.error('Error in /getmeetings:', err);
    res.status(500).json({ error: err.message });
  }
});

Public.get('/getallevents', async (_, res) => {
    try {
        const docs = await Event.aggregate([
            { $sort: { event_date: -1 } },
            { $lookup: { from: 'chapters', localField: 'chapter_id', foreignField: '_id', as: 'chapter' } },
            { $unwind: { path: '$chapter', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    event_title: 1,
                    event_description: 1,
                    event_date: 1,
                    event_time: 1,
                    location: 1,
                    organizer_company: 1,
                    event_type: 1,
                    event_status: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    chapter: { _id: 1, chapter_name: 1, chapter_code: 1 },
                }
            }
        ]);
        res.status(200).json(docs);
    } catch (err) {
      console.error('Error in /getallevents:', err);
        res.status(500).json({ error: err.message });
    }
});

Public.get('/getm2mslips', async (_, res) => {
  try {
    const docs = await OneToOneMeeting.aggregate([
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
          member1: { _id: 1, username: 1, email: 1 },
          member2: { _id: 1, username: 1, email: 1 },
          chapter: { _id: 1, chapter_name: 1, chapter_code: 1 },
          created_by_user: { _id: 1, username: 1, email: 1 },
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
    res.status(200).json(docs);
  } catch (err) {
    console.error('Error in /getm2mslips:', err);
    res.status(500).json({ error: err.message });
  }
});

Public.get('/app-version', (req, res) => {
  const iosMinRequiredBuild = parseInt(process.env.IOS_MIN_REQUIRED_BUILD || "1", 10);
  const iosMinRequiredVersion = process.env.IOS_MIN_REQUIRED_VERSION || "1.0.0";
  const androidMinRequiredBuild = parseInt(process.env.ANDROID_MIN_REQUIRED_BUILD || "1", 10);
  const androidMinRequiredVersion = process.env.ANDROID_MIN_REQUIRED_VERSION || "1.0.0";
  
  // Keep legacy variables for backwards compatibility during rollout
  const minRequiredBuild = androidMinRequiredBuild; 
  const minRequiredVersion = androidMinRequiredVersion;

  const playstoreUrl = process.env.PLAYSTORE_URL || "https://play.google.com/store/apps/details?id=com.senguntharinbusiness";
  const appstoreUrl = process.env.APPSTORE_URL || "https://apps.apple.com/app/sib/id__YOUR_APP_ID__";
  
  res.status(200).json({
    iosMinRequiredBuild,
    iosMinRequiredVersion,
    androidMinRequiredBuild,
    androidMinRequiredVersion,
    minRequiredBuild,
    minRequiredVersion,
    playstoreUrl,
    appstoreUrl
  });
});

Public.get('/upcoming-celebrations', async (req, res) => {
  try {
    const pipeline = [
      {
        $match: {
          $or: [
            { dob: { $ne: null } },
            { wedding_date: { $ne: null } }
          ]
        }
      },
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
          _id: 1,
          memberName: { $ifNull: ["$display_name", "$user.username"] },
          profileImage: "$profile_image_url",
          chapterName: "$chapter.chapter_name",
          userId: "$user._id",
          dob: 1,
          wedding_date: 1
        }
      }
    ];

    const profiles = await MemberProfile.aggregate(pipeline);
    
    const events = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const todayStart = new Date(currentYear, now.getMonth(), now.getDate()).getTime();
    // Get celebrations for the next 30 days
    const daysAhead = 30 * 24 * 60 * 60 * 1000;
    const futureLimit = todayStart + daysAhead;

    profiles.forEach(p => {
      if (p.dob) {
        const dobDate = new Date(p.dob);
        let nextBirthday = new Date(currentYear, dobDate.getMonth(), dobDate.getDate());
        
        if (nextBirthday.getTime() < todayStart) {
          nextBirthday = new Date(currentYear + 1, dobDate.getMonth(), dobDate.getDate());
        }

        if (nextBirthday.getTime() <= futureLimit) {
          events.push({
            id: p._id.toString() + '-b',
            profileId: p._id.toString(),
            userId: p.userId ? p.userId.toString() : "",
            memberName: p.memberName,
            chapterName: p.chapterName,
            type: 'birthday',
            profileImage: p.profileImage || "",
            targetDate: nextBirthday.toISOString()
          });
        }
      }

      if (p.wedding_date) {
        const weddingDate = new Date(p.wedding_date);
        let nextAnniversary = new Date(currentYear, weddingDate.getMonth(), weddingDate.getDate());
        
        if (nextAnniversary.getTime() < todayStart) {
          nextAnniversary = new Date(currentYear + 1, weddingDate.getMonth(), weddingDate.getDate());
        }

        if (nextAnniversary.getTime() <= futureLimit) {
          events.push({
            id: p._id.toString() + '-a',
            profileId: p._id.toString(),
            userId: p.userId ? p.userId.toString() : "",
            memberName: p.memberName,
            chapterName: p.chapterName,
            type: 'anniversary',
            profileImage: p.profileImage || "",
            targetDate: nextAnniversary.toISOString()
          });
        }
      }
    });

    events.sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());

    res.status(200).json(events);
  } catch (err) {
    console.error('Error in /upcoming-celebrations:', err);
    res.status(500).json({ error: err.message });
  }
});

export default Public;