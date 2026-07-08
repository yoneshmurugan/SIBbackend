import express from 'express';
import { Referral, TYFTB, OneToOneMeeting, Visitor, Membership } from '../../schemas.mjs';

const router = express.Router();

router.get('/getactivity', async (req, res) => {
    try {

        const { startDate, endDate } = req.query;
        let start = startDate ? new Date(startDate) : null;
        let end = endDate ? new Date(endDate) : null;

        if (start && isNaN(start.getTime())) return res.status(400).json({ error: "Invalid startDate" });
        if (end && isNaN(end.getTime())) return res.status(400).json({ error: "Invalid endDate" });

        if (end) {
            end.setHours(23, 59, 59, 999);
        }

        const dateFilter = {};
        if (start) dateFilter.$gte = start;
        if (end) dateFilter.$lte = end;

        const referralGivenFilter = { referrer_id: req.userid };
        const referralReceivedFilter = { referee_id: req.userid };
        const tyftbGivenFilter = { payer_id: req.userid };
        const tyftbReceivedFilter = { receiver_id: req.userid };
        const M2MsFilter = {
            $or: [
                { member1_id: req.userid },
                { member2_id: req.userid }
            ]
        };
        const visitorsFilter = { inviting_member_id: req.userid };

        if (start || end) {
            referralGivenFilter.createdAt = dateFilter;
            referralReceivedFilter.createdAt = dateFilter;
            tyftbGivenFilter.createdAt = dateFilter;
            tyftbReceivedFilter.createdAt = dateFilter;
            M2MsFilter.createdAt = dateFilter;
            visitorsFilter.createdAt = dateFilter;
        }

        const referral_given = await Referral.countDocuments(referralGivenFilter);
        const referral_received = await Referral.countDocuments(referralReceivedFilter);
        const tyftb_given = await TYFTB.countDocuments(tyftbGivenFilter);
        const tyftb_received = await TYFTB.countDocuments(tyftbReceivedFilter);
        const M2Ms = await OneToOneMeeting.countDocuments(M2MsFilter);
        const Visitors = await Visitor.countDocuments(visitorsFilter);

        const aggregationMatch = {
            receiver_id: req.userid,
        };
        if (start || end) {
            aggregationMatch.createdAt = dateFilter;
        }

        const result = await TYFTB.aggregate([
            { $match: aggregationMatch },
            { $group: { _id: null, totalBusiness: { $sum: "$business_amount" } } }
        ]);
        const business_made = result[0]?.totalBusiness || 0;

        return res.status(200).json({ referral_given, referral_received, tyftb_given, tyftb_received, business_made, M2Ms, Visitors });
    } catch (err) {
        console.error('Error fetching activity:', err);
        return res.status(500).json({ error: "Internal server error." });
    }
});

