import express from "express";
import { 
    Membership, 
    User, 
    Attendance, 
    OneToOneMeeting, 
    Referral, 
    TYFTB,
    Meeting,
    MemberProfile,
    EarnedBadge
} from "../../schemas.mjs";
import { authenticateCookie } from "../../middlewares.mjs";

const router = express.Router();

router.get("/leaderboard", authenticateCookie, async (req, res) => {
    try {
        const chapterId = req.chapter._id;

        // 1. Get all active members in the chapter
        const memberships = await Membership.find({ 
            chapter_id: chapterId, 
            membership_status: true 
        }).populate('user_id', 'username');

        if (!memberships.length) {
            return res.status(200).json([]);
        }

        const userIds = memberships.map(m => m.user_id._id);

        // Fetch MemberProfiles for avatars and profile IDs
        const profiles = await MemberProfile.find({ user_id: { $in: userIds } }, '_id user_id profile_image_url company_name');
        const profileMap = {};
        profiles.forEach(p => {
            profileMap[p.user_id.toString()] = {
                profile_id: p._id.toString(),
                avatar: p.profile_image_url,
                company_name: p.company_name
            };
        });

        // Fetch historically earned badges
        const historicalBadges = await EarnedBadge.find({ user_id: { $in: userIds }, chapter_id: chapterId });
        const badgesMap = {};
        historicalBadges.forEach(b => {
            const uId = b.user_id.toString();
            if(!badgesMap[uId]) badgesMap[uId] = [];
            badgesMap[uId].push(b.badge_type);
        });

        // Current month bounds for filtering
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const endOfMonth = new Date(startOfMonth);
        endOfMonth.setMonth(endOfMonth.getMonth() + 1);

        // 2. Fetch stats using parallel Promise.all for incredible speed
        const [
            attendances,
            m2ms,
            referrals,
            tyfcbs,
            totalMeetings
        ] = await Promise.all([
            // Attendance
            Attendance.aggregate([
                { $match: { user_id: { $in: userIds }, attendance_status: 'present', date: { $gte: startOfMonth, $lt: endOfMonth } } },
                { $group: { _id: "$user_id", count: { $sum: 1 } } }
            ]),
            // M2M (Both members get points)
            OneToOneMeeting.aggregate([
                { $match: { meeting_date: { $gte: startOfMonth, $lt: endOfMonth } } },
                { $project: { members: ["$member1_id", "$member2_id"] } },
                { $unwind: "$members" },
                { $match: { members: { $in: userIds } } },
                { $group: { _id: "$members", count: { $sum: 1 } } }
            ]),
            // Referrals (Given by referrer)
            Referral.aggregate([
                { $match: { referrer_id: { $in: userIds }, created_at: { $gte: startOfMonth, $lt: endOfMonth } } },
                { $group: { _id: "$referrer_id", count: { $sum: 1 } } }
            ]),
            // TYFTB
            TYFTB.aggregate([
                { $match: { payer_id: { $in: userIds }, created_at: { $gte: startOfMonth, $lt: endOfMonth } } },
                { $group: { _id: "$payer_id", count: { $sum: 1 } } }
            ]),
            // Total meetings for attendance logic (for current month)
            Meeting.countDocuments({ chapter_id: chapterId, meeting_date: { $gte: startOfMonth, $lt: endOfMonth } })
        ]);

        // Helper to convert aggregation array to map
        const toMap = (arr) => {
            const map = {};
            arr.forEach(item => {
                map[item._id.toString()] = item.count;
            });
            return map;
        };

        const attMap = toMap(attendances);
        const m2mMap = toMap(m2ms);
        const refMap = toMap(referrals);
        const tybMap = toMap(tyfcbs);

        // 3. Calculate points for each user
        let leaderboard = memberships.map(m => {
            const uIdStr = m.user_id._id.toString();
            const attCount = attMap[uIdStr] || 0;
            const m2mCount = m2mMap[uIdStr] || 0;
            const refCount = refMap[uIdStr] || 0;
            const tybCount = tybMap[uIdStr] || 0;

            const points = (m2mCount * 10) + (refCount * 20) + (tybCount * 30) + (attCount * 50);

            const profileInfo = profileMap[uIdStr] || {};

            return {
                id: profileInfo.profile_id || uIdStr,
                user_id: uIdStr,
                name: m.user_id.username,
                avatar: profileInfo.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.user_id.username)}&background=random`,
                company: profileInfo.company_name || req.chapter?.chapter_name || "SIB Member",
                points,
                stats: {
                    attendance: attCount,
                    m2m: m2mCount,
                    referrals: refCount,
                    tyfcb: tybCount
                },
                badges: badgesMap[uIdStr] || []
            };
        });

        // 4. Sort by points descending
        leaderboard.sort((a, b) => b.points - a.points);
        
        // Apply ranks
        leaderboard.forEach((user, index) => {
            user.rank = index + 1;
        });

        res.status(200).json(leaderboard);
    } catch (err) {
        console.error("Gamification Error:", err);
        res.status(500).json({ error: "Failed to calculate gamification stats" });
    }
});

router.get("/my-badges", authenticateCookie, async (req, res) => {
    try {
        const userId = req.user._id;
        const badges = await EarnedBadge.find({ user_id: userId }).sort({ awarded_at: -1 });
        res.status(200).json(badges);
    } catch (err) {
        console.error("My Badges Error:", err);
        res.status(500).json({ error: "Failed to fetch badges" });
    }
});

router.get("/user-badges/:id", authenticateCookie, async (req, res) => {
    try {
        const userId = req.params.id; // User Object ID
        const badges = await EarnedBadge.find({ user_id: userId }).sort({ awarded_at: -1 });
        res.status(200).json(badges);
    } catch (err) {
        console.error("User Badges Error:", err);
        res.status(500).json({ error: "Failed to fetch user badges" });
    }
});

import { manuallyTriggerBadgeAwards } from "../../utils/cronJobs.mjs";

router.post("/test-award-badges", async (req, res) => {
    try {
        await manuallyTriggerBadgeAwards();
        res.status(200).json({ message: "Badges awarded successfully!" });
    } catch (err) {
        console.error("Test Award Badges Error:", err);
        res.status(500).json({ error: "Failed to award badges" });
    }
});

export default router;
