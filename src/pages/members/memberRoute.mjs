import express from 'express'
import MemberStatistics from './MemberStatisticsRoute.mjs';
import { MemberProfile } from '../../schemas.mjs';

const MemberRouter = express.Router();

MemberRouter.use('/statistics', MemberStatistics)

MemberRouter.get('/getprofiles', async (req, res) => {
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
                $project: {
                    _id: 1,
                    profile_image_url: 1,
                    company_phone: 1,
                    company_email: 1,
                    company_address: 1,
                    company_name: 1,
                    blood_group: 1,
                    vagai_category: 1,
                    kulam_category: 1,
                    native_place: 1,
                    kuladeivam: 1,
                    user: { _id: 1, username: 1 },
                    verticals: { _id: 1, vertical_name: 1 }
                }
            }
        ]);
        res.status(200).json(docs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
})

export default MemberRouter;