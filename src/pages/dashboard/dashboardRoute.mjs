import express from 'express';
import { handleValidationErrors } from '../../middlewares.mjs';
import { formatDate } from '../../utils/dateformatter.mjs';
import { Referral, TYFTB, OneToOneMeeting, Visitor, Event, Meeting, User, Chapter, Membership, ChapterSummary, MemberProfile } from '../../schemas.mjs';
import { searchUserValidator } from '../../validators.mjs';

const router = express.Router();

router.get('/getchapteroverview', async (req, res) => {
	try {

		const membercount = await Membership.countDocuments({ chapter_id: req.chapter._id });

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
					meeting_time: 1
				}
			}
		]);

		const chapterMemberships = await Membership.find({
			chapter_id: req.chapter._id,
			membership_status: true
		}).select('user_id');

		const chapterUserIds = chapterMemberships.map(m => m.user_id);
		if (chapterUserIds.length === 0) {
			return res.status(200).json([]);
		}
		const results = await TYFTB.aggregate(
			[
				{
					$match: {
						payer_id: {
							$in:
								chapterUserIds
						},
						status: true
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

		const summary = await ChapterSummary.findOne({ chapter_id: req.chapter._id });
		const totalRevenue = parseInt(results[0]?.totalBusinessAmount ?? 0, 10);
		res.status(200).json({
			chapterName: req.chapter.chapter_name ?? "",
			nextMeeting: doc?.meeting_date ? formatDate(doc.meeting_date) : "No upcoming meeting",
			totalMembers: membercount ?? 0,
			totalRevenue: totalRevenue,
			totalvisitors: summary?.visitors_total ?? 0,
		});
	} catch (err) {
		console.log(err)
		res.status(500).json({ error: "Internal server error." });
	}
});

router.get('/getupcomingevents', async (req, res) => {
	try {

		const events = await Event.find({
			chapter_id: req.chapter._id,
			event_date: { $gte: new Date() },
			event_status: "upcoming"
		})
			.sort({ event_date: 1 })
			.limit(1);

		if (!events || events.length === 0) {
			return res.status(200).json([]);
		}

		const response = events.map(event => ({
			companyName: event.event_title ?? "",
			date: event.event_date ? formatDate(event.event_date) : "No upcoming event",
			time: event.event_time ?? "",
			VATnumber: event.vat_number ?? "",
		}));

		res.status(200).json(response);
	} catch (err) {
		res.status(500).json({ error: "Internal server error." });
	}
});

router.get('/getrenewaldate', async (req, res) => {
	try {

		const membership = await Membership.findOne({ user_id: req.userid });
		if (!membership || !membership.renewal_date) {
			return res.status(404).json({ error: "Renewal Date Not found" });
		}

		res.status(200).json({
			renewal_date: formatDate(membership.renewal_date)
		});
	} catch (err) {
		res.status(500).json({ error: "Internal server error." });
	}
});

router.get('/getactivity', async (req, res) => {
	try {
		const referral_given = await Referral.countDocuments({ referrer_id: req.userid });
		const referral_received = await Referral.countDocuments({ referee_id: req.userid });
		const tyftb_given = await TYFTB.countDocuments({ payer_id: req.userid });
		const tyftb_received = await TYFTB.countDocuments({ receiver_id: req.userid });
		const M2Ms = await OneToOneMeeting.countDocuments({
			$or: [
				{ member1_id: req.userid },
				{ member2_id: req.userid }
			]
		});
		const Visitors = await Visitor.countDocuments({ inviting_member_id: req.userid });
		const result = await TYFTB.aggregate([
			{ $match: { receiver_id: req.userid } },
			{ $group: { _id: null, totalBusiness: { $sum: "$business_amount" } } }
		]);

		const business_made = result[0]?.totalBusiness || 0;
		return res.status(200).json({ referral_given, referral_received, tyftb_given, tyftb_received, business_made, M2Ms, Visitors });
	} catch (err) {
		console.error('Error fetching activity:', err);
		return res.status(500).json({ error: "Internal server error." });
	}
});

router.get('/weekstats', async (req, res) => {
	try {

		const referral_given = await Referral.aggregate([
			{
				$match: {
					referrer_id: req.userid
				}
			},
			{
				$group: {
					_id: {
						week: { $week: "$created_at" },
						year: { $year: "$created_at" }
					},
					count: { $sum: 1 }
				}
			},
			{ $sort: { "_id.year": 1, "_id.week": 1 } }
		]);

		const tyftb_given = await TYFTB.aggregate([
			{
				$match: {
					payer_id: req.userid
				}
			},
			{
				$group: {
					_id: {
						week: { $week: "$created_at" },
						year: { $year: "$created_at" }
					},
					count: { $sum: 1 }
				}
			},
			{ $sort: { "_id.year": 1, "_id.week": 1 } }
		]);

		const M2M = await OneToOneMeeting.aggregate([
			{
				$match: {
					$or: [
						{ member1_id: req.userid },
						{ member2_id: req.userid }
					]
				}
			},
			{
				$group: {
					_id: {
						week: { $week: "$meeting_date" },
						year: { $year: "$meeting_date" }
					},
					count: { $sum: 1 }
				}
			},
			{ $sort: { "_id.year": 1, "_id.week": 1 } }
		]);

		const visitors = await Visitor.aggregate([
			{
				$match: {
					inviting_member_id: req.userid
				}
			},
			{
				$group: {
					_id: {
						week: { $week: "$createdAt" },
						year: { $year: "$createdAt" }
					},
					count: { $sum: 1 }
				}
			},
			{ $sort: { "_id.year": 1, "_id.week": 1 } }
		]);

		res.json({ referral_given, tyftb_given, M2M, visitors });

	} catch (error) {
		console.error("Week Stats Error:", error);
		res.status(500).json({ error: "Could not fetch week stats." });
	}
});

router.post('/searchuser', searchUserValidator, handleValidationErrors, async (req, res) => {
	try {
		const { substr } = req.body;

		const sameChapterMemberships = await Membership.find({
			chapter_id: req.chapter._id,
			membership_status: true
		}).distinct("user_id");

		const matchedUsers = await User.find({
			_id: { $in: sameChapterMemberships, $ne: req.userid },
			username: { $regex: substr.trim(), $options: "i" }
		})
			.select("username")
			.limit(10);
		let userdata = null;
		if (matchedUsers.length === 1) {
			userdata = await User.findOne({ _id: matchedUsers[0]._id }).select("username email phone_number");
		}

		const memberProfiles = await MemberProfile.find({
			user_id: { $in: matchedUsers.map(u => u._id) }
		}).select("user_id display_name");

		const displayNameMap = {};
		memberProfiles.forEach(profile => {
			displayNameMap[profile.user_id.toString()] = profile.display_name;
		});

		return res.status(200).json({
			results: matchedUsers.map(u => u.username),
			names: matchedUsers.map(u => displayNameMap[u._id.toString()] || ""),
			userdata: userdata
		});
	} catch (error) {
		console.error("SearchUser Error:", error);
		return res.status(500).json({ error: "Internal Server Error." });
	}
}
);

router.post('/searchalluser', searchUserValidator, handleValidationErrors, async (req, res) => {
	try {
		const { substr } = req.body;

		const sameChapterMemberships = await Membership.find({
			membership_status: true
		}).distinct("user_id");

		const matchedUsers = await User.find({
			_id: { $in: sameChapterMemberships, $ne: req.userid },
			username: { $regex: substr.trim(), $options: "i" }
		})
			.select("username")
			.limit(10);
		let userdata = null;
		if (matchedUsers.length === 1) {
			userdata = await User.findOne({ _id: matchedUsers[0]._id }).select("username email phone_number");
		}

		const memberProfiles = await MemberProfile.find({
			user_id: { $in: matchedUsers.map(u => u._id) }
		}).populate("chapter_id", "chapter_name").select("user_id display_name");

		const displayNameMap = {};
		memberProfiles.forEach(profile => {
			displayNameMap[profile.user_id.toString()] = profile.display_name;
		});

		const chapterNameMap = {};
		memberProfiles.forEach(profile => {
			chapterNameMap[profile.user_id.toString()] = profile.chapter_id && profile.chapter_id.chapter_name ? profile.chapter_id.chapter_name : "";
		});

		return res.status(200).json({
			results: matchedUsers.map(u => u.username),
			names: matchedUsers.map(u => displayNameMap[u._id.toString()] || ""),
			userdata: userdata,
			chapters: matchedUsers.map(u => chapterNameMap[u._id.toString()] || "")
		});
	} catch (error) {
		console.error("SearchUser Error:", error);
		return res.status(500).json({ error: "Internal Server Error." });
	}
}
);

router.post('/searchchapter', searchUserValidator, handleValidationErrors, async (req, res) => {
	try {
		const { substr } = req.body;

		if (!substr || substr.trim() === "") {
			return res.status(400).json({ error: "Search substring required." });
		}

		const matchedChapters = await Chapter.find({
			chapter_name: { $regex: substr.trim(), $options: "i" }
		})
			.select("chapter_name")
			.limit(10);

		return res.status(200).json({
			results: matchedChapters.map(c => (c.chapter_name))
		});
	} catch (error) {
		return res.status(500).json({ error: "Internal Server Error." });
	}
}
);

router.get('/getactivity/:timeline', async (req, res) => {
	const timeline = String(req.params.timeline || 'full').toLowerCase(); // "full" | "6months" | "amonth"
	try {

		const now = new Date();
		let startDate = null;
		let endDate = now;

		if (timeline === 'amonth') {
			startDate = new Date();
			startDate.setMonth(startDate.getMonth() - 1);
		} else if (timeline === '6months') {
			startDate = new Date();
			startDate.setMonth(startDate.getMonth() - 6);
		} else if (timeline === 'full') {
			startDate = null;
			endDate = null;
		}

		const rangeFilter = startDate && endDate
			? { createdAt: { $gte: startDate, $lte: endDate } }
			: {};

		const referralGivenFilter = { referrer_id: req.userid, status: true, ...rangeFilter };
		const referralReceivedFilter = { referee_id: req.userid, status: true, ...rangeFilter };
		const tyftbGivenFilter = { payer_id: req.userid, status: true, ...rangeFilter };
		const tyftbReceivedFilter = { receiver_id: req.userid, status: true, ...rangeFilter };
		const m2mFilter = {
			$or: [{ member1_id: req.userid }, { member2_id: req.userid }], status: true,
			...rangeFilter
		};
		const visitorsFilter = { inviting_member_id: req.userid, status: true, ...rangeFilter };

		const [
			referral_given,
			referral_received,
			tyftb_given,
			tyftb_received,
			M2Ms,
			Visitors,
			businessAgg,
			business_given
		] = await Promise.all([
			Referral.countDocuments(referralGivenFilter),
			Referral.countDocuments(referralReceivedFilter),
			TYFTB.countDocuments(tyftbGivenFilter),
			TYFTB.countDocuments(tyftbReceivedFilter),
			OneToOneMeeting.countDocuments(m2mFilter),
			Visitor.countDocuments(visitorsFilter),
			TYFTB.aggregate([
				{ $match: { payer_id: req.userid, status: true, ...(rangeFilter.createdAt ? rangeFilter : {}) } },
				{ $group: { _id: null, totalBusiness: { $sum: "$business_amount" } } }
			]),
			TYFTB.aggregate([
				{ $match: { receiver_id: req.userid, status: true, ...(rangeFilter.createdAt ? rangeFilter : {}) } },
				{ $group: { _id: null, totalBusiness: { $sum: "$business_amount" } } }
			])
		]);

		const business_made = (businessAgg[0]?.totalBusiness) || 0;
		const business_given1 = (business_given[0]?.totalBusiness) || 0

		return res.status(200).json({
			timeline,
			date_range: startDate && endDate ? { start: startDate, end: endDate } : null,
			referral_given,
			referral_received,
			tyftb_given,
			tyftb_received,
			business_made,
			M2Ms,
			Visitors,
			business_given1
		});
	} catch (err) {
		console.error('Error fetching activity:', err);
		return res.status(500).json({ error: "Internal server error." });
	}
});

router.get('/getactivityupcoming/:timeline', async (req, res) => {
	const timeline = String(req.params.timeline || 'full').toLowerCase(); // "full" | "6months" | "amonth"
	try {

		const now = new Date();
		let startDate = null;
		let endDate = now;

		if (timeline === 'amonth') {
			startDate = new Date();
			startDate.setMonth(startDate.getMonth() - 1);
		} else if (timeline === '6months') {
			startDate = new Date();
			startDate.setMonth(startDate.getMonth() - 6);
		} else if (timeline === 'full') {
			startDate = null;
			endDate = null;
		}

		const rangeFilter = startDate && endDate
			? { createdAt: { $gte: startDate, $lte: endDate } }
			: {};

		const referralGivenFilter = { referrer_id: req.userid, status: false, ...rangeFilter };
		const referralReceivedFilter = { referee_id: req.userid, status: false, ...rangeFilter };
		const tyftbGivenFilter = { payer_id: req.userid, status: false, ...rangeFilter };
		const tyftbReceivedFilter = { receiver_id: req.userid, status: false, ...rangeFilter };
		const m2mFilter = {
			$or: [{ member1_id: req.userid }, { member2_id: req.userid }], status: false,
			...rangeFilter
		};
		const visitorsFilter = { inviting_member_id: req.userid, status: false, ...rangeFilter };

		const [
			referral_given,
			referral_received,
			tyftb_given,
			tyftb_received,
			M2Ms,
			Visitors,
			businessAgg,
			business_given
		] = await Promise.all([
			Referral.countDocuments(referralGivenFilter),
			Referral.countDocuments(referralReceivedFilter),
			TYFTB.countDocuments(tyftbGivenFilter),
			TYFTB.countDocuments(tyftbReceivedFilter),
			OneToOneMeeting.countDocuments(m2mFilter),
			Visitor.countDocuments(visitorsFilter),
			TYFTB.aggregate([
				{ $match: { payer_id: req.userid, status: false, ...(rangeFilter.createdAt ? rangeFilter : {}) } },
				{ $group: { _id: null, totalBusiness: { $sum: "$business_amount" } } }
			]),
			TYFTB.aggregate([
				{ $match: { receiver_id: req.userid, status: false, ...(rangeFilter.createdAt ? rangeFilter : {}) } },
				{ $group: { _id: null, totalBusiness: { $sum: "$business_amount" } } }
			])
		]);

		const business_made = (businessAgg[0]?.totalBusiness) || 0;
		const business_given1 = (business_given[0]?.totalBusiness) || 0


		return res.status(200).json({
			timeline,
			date_range: startDate && endDate ? { start: startDate, end: endDate } : null,
			referral_given,
			referral_received,
			tyftb_given,
			tyftb_received,
			business_made,
			M2Ms,
			Visitors,
			business_given1
		});
	} catch (err) {
		console.error('Error fetching activity:', err);
		return res.status(500).json({ error: "Internal server error." });
	}
});

router.get('/caneditevents', async (req, res) => {
	try {
		const membership = await Membership.findOne({ user_id: req.userid });
		if (!membership || !membership.chapter_id) {
			return res.status(404).json({ error: "Membership or chapter not found." });
		}
		if (membership.role === "president" || membership.role === "admin") {
			res.status(200).json({ hasaccess: true });
		}
		else {
			res.status(200).json({ hasaccess: false });
		}
	} catch (err) {
		console.error('Error fetching event access key', err);
		return res.status(500).json({ error: "Internal server error." });
	}
});

router.get('/isadmin', async (req, res) => {
	try {
		const admins = process.env.ADMIN_UIDS ? process.env.ADMIN_UIDS.split(",") : [];
		if (admins.includes(req.uid)) {
			res.status(200).json({ hasaccess: true });
		}
		else {
			res.status(200).json({ hasaccess: false });
		}
	} catch (err) {
		console.error('Error fetching event access key', err);
		return res.status(500).json({ error: "Internal server error." });
	}
});

router.get('/coordinatoraccess', async (req, res) => {
	try {
		const firebaseUid = req.user && req.user.uid;
		if (!firebaseUid) {
			return res.status(400).json({ error: "Missing user id." });
		}

		const userObj = await User.findOne({ user_id: firebaseUid }).lean();
		if (!userObj || !req.userid) {
			return res.status(404).json({ error: "User not found." });
		}

		const membership = await Membership.findOne({
			user_id: req.userid,
			membership_status: true
		}).lean();

		if (!membership || !membership.chapter_id) {
			return res.status(404).json({ error: "Membership or chapter not found." });
		}

		const hasaccess = ["admin", "coordinator", "president"].includes(membership.role);
		return res.status(200).json({ hasaccess });

	} catch (err) {
		console.error('Error fetching coordinator access:', err);
		return res.status(500).json({ error: "Internal server error." });
	}
});

export default router;