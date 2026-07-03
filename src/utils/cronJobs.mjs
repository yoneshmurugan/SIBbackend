import { 
    MemberProfile, User, Chapter, Membership, Attendance, 
    OneToOneMeeting, Referral, TYFTB, Meeting, EarnedBadge 
} from '../schemas.mjs';
import { sendPushNotification } from './fcmHelper.mjs';

const calculateAndAwardMonthlyBadges = async () => {
    try {
        console.log("Running monthly badge award job...");
        
        // Target the previous month
        const now = new Date();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth(), 1); // 1st of current month (00:00:00)
        const startOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1); // 1st of previous month
        
        const targetMonth = startOfMonth.getMonth() + 1;
        const targetYear = startOfMonth.getFullYear();
        
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const monthName = monthNames[targetMonth - 1];

        const chapters = await Chapter.find({ chapter_status: true });
        
        for (const chapter of chapters) {
            const memberships = await Membership.find({ 
                chapter_id: chapter._id, 
                membership_status: true 
            }).populate('user_id', 'username');

            if (!memberships.length) continue;

            const userIds = memberships.map(m => m.user_id._id);

            const [
                attendances,
                m2ms,
                referrals,
                tyfcbs,
                totalMeetings
            ] = await Promise.all([
                Attendance.aggregate([
                    { $match: { user_id: { $in: userIds }, attendance_status: 'present', date: { $gte: startOfMonth, $lt: endOfMonth } } },
                    { $group: { _id: "$user_id", count: { $sum: 1 } } }
                ]),
                OneToOneMeeting.aggregate([
                    { $match: { meeting_date: { $gte: startOfMonth, $lt: endOfMonth } } },
                    { $project: { members: ["$member1_id", "$member2_id"] } },
                    { $unwind: "$members" },
                    { $match: { members: { $in: userIds } } },
                    { $group: { _id: "$members", count: { $sum: 1 } } }
                ]),
                Referral.aggregate([
                    { $match: { referrer_id: { $in: userIds }, created_at: { $gte: startOfMonth, $lt: endOfMonth } } },
                    { $group: { _id: "$referrer_id", count: { $sum: 1 } } }
                ]),
                TYFTB.aggregate([
                    { $match: { payer_id: { $in: userIds }, created_at: { $gte: startOfMonth, $lt: endOfMonth } } },
                    { $group: { _id: "$payer_id", count: { $sum: 1 } } }
                ]),
                Meeting.countDocuments({ chapter_id: chapter._id, meeting_date: { $gte: startOfMonth, $lt: endOfMonth } })
            ]);

            const toMap = (arr) => {
                const map = {};
                arr.forEach(item => { map[item._id.toString()] = item.count; });
                return map;
            };

            const attMap = toMap(attendances);
            const m2mMap = toMap(m2ms);
            const refMap = toMap(referrals);
            const tybMap = toMap(tyfcbs);

            let leaderboard = memberships.map(m => {
                const uIdStr = m.user_id._id.toString();
                const attCount = attMap[uIdStr] || 0;
                const m2mCount = m2mMap[uIdStr] || 0;
                const refCount = refMap[uIdStr] || 0;
                const tybCount = tybMap[uIdStr] || 0;
                const points = (m2mCount * 10) + (refCount * 20) + (tybCount * 30) + (attCount * 50);

                return {
                    user_id: m.user_id._id,
                    username: m.user_id.username,
                    points,
                    stats: { attendance: attCount, m2m: m2mCount, referrals: refCount, tyfcb: tybCount },
                    earnedBadges: [] // To be awarded
                };
            });

            // Filter out 0 points to prevent rewarding inactive users
            leaderboard = leaderboard.filter(u => u.points > 0);
            leaderboard.sort((a, b) => b.points - a.points);
            
            if (leaderboard.length === 0) continue;

            const maxRef = Math.max(...leaderboard.map(u => u.stats.referrals), 0);
            const maxM2M = Math.max(...leaderboard.map(u => u.stats.m2m), 0);
            const maxTyb = Math.max(...leaderboard.map(u => u.stats.tyfcb), 0);

            // Determine winners
            leaderboard.forEach((user, index) => {
                if (index === 0) user.earnedBadges.push('month_winner');
                if (index === 1) user.earnedBadges.push('runner_up');
                
                if (user.stats.referrals === maxRef && maxRef > 0) user.earnedBadges.push('highest_referral');
                if (user.stats.m2m === maxM2M && maxM2M > 0) user.earnedBadges.push('highest_m2m');
                if (user.stats.tyfcb === maxTyb && maxTyb > 0) user.earnedBadges.push('highest_tyb');
                if (user.stats.attendance > 0 && user.stats.attendance >= totalMeetings) user.earnedBadges.push('full_attendance');
            });

            // Save to DB and prepare Push Notifications
            const notificationsToSend = [];

            for (const user of leaderboard) {
                if (user.earnedBadges.length > 0) {
                    for (const badgeType of user.earnedBadges) {
                        // Check if already awarded (idempotency)
                        const existing = await EarnedBadge.findOne({ user_id: user.user_id, badge_type: badgeType, month: targetMonth, year: targetYear });
                        if (!existing) {
                            await EarnedBadge.create({
                                user_id: user.user_id,
                                chapter_id: chapter._id,
                                badge_type: badgeType,
                                month: targetMonth,
                                year: targetYear
                            });
                        }
                    }

                    // Push Notification for the user
                    let mainBadge = user.earnedBadges[0];
                    let badgeLabel = "";
                    if (mainBadge === 'month_winner') badgeLabel = "Month Winner";
                    else if (mainBadge === 'runner_up') badgeLabel = "Runner Up";
                    else if (mainBadge === 'highest_referral') badgeLabel = "Highest Referrals";
                    else if (mainBadge === 'highest_tyb') badgeLabel = "Highest TYB";
                    else if (mainBadge === 'highest_m2m') badgeLabel = "Highest M2M";
                    else if (mainBadge === 'full_attendance') badgeLabel = "Full Attendance";

                    let bodyText = `🏆 Congratulations! You've earned the ${badgeLabel} badge for ${monthName}.`;
                    if (user.earnedBadges.length > 1) {
                        bodyText = `🏆 Congratulations! You've earned the ${badgeLabel} and ${user.earnedBadges.length - 1} other badges for ${monthName}.`;
                    }
                    bodyText += " Tap to view your badges in your profile.";

                    notificationsToSend.push({
                        userId: user.user_id.toString(),
                        title: "New Badge Earned! 🎖️",
                        body: bodyText
                    });
                }
            }

            // Send Push Notifications in parallel
            await Promise.all(notificationsToSend.map(n => 
                sendPushNotification([n.userId], n.title, n.body, { action: "OPEN_PROFILE_BADGES" })
            ));
        }

        console.log(`Monthly badge calculation for ${monthName} ${targetYear} completed.`);
    } catch (error) {
        console.error("Error in calculateAndAwardMonthlyBadges:", error);
    }
};

