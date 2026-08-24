import router from "./CoordinatorRoute.mjs";
import RegionRouter from "./regions/regionRoute.mjs";
import VerticalRouter from './verticals/verticalRoute.mjs'
import express from 'express'
import { Chapter, Membership, OneToOneMeeting, Referral, TYFTB, Vertical, Region, User } from "../../schemas.mjs";
import admin from "../Auth/firebase.mjs";

const AdminRouter = express.Router();

AdminRouter.use('/region', RegionRouter)
AdminRouter.use('/vertical', VerticalRouter)
AdminRouter.use('/coordinator', router)

AdminRouter.get('/chapter-performance', async (req, res) => {
    try {
        const time = req.query.time || 'all_time'; // 'month', 'week', 'year'
        let dateFilter = {};

        if (time === 'year') {
            const lastYear = new Date();
            lastYear.setFullYear(lastYear.getFullYear() - 1);
            dateFilter = { $gte: lastYear };
        } else if (time === 'month') {
            const lastMonth = new Date();
            lastMonth.setDate(lastMonth.getDate() - 30);
            dateFilter = { $gte: lastMonth };
        } else if (time === 'week') {
            const lastWeek = new Date();
            lastWeek.setDate(lastWeek.getDate() - 7);
            dateFilter = { $gte: lastWeek };
        }

        const addDateMatch = (pipeline, dateField) => {
            if (time !== 'all_time') {
                pipeline.unshift({ $match: { [dateField]: dateFilter } });
            }
            return pipeline;
        };

        const [chapters, members, referrals, m2ms, tyftbs] = await Promise.all([
            Chapter.aggregate([
                {
                    $lookup: {
                        from: 'regions',
                        localField: 'region_id',
                        foreignField: '_id',
                        as: 'region'
                    }
                },
                { $unwind: '$region' },
                {
                    $project: {
                        chapter_name: 1,
                        'region.region_name': 1
                    }
                }
            ]),
            Membership.aggregate([
                {
                    $group: {
                        _id: '$chapter_id',
                        total_members: { $sum: 1 }
                    }
                }
            ]),
            Referral.aggregate(
                addDateMatch([
                    {
                        $lookup: {
                            from: 'chapter_memberships',
                            localField: 'referrer_id',
                            foreignField: 'user_id',
                            as: 'referrer'
                        }
                    },
                    { $unwind: '$referrer' },
                    {
                        $group: {
                            _id: '$referrer.chapter_id',
                            total_referrals: { $sum: 1 }
                        }
                    }
                ], 'createdAt')
            ),
            OneToOneMeeting.aggregate(
                addDateMatch([
                    {
                        $lookup: {
                            from: 'chapter_memberships',
                            localField: 'member1_id',
                            foreignField: 'user_id',
                            as: 'member'
                        }
                    },
                    { $unwind: '$member' },
                    {
                        $group: {
                            _id: '$member.chapter_id',
                            total_m2m: { $sum: 1 }
                        }
                    }
                ], 'createdAt')
            ),
            TYFTB.aggregate(
                addDateMatch([
                    {
                        $lookup: {
                            from: 'chapter_memberships',
                            localField: 'payer_id',
                            foreignField: 'user_id',
                            as: 'payer'
                        }
                    },
                    { $unwind: '$payer' },
                    {
                        $group: {
                            _id: '$payer.chapter_id',
                            total_business_amount: { $sum: '$business_amount' }
                        }
                    }
                ], 'createdAt')
            )
        ]);
        res.status(200).json({ chapters, members, referrals, m2ms, tyftbs });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

AdminRouter.get('/chapter-performance/:id', async (req, res) => {
    try {
        const time = req.query.time || 'all_time'; // 'month', 'week', 'year'
        let dateFilter = {};

        const chapterId = req.params.id;

        if (time === 'year') {
            const lastYear = new Date();
            lastYear.setFullYear(lastYear.getFullYear() - 1);
            dateFilter = { $gte: lastYear };
        } else if (time === 'month') {
            const lastMonth = new Date();
            lastMonth.setDate(lastMonth.getDate() - 30);
            dateFilter = { $gte: lastMonth };
        } else if (time === 'week') {
            const lastWeek = new Date();
            lastWeek.setDate(lastWeek.getDate() - 7);
            dateFilter = { $gte: lastWeek };
        }

        const addDateMatch = (pipeline, dateField) => {
            if (time !== 'all_time') {
                pipeline.unshift({ $match: { [dateField]: dateFilter } });
            }
            return pipeline;
        };

        // Get chapter info
        const chapter = await Chapter.findById(chapterId).select('chapter_name region_id');
        if (!chapter) {
            return res.status(404).json({ error: 'Chapter not found' });
        }

        // Get region info
        const region = await Region.findById(chapter.region_id).select('region_name');

        // Get member count
        const members = await Membership.countDocuments({ chapter_id: chapterId });

        // Get referrals count
        const referralsAgg = await Referral.aggregate(
            addDateMatch([
                {
                    $lookup: {
                        from: 'chapter_memberships',
                        localField: 'referrer_id',
                        foreignField: 'user_id',
                        as: 'referrer'
                    }
                },
                { $unwind: '$referrer' },
                { $project : { chapter_id: 1, 'referrer.chapter_id': 1 } },
            ], 'createdAt')
        );

        const referrals = referralsAgg.filter(r => r.referrer.chapter_id.toString() === chapterId).length;

        // Get m2m count
        const m2msAgg = await OneToOneMeeting.aggregate(
            addDateMatch([
                {
                    $lookup: {
                        from: 'chapter_memberships',
                        localField: 'member1_id',
                        foreignField: 'user_id',
                        as: 'member'
                    }
                },
                { $unwind: '$member' },
                { $project : { chapter_id: 1, 'member.chapter_id': 1 } },
            ], 'createdAt')
        );
        const m2ms = m2msAgg.filter(m => m.member.chapter_id.toString() === chapterId).length;

        // Get TYFTB business amount
        const tyftbsAgg = await TYFTB.aggregate(
            addDateMatch([
                {
                    $lookup: {
                        from: 'chapter_memberships',
                        localField: 'payer_id',
                        foreignField: 'user_id',
                        as: 'payer'
                    }
                },
                { $unwind: '$payer' },
                { $project : { chapter_id: 1, 'payer.chapter_id': 1, business_amount: 1 } },
            ], 'createdAt')
        );
        const tyftbs = tyftbsAgg
            .filter(t => t.payer.chapter_id.toString() === chapterId)
            .reduce((sum, t) => sum + (t.business_amount ? Number(t.business_amount) : 0), 0);

        res.status(200).json({
            chapter: {
                id: chapterId,
                name: chapter.chapter_name,
                region: region?.region_name ?? null
            },
            members,
            referrals,
            m2ms,
            tyftbs
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

AdminRouter.get('/stats', async (_req, res) => {
    try {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);

        const tyftbTotal = await TYFTB.aggregate([
            {
                $group: {
                    _id: null,
                    totalBusinessAmount: { $sum: '$business_amount' }
                }
            }
        ]);
        const totalRevenue = parseInt(tyftbTotal[0]?.totalBusinessAmount ?? 0, 10);

        const referralCount = await Referral.countDocuments();

        const tyftbMonthly = await TYFTB.aggregate([
            {
                $match: {
                    createdAt: { $gte: start }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    totalBusinessAmount: { $sum: '$business_amount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        const referralMonthly = await Referral.aggregate([
            {
                $match: {
                    createdAt: { $gte: start }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const report = [];
        for (let i = 0; i < 12; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;

            const tyftb = tyftbMonthly.find(
                r => r._id.year === year && r._id.month === month
            );
            const referral = referralMonthly.find(
                r => r._id.year === year && r._id.month === month
            );

            report.push({
                month: `${monthNames[month - 1]} ${year}`,
                tyftbCount: tyftb ? tyftb.count : 0,
                referralCount: referral ? referral.count : 0,
                totalBusinessAmount: tyftb ? tyftb.totalBusinessAmount : 0
            });
        }

        res.status(200).json({
            referralCount,
            tyftbTotal: totalRevenue,
            last12MonthsReport: report
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

AdminRouter.get('/chapter-revenue', async (req, res) => {
    try {
        const chaptersRevenue = await TYFTB.aggregate([
            {
                $lookup: {
                    from: 'chapter_memberships',
                    localField: 'payer_id',
                    foreignField: 'user_id',
                    as: 'payer'
                }
            },
            { $unwind: '$payer' },
            {
                $lookup: {
                    from: 'chapters',
                    localField: 'payer.chapter_id',
                    foreignField: '_id',
                    as: 'chapter'
                }
            },
            { $unwind: '$chapter' },
            {
                $group: {
                    _id: '$chapter._id',
                    chapter_name: { $first: '$chapter.chapter_name' },
                    total_business_amount: { $sum: '$business_amount' }
                }
            },
            {
                $project: {
                    chapter_name: 1,
                    total_business_amount: 1,
                    _id: 0
                }
            }
        ]);
        res.status(200).json(chaptersRevenue);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

AdminRouter.delete('/user', async (req, res) => {
    try {
        const userId = req.query.userId;
        if (!userId) {
            return res.status(400).json({ error: 'userId query parameter is required' });
        }

        const membership = await Membership.findById(userId).populate('user_id');
        if (!membership || !membership.user_id) {
            return res.status(404).json({ error: 'Membership or user not found' });
        }

        const user = membership.user_id;

        await User.findByIdAndDelete(user._id);

        if (user.user_id) {
            try {
                await admin.auth().deleteUser(user.user_id);
            } catch (firebaseErr) {
                if (firebaseErr.code !== 'auth/user-not-found') {
                    throw firebaseErr;
                }
            }
        }

        await Membership.findByIdAndDelete(userId);

        res.status(200).json({ message: 'User and related data deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


AdminRouter.put('/blockuser', async (req, res) => {
    try {
        const { userIds, block } = req.body;
        if (!Array.isArray(userIds)) {
            return res.status(400).json({ error: 'userIds must be an array' });
        }

        for (const id of userIds) {
            const membership = await Membership.findById(id).populate('user_id');
            if (membership && membership.user_id) {
                const user = membership.user_id;
                
                membership.membership_status = !block;
                await membership.save();

                user.status = !block;
                await user.save();

                if (user.user_id) {
                    try {
                        await admin.auth().updateUser(user.user_id, { disabled: block });
                    } catch (firebaseErr) {
                        console.error("Firebase update failed for", user.user_id, firebaseErr);
                    }
                }
            }
        }
        res.status(200).json({ message: `Successfully ${block ? 'suspended' : 'reactivated'} users.` });
    } catch (error) {
        console.error("Error in /blockuser:", error);
        res.status(500).json({ error: error.message });
    }
});


AdminRouter.put('/change-username', async (req, res) => {
  try {
    const { user_id, new_username } = req.body;
    
    if (!user_id || !new_username) {
      return res.status(400).json({ error: "user_id and new_username are required" });
    }

    if (new_username.length > 50) {
      return res.status(400).json({ error: "Username must be 50 characters or less" });
    }

    // Check if new_username is already taken by another user (case-insensitive)
    const existingUser = await User.findOne({ 
      username: { $regex: new RegExp('^' + new_username + '$', 'i') } 
    });

    if (existingUser && existingUser._id.toString() !== user_id) {
      return res.status(409).json({ error: "Username is already taken by another member" });
    }

    // Update the user
    const updatedUser = await User.findByIdAndUpdate(
      user_id,
      { username: new_username },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ message: "Username successfully updated", user: updatedUser });
  } catch (error) {
    console.error("Error changing username:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default AdminRouter;