router.get('/getfullactivity', async (req, res) => {
    try {

        const { startDate, endDate, filter } = req.query;
        let start = startDate ? new Date(startDate) : null;
        let end = endDate ? new Date(endDate) : null;

        if (start && isNaN(start.getTime())) {
            return res.status(400).json({ error: "Invalid startDate format" });
        }
        if (end && isNaN(end.getTime())) {
            return res.status(400).json({ error: "Invalid endDate format" });
        }

        if (end) {
            end.setHours(23, 59, 59, 999);
        }

        const dateFilter = {};
        if (start) dateFilter.$gte = start;
        if (end) dateFilter.$lte = end;

        const buildQuery = (baseQuery) => {
            if (start || end) {
                baseQuery.createdAt = dateFilter;
            }
            return baseQuery;
        };

        let tyftb_given = 0;
        let tyftb_received = 0;
        let business_made = 0;

        if (!filter || filter === 'tyftb' || filter === 'all') {
            const tyftbGivenQuery = buildQuery({ payer_id: req.userid });
            tyftb_given = await TYFTB.countDocuments(tyftbGivenQuery);

            const tyftbReceivedQuery = buildQuery({ receiver_id: req.userid });
            tyftb_received = await TYFTB.countDocuments(tyftbReceivedQuery);

            const businessResult = await TYFTB.aggregate([
                { $match: buildQuery({ receiver_id: req.userid }) },
                { $group: { _id: null, total: { $sum: { $convert: { input: "$business_amount", to: "double" } } } } }
            ]);
            business_made = businessResult[0]?.total || 0;
        }

        let referral_given = 0;
        let referral_received = 0;

        if (!filter || filter === 'referral' || filter === 'all') {
            const referralGivenQuery = buildQuery({ referrer_id: req.userid });
            referral_given = await Referral.countDocuments(referralGivenQuery);

            const referralReceivedQuery = buildQuery({ referee_id: req.userid });
            referral_received = await Referral.countDocuments(referralReceivedQuery);
        }

        let m2m_given = 0;
        let m2m_received = 0;

        if (!filter || filter === 'm2m' || filter === 'all') {
            const m2mGivenQuery = buildQuery({ member1_id: req.userid });
            m2m_given = await OneToOneMeeting.countDocuments(m2mGivenQuery);

            const m2mReceivedQuery = buildQuery({ member2_id: req.userid });
            m2m_received = await OneToOneMeeting.countDocuments(m2mReceivedQuery);
        }

        return res.status(200).json({
            success: true,
            data: {
                tyftb: {
                    given: tyftb_given,
                    received: tyftb_received,
                    business_made: business_made
                },
                referral: {
                    given: referral_given,
                    received: referral_received
                },
                m2m: {
                    given: m2m_given,
                    received: m2m_received
                }
            },
            dateRange: {
                startDate: start || null,
                endDate: end || null
            }
        });
    } catch (err) {
        console.error('Error fetching user activity:', err);
        return res.status(500).json({ error: "Internal server error.", details: err.message });
    }
});