export const manuallyTriggerBadgeAwards = async () => {
    return await calculateAndAwardMonthlyBadges();
};

const startCronJobs = () => {
    // Run every day at 08:00 AM
    cron.schedule('0 8 * * *', async () => {
        try {
            console.log("Running daily celebrations check for push notifications...");
            
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentDay = now.getDate();

            // Find all profiles with DOB or wedding_date
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
                    $project: {
                        memberName: { $ifNull: ["$display_name", "$user.username"] },
                        dob: 1,
                        wedding_date: 1
                    }
                }
            ];

            const profiles = await MemberProfile.aggregate(pipeline);
            
            let todaysCelebrantsCount = 0;
            let sampleCelebrant = null;
            let sampleCelebrantType = null;

            profiles.forEach(p => {
                let hasCelebrationToday = false;
                let currentType = null;
                
                if (p.dob) {
                    const dobDate = new Date(p.dob);
                    if (dobDate.getMonth() === currentMonth && dobDate.getDate() === currentDay) {
                        hasCelebrationToday = true;
                        currentType = 'birthday';
                    }
                }
                
                if (p.wedding_date) {
                    const weddingDate = new Date(p.wedding_date);
                    if (weddingDate.getMonth() === currentMonth && weddingDate.getDate() === currentDay) {
                        hasCelebrationToday = true;
                        // Prioritize anniversary if both happen today (rare but possible)
                        currentType = 'wedding anniversary'; 
                    }
                }

                if (hasCelebrationToday) {
                    todaysCelebrantsCount++;
                    if (!sampleCelebrant) {
                        sampleCelebrant = p.memberName;
                        sampleCelebrantType = currentType;
                    }
                }
            });

            if (todaysCelebrantsCount > 0) {
                console.log(`Found ${todaysCelebrantsCount} celebrant(s) today. Preparing push notification blast.`);
                
                // Fetch all users to broadcast the notification
                const allUsers = await User.find({}, '_id').lean();
                const allUserIds = allUsers.map(u => u._id);

                let title = "🎉 Special Celebrations Today!";
                let body = "";

                if (todaysCelebrantsCount === 1) {
                    body = `It's ${sampleCelebrant}'s ${sampleCelebrantType} today! Tap here to drop a warm wish. ✨`;
                } else {
                    body = `It's ${sampleCelebrant}'s ${sampleCelebrantType} and ${todaysCelebrantsCount - 1} other member(s) are celebrating today! Tap to send them your wishes. 💖`;
                }

                const data = {
                    action: "OPEN_WALL_OF_WISHES"
                };

                // Send bulk notification using fcmHelper
                await sendPushNotification(allUserIds, title, body, data);
                console.log("Daily celebrations push notification sent.");
            } else {
                console.log("No celebrations today.");
            }

        } catch (error) {
            console.error("Error running daily celebrations cron job:", error);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });

    // Run at 00:01 AM on the 1st of every month
    cron.schedule('1 0 1 * *', async () => {
        await calculateAndAwardMonthlyBadges();
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });

    console.log("Cron jobs scheduled.");
};

export default startCronJobs;
