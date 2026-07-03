import express from "express";
import { 
    Membership, 
    User, 
    Attendance, 
    OneToOneMeeting, 
    Referral, 
    TYFTB,
    Meeting,
    MemberProfile
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
            // M2M
            OneToOneMeeting.aggregate([
                { $match: { created_by: { $in: userIds }, status: true, meeting_date: { $gte: startOfMonth, $lt: endOfMonth } } },
                { $group: { _id: "$created_by", count: { $sum: 1 } } }
            ]),
            // Referrals
            Referral.aggregate([
                { $match: { created_by: { $in: userIds }, status: true, created_at: { $gte: startOfMonth, $lt: endOfMonth } } },
                { $group: { _id: "$created_by", count: { $sum: 1 } } }
            ]),
            // TYFTB
            TYFTB.aggregate([
                { $match: { payer_id: { $in: userIds }, status: true, created_at: { $gte: startOfMonth, $lt: endOfMonth } } },
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
                badges: []
            };
        });

        // 4. Sort by points descending
        leaderboard.sort((a, b) => b.points - a.points);
        
        // Apply ranks
        leaderboard.forEach((user, index) => {
            user.rank = index + 1;
        });

        // 5. Calculate Highest Badges
        const maxRef = Math.max(...leaderboard.map(u => u.stats.referrals), 0);
        const maxM2M = Math.max(...leaderboard.map(u => u.stats.m2m), 0);
        const maxTyb = Math.max(...leaderboard.map(u => u.stats.tyfcb), 0);

        leaderboard.forEach(user => {
            if (user.stats.referrals === maxRef && maxRef > 0) user.badges.push({ type: 'highest_referral', label: 'Highest Referrals' });
            if (user.stats.m2m === maxM2M && maxM2M > 0) user.badges.push({ type: 'highest_m2m', label: 'Highest M2M' });
            if (user.stats.tyfcb === maxTyb && maxTyb > 0) user.badges.push({ type: 'highest_tyb', label: 'Highest TYB' });
            
            // 100% Attendance Logic
            if (user.stats.attendance > 0 && user.stats.attendance >= totalMeetings) {
                user.badges.push({ type: 'perfect_attendance', label: '100% Attendance', value: '2x' }); // Mocking the '2x' for now since we count all meetings
            }
        });

        res.status(200).json(leaderboard);
    } catch (err) {
        console.error("Gamification Error:", err);
        res.status(500).json({ error: "Failed to calculate gamification stats" });
    }
});

export default router;