router.get('/getactivity-details', async (req, res) => {
    try {
        
        const { type = 'all', startDate, endDate, direction } = req.query;

        const validTypes = ['all', 'tyftb', 'm2m', 'referral'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                error: `Invalid type. Must be one of: ${validTypes.join(', ')}`
            });
        }

        let start = startDate ? new Date(startDate) : null;
        let end = endDate ? new Date(endDate) : null;

        if (start && isNaN(start.getTime())) {
            return res.status(400).json({ error: "Invalid startDate format. Use YYYY-MM-DD" });
        }
        if (end && isNaN(end.getTime())) {
            return res.status(400).json({ error: "Invalid endDate format. Use YYYY-MM-DD" });
        }

        if (end) {
            end.setHours(23, 59, 59, 999);
        }

        const dateFilterCreated_at = {};
        const dateFilterCreatedAt = {};

        if (start) {
            dateFilterCreated_at.$gte = start;
            dateFilterCreatedAt.$gte = start;
        }
        if (end) {
            dateFilterCreated_at.$lte = end;
            dateFilterCreatedAt.$lte = end;
        }

        const result = {
            success: true,
            data: {
                tyftb: [],
                referral: [],
                m2m: [],
                visitor: []
            },
            dateRange: {
                startDate: start ? start.toISOString().split('T')[0] : null,
                endDate: end ? end.toISOString().split('T')[0] : null
            },
            totalRecords: {
                tyftb: 0,
                referral: 0,
                m2m: 0,
                visitor: 0
            }
        };

        if (type === 'all' || type === 'tyftb') {
            const tyftbGivenFilter = { payer_id: req.userid };
            const tyftbReceivedFilter = { receiver_id: req.userid };

            if (start || end) {
                tyftbGivenFilter.created_at = dateFilterCreated_at;
                tyftbReceivedFilter.created_at = dateFilterCreated_at;
            }

            let tyftbData = [];

            if (!direction || direction === 'given') {
                const given = await TYFTB.find(tyftbGivenFilter)
                    .populate('payer_id', 'username email', null, { strictPopulate: false })
                    .populate('receiver_id', 'username email', null, { strictPopulate: false })
                    .sort({ created_at: -1 })
                    .lean();
                tyftbData.push(...given);
            }

            if (!direction || direction === 'received') {
                const received = await TYFTB.find(tyftbReceivedFilter)
                    .populate('payer_id', 'username email', null, { strictPopulate: false })
                    .populate('receiver_id', 'username email', null, { strictPopulate: false })
                    .sort({ created_at: -1 })
                    .lean();
                tyftbData.push(...received);
            }

            const tyftbMap = new Map();
            tyftbData.forEach(item => {
                if (!tyftbMap.has(item._id.toString())) {
                    const payerId = item.payer_id?._id?.toString();
                    const userIdStr = req.userid.toString();

                    tyftbMap.set(item._id.toString(), {
                        _id: item._id,
                        payer: item.payer_id && item.payer_id._id ? {
                            _id: item.payer_id._id,
                            name: item.payer_id.username || '',
                            email: item.payer_id.email || ''
                        } : { _id: null, name: 'Unknown', email: '' },
                        receiver: item.receiver_id && item.receiver_id._id ? {
                            _id: item.receiver_id._id,
                            name: item.receiver_id.username || '',
                            email: item.receiver_id.email || ''
                        } : { _id: null, name: 'Unknown', email: '' },
                        business_type: item.business_type || '',
                        referral_type: item.referral_type || '',
                        business_amount: item.business_amount || 0,
                        business_description: item.business_description || '',
                        created_at: item.created_at,
                        status: item.status,
                        direction: payerId === userIdStr ? 'given' : 'received',
                        type: 'tyftb'
                    });
                }
            });

            result.data.tyftb = Array.from(tyftbMap.values());
            result.totalRecords.tyftb = result.data.tyftb.length;
        }

        if (type === 'all' || type === 'referral') {
            const referralGivenFilter = { referrer_id: req.userid };
            const referralReceivedFilter = { referee_id: req.userid };

            if (start || end) {
                referralGivenFilter.created_at = dateFilterCreated_at;
                referralReceivedFilter.created_at = dateFilterCreated_at;
            }

            let referralData = [];

            if (!direction || direction === 'given') {
                const given = await Referral.find(referralGivenFilter)
                    .populate('referrer_id', 'username email', null, { strictPopulate: false })
                    .populate('referee_id', 'username email', null, { strictPopulate: false })
                    .sort({ created_at: -1 })
                    .lean();
                referralData.push(...given);
            }

            if (!direction || direction === 'received') {
                const received = await Referral.find(referralReceivedFilter)
                    .populate('referrer_id', 'username email', null, { strictPopulate: false })
                    .populate('referee_id', 'username email', null, { strictPopulate: false })
                    .sort({ created_at: -1 })
                    .lean();
                referralData.push(...received);
            }

            const referralMap = new Map();
            referralData.forEach(item => {
                if (!referralMap.has(item._id.toString())) {
                    const referrerId = item.referrer_id?._id?.toString();
                    const userIdStr = req.userid.toString();

                    referralMap.set(item._id.toString(), {
                        _id: item._id,
                        referrer: item.referrer_id && item.referrer_id._id ? {
                            _id: item.referrer_id._id,
                            name: item.referrer_id.username || '',
                            email: item.referrer_id.email || ''
                        } : { _id: null, name: 'Unknown', email: '' },
                        referee: item.referee_id && item.referee_id._id ? {
                            _id: item.referee_id._id,
                            name: item.referee_id.username || '',
                            email: item.referee_id.email || ''
                        } : { _id: null, name: 'Unknown', email: '' },
                        contact_name: item.contact_name || '',
                        description: item.description || '',
                        referral_type: item.referral_type || '',
                        referral_status: item.referral_status || [],
                        contact_phone: item.contact_phone || '',
                        contact_email: item.contact_email || '',
                        contact_address: item.contact_address || '',
                        hot: item.hot || '',
                        created_at: item.created_at,
                        status: item.status,
                        direction: referrerId === userIdStr ? 'given' : 'received',
                        type: 'referral'
                    });
                }
            });

            result.data.referral = Array.from(referralMap.values());
            result.totalRecords.referral = result.data.referral.length;
        }

        if (type === 'all' || type === 'm2m') {
            const m2mGivenFilter = { member1_id: req.userid };
            const m2mReceivedFilter = { member2_id: req.userid };

            if (start || end) {
                m2mGivenFilter.createdAt = dateFilterCreatedAt;
                m2mReceivedFilter.createdAt = dateFilterCreatedAt;
            }

            let m2mData = [];

            if (!direction || direction === 'given') {
                const given = await OneToOneMeeting.find(m2mGivenFilter)
                    .populate('member1_id', 'username email', null, { strictPopulate: false })
                    .populate('member2_id', 'username email', null, { strictPopulate: false })
                    .populate('created_by', 'username email', null, { strictPopulate: false })
                    .sort({ createdAt: -1 })
                    .lean();
                m2mData.push(...given);
            }

            if (!direction || direction === 'received') {
                const received = await OneToOneMeeting.find(m2mReceivedFilter)
                    .populate('member1_id', 'username email', null, { strictPopulate: false })
                    .populate('member2_id', 'username email', null, { strictPopulate: false })
                    .populate('created_by', 'username email', null, { strictPopulate: false })
                    .sort({ createdAt: -1 })
                    .lean();
                m2mData.push(...received);
            }

            const m2mMap = new Map();
            m2mData.forEach(item => {
                if (!m2mMap.has(item._id.toString())) {
                    const member1Id = item.member1_id?._id?.toString();
                    const userIdStr = req.userid.toString();

                    m2mMap.set(item._id.toString(), {
                        _id: item._id,
                        member1: item.member1_id && item.member1_id._id ? {
                            _id: item.member1_id._id,
                            name: item.member1_id.username || '',
                            email: item.member1_id.email || ''
                        } : { _id: null, name: 'Unknown', email: '' },
                        member2: item.member2_id && item.member2_id._id ? {
                            _id: item.member2_id._id,
                            name: item.member2_id.username || '',
                            email: item.member2_id.email || ''
                        } : { _id: null, name: 'Unknown', email: '' },
                        chapter_id: item.chapter_id,
                        meeting_date: item.meeting_date,
                        location: item.location || '',
                        discussion_points: item.discussion_points || '',
                        created_by: item.created_by && item.created_by._id ? {
                            _id: item.created_by._id,
                            name: item.created_by.username || '',
                            email: item.created_by.email || ''
                        } : { _id: null, name: 'Unknown', email: '' },
                        createdAt: item.createdAt,
                        status: item.status,
                        direction: member1Id === userIdStr ? 'given' : 'received',
                        type: 'm2m',
                        image_url: item.image_url
                    });
                }
            });

            result.data.m2m = Array.from(m2mMap.values());
            result.totalRecords.m2m = result.data.m2m.length;
        }

        if (type === 'all') {
            const visitorFilter = { inviting_member_id: req.userid };

            if (start || end) {
                visitorFilter.createdAt = dateFilterCreatedAt;
            }

            const visitorData = await Visitor.find(visitorFilter)
                .populate('inviting_member_id', 'username email', null, { strictPopulate: false })
                .populate('member_user_id', 'username email', null, { strictPopulate: false })
                .sort({ createdAt: -1 })
                .lean();

            const visitorWithType = visitorData.map(item => ({
                _id: item._id,
                inviting_member: item.inviting_member_id && item.inviting_member_id._id ? {
                    _id: item.inviting_member_id._id,
                    name: item.inviting_member_id.username || '',
                    email: item.inviting_member_id.email || ''
                } : { _id: null, name: 'Unknown', email: '' },
                visitor_name: item.visitor_name || '',
                visitor_company: item.visitor_company || '',
                visitor_phone: item.visitor_phone || '',
                visitor_email: item.visitor_email || '',
                business_category: item.business_category || '',
                industry: item.industry || '',
                presentation_given: item.presentation_given || false,
                converted_to_member: item.converted_to_member || false,
                member_user: item.member_user_id && item.member_user_id._id ? {
                    _id: item.member_user_id._id,
                    name: item.member_user_id.username || '',
                    email: item.member_user_id.email || ''
                } : { _id: null, name: 'Unknown', email: '' },
                createdAt: item.createdAt,
                direction: 'given',
                type: 'visitor'
            }));

            result.data.visitor = visitorWithType;
            result.totalRecords.visitor = visitorData.length;
        }

        return res.status(200).json(result);
    } catch (err) {
        console.error('Error fetching activity details:', err);
        return res.status(500).json({
            error: "Internal server error.",
            details: err.message
        });
    }
});

router.get('/getactivityofusers', async (req, res) => {
    try {
        const chapterId = req.query.chapterid || req.chapter._id;

        let fromdate = req.query.fromDate ? new Date(req.query.fromDate) : null;
        let todate = req.query.toDate ? new Date(req.query.toDate) : null;

        if (fromdate && isNaN(fromdate.getTime())) {
            return res.status(400).json({ error: "Invalid fromDate format" });
        }
        if (todate && isNaN(todate.getTime())) {
            return res.status(400).json({ error: "Invalid toDate format" });
        }

        if (todate) {
            todate.setHours(23, 59, 59, 999);
        }

        const dateFilterCreatedAt = {};
        if (fromdate) dateFilterCreatedAt.$gte = fromdate;
        if (todate) dateFilterCreatedAt.$lte = todate;

        const allMemberships = await Membership.find({
            chapter_id: chapterId,
            membership_status: true
        }).populate('user_id', 'username email _id');

        if (!allMemberships || allMemberships.length === 0) {
            return res.status(200).json([]);
        }

        const results = await Promise.all(
            allMemberships.map(async (mem) => {
                const user = mem.user_id;
                if (!user || !user._id) return null;

                try {
                    // Build filters with date
                    const referralGivenFilter = { referrer_id: user._id };
                    const referralReceivedFilter = { referee_id: user._id };
                    const tyftbGivenFilter = { payer_id: user._id };
                    const tyftbReceivedFilter = { receiver_id: user._id };
                    const m2mFilter = {
                        $or: [
                            { member1_id: user._id },
                            { member2_id: user._id }
                        ]
                    };
                    const visitorFilter = { inviting_member_id: user._id };

                    if (fromdate || todate) {
                        referralGivenFilter.createdAt = dateFilterCreatedAt;
                        referralReceivedFilter.createdAt = dateFilterCreatedAt;
                        tyftbGivenFilter.createdAt = dateFilterCreatedAt;
                        tyftbReceivedFilter.createdAt = dateFilterCreatedAt;
                        m2mFilter.meeting_date = dateFilterCreatedAt;
                        visitorFilter.createdAt = dateFilterCreatedAt;
                    }

                    const [
                        referralsGiven,
                        referralsReceived,
                        tyftbGiven,
                        tyftbReceived,
                        m2mCount,
                        visitorsBrought
                    ] = await Promise.all([
                        Referral.countDocuments(referralGivenFilter),
                        Referral.countDocuments(referralReceivedFilter),
                        TYFTB.countDocuments(tyftbGivenFilter),
                        TYFTB.countDocuments(tyftbReceivedFilter),
                        OneToOneMeeting.countDocuments(m2mFilter),
                        Visitor.countDocuments(visitorFilter)
                    ]);

                    const [givenAgg, receivedAgg] = await Promise.all([
                        TYFTB.aggregate([
                            { $match: tyftbGivenFilter },
                            { $group: { _id: null, total: { $sum: '$business_amount' } } }
                        ]),
                        TYFTB.aggregate([
                            { $match: tyftbReceivedFilter },
                            { $group: { _id: null, total: { $sum: '$business_amount' } } }
                        ])
                    ]);

                    const businessGiven = givenAgg[0]?.total || 0;
                    const businessReceived = receivedAgg[0]?.total || 0;
                    const businessMade = (businessReceived) || 0;

                    return {
                        id: user._id.toString(),
                        rank: 0,
                        name: user.username || "Unknown",
                        referralsGiven: Number(referralsGiven) || 0,
                        referralsReceived: Number(referralsReceived) || 0,
                        tyftbGiven: Number(tyftbGiven) || 0,
                        tyftbReceived: Number(tyftbReceived) || 0,
                        businessMade: Number(businessGiven) || 0,
                        businessGiven: Number(businessMade) || 0,
                        mToM: Number(m2mCount) || 0,
                        visitorsBrought: Number(visitorsBrought) || 0
                    };
                } catch (err) {
                    console.error(`Error processing user ${user._id}:`, err);
                    return null;
                }
            })
        );

        const filtered = results.filter(item => item !== null);

        if (filtered.length === 0) {
            return res.status(200).json([]);
        }

        filtered.sort((a, b) => {
            if (b.businessGiven !== a.businessGiven) {
                return b.businessGiven - a.businessGiven;
            }
            if (b.businessMade !== a.businessMade) {
                return b.businessMade - a.businessMade;
            }
            if (b.referralsGiven !== a.referralsGiven) {
                return b.referralsGiven - a.referralsGiven;
            }
            if (b.tyftbGiven !== a.tyftbGiven) {
                return b.tyftbGiven - a.tyftbGiven;
            }
            return b.mToM - a.mToM;
        });

        filtered.forEach((item, idx) => {
            item.rank = idx + 1;
        });

        return res.status(200).json(filtered);

    } catch (err) {
        console.error('Error fetching activity details:', err);
        return res.status(500).json({
            error: "Internal server error.",
            details: err.message || "Unknown error"
        });
    }
});

router.get('/getactivityofusersfalse', async (req, res) => {
    try {
        const allMemberships = await Membership.find({
            chapter_id: req.chapter._id,
            membership_status: true
        }).populate('user_id', 'username email _id');

        if (!allMemberships || allMemberships.length === 0) {
            return res.status(200).json([]);
        }

        const results = await Promise.all(
            allMemberships.map(async (mem) => {
                const user = mem.user_id;
                if (!user || !user._id) return null;

                try {
                    const [
                        referralsGiven,
                        referralsReceived,
                        tyftbGiven,
                        tyftbReceived,
                        m2mCount,
                        visitorsBrought
                    ] = await Promise.all([
                        Referral.countDocuments({ referrer_id: user._id, status: false }),
                        Referral.countDocuments({ referee_id: user._id, status: false }),
                        TYFTB.countDocuments({ payer_id: user._id, status: false }),
                        TYFTB.countDocuments({ receiver_id: user._id, status: false }),
                        OneToOneMeeting.countDocuments({
                            $or: [
                                { member1_id: user._id },
                                { member2_id: user._id }
                            ], status: false
                        }),
                        Visitor.countDocuments({ inviting_member_id: user._id, status: false })
                    ]);

                    const [givenAgg, receivedAgg] = await Promise.all([
                        TYFTB.aggregate([
                            { $match: { payer_id: user._id, status: false } },
                            { $group: { _id: null, total: { $sum: '$business_amount' } } }
                        ]),
                        TYFTB.aggregate([
                            { $match: { receiver_id: user._id, status: false } },
                            { $group: { _id: null, total: { $sum: '$business_amount' } } }
                        ])
                    ]);

                    const businessGiven = givenAgg[0]?.total || 0;
                    const businessReceived = receivedAgg[0]?.total || 0;
                    const businessMade = (businessReceived) || 0;

                    return {
                        id: user._id.toString(),
                        rank: 0,
                        name: user.username || "Unknown",
                        referralsGiven: Number(referralsGiven) || 0,
                        referralsReceived: Number(referralsReceived) || 0,
                        tyftbGiven: Number(tyftbGiven) || 0,
                        tyftbReceived: Number(tyftbReceived) || 0,
                        businessMade: Number(businessGiven) || 0,
                        businessGiven: Number(businessMade) || 0,
                        mToM: Number(m2mCount) || 0,
                        visitorsBrought: Number(visitorsBrought) || 0
                    };
                } catch (err) {
                    console.error(`Error processing user ${user._id}:`, err);
                    return null;
                }
            })
        );

        const filtered = results.filter(item => item !== null);

        if (filtered.length === 0) {
            return res.status(200).json([]);
        }

        filtered.sort((a, b) => {
            if (b.businessGiven !== a.businessGiven) {
                return b.businessGiven - a.businessGiven;
            }
            if (b.businessMade !== a.businessMade) {
                return b.businessMade - a.businessMade;
            }
            if (b.referralsGiven !== a.referralsGiven) {
                return b.referralsGiven - a.referralsGiven;
            }
            if (b.tyftbGiven !== a.tyftbGiven) {
                return b.tyftbGiven - a.tyftbGiven;
            }
            return b.mToM - a.mToM;
        });

        filtered.forEach((item, idx) => {
            item.rank = idx + 1;
        });

        return res.status(200).json(filtered);

    } catch (err) {
        console.error('Error fetching activity details:', err);
        return res.status(500).json({
            error: "Internal server error.",
            details: err.message || "Unknown error"
        });
    }
});


export default router;