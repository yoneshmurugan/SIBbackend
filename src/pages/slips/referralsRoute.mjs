import express from 'express';
import mongoose from 'mongoose';
import { Referral, Membership } from '../../schemas.mjs';
import { idValidation, createReferralValidation, updateReferralValidation, updateBulkReferralValidation } from '../../validators.mjs';
import { mapNamesToIds, handleValidationErrors } from '../../middlewares.mjs'

const router = express.Router();

router.post('/createreferral',
    createReferralValidation,
    handleValidationErrors,
    mapNamesToIds,
    async (req, res) => {
        try {
            if (!req.body.referrer_id || !req.body.referee_id) {
                return res.status(201).json({ message: 'Valid referrer_username and referee_username are required.' });
            }
            const doc = new Referral(req.body);
            const saved = await doc.save();
            res.status(201).json("Referral created successfully with ID: " + saved._id);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
);

router.get('/getallreferrals', async (req, res) => {
    try {
        
        const allMemberships = await Membership.find({
            chapter_id: req.chapter._id,
            membership_status: true
        }).select('user_id');
        const chapterUserIds = allMemberships.map(m => m.user_id);

        if (!chapterUserIds.length) {
            return res.status(200).json([]);
        }

        const docs = await Referral.aggregate([
            {
                $match: {
                    referrer_id: { $in: chapterUserIds },
                    referee_id: { $in: chapterUserIds }
                }
            },
            { $sort: { created_at: -1 } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'referrer_id',
                    foreignField: '_id',
                    as: 'referrer'
                }
            },
            { $unwind: { path: '$referrer', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'referee_id',
                    foreignField: '_id',
                    as: 'referee'
                }
            },
            { $unwind: { path: '$referee', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    referral_code: 1,
                    contact_name: 1,
                    description: 1,
                    status: 1,
                    referral_type: 1,
                    referral_category: 1,
                    contact_phone: 1,
                    contact_email: 1,
                    contact_date: 1,
                    comments: 1,
                    hot: 1,
                    referral_status: 1,
                    created_at: 1,
                    referrer: { _id: 1, username: 1, name: 1, email: 1 },
                    referee: { _id: 1, username: 1, name: 1, email: 1 },
                }
            }
        ]);
        res.status(200).json(docs);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/getrefferalbyid/:id', idValidation, handleValidationErrors, async (req, res) => {
    try {
        const [doc] = await Referral.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
            { $lookup: { from: 'users', localField: 'referrer_id', foreignField: '_id', as: 'referrer' } },
            { $unwind: { path: '$referrer', preserveNullAndEmptyArrays: true } },
            { $lookup: { from: 'users', localField: 'referee_id', foreignField: '_id', as: 'referee' } },
            { $unwind: { path: '$referee', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    referral_code: 1,
                    contact_name: 1,
                    description: 1,
                    referral_type: 1,
                    status: 1,
                    referral_category: 1,
                    contact_phone: 1,
                    contact_email: 1,
                    contact_date: 1,
                    comments: 1,
                    hot: 1,
                    referral_status: 1,
                    created_at: 1,
                    referrer: { _id: 1, username: 1, name: 1, email: 1 },
                    referee: { _id: 1, username: 1, name: 1, email: 1 },
                }
            }
        ]);
        if (!doc) return res.status(404).json({ message: 'Referral not found' });
        res.status(200).json(doc);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.put(
    '/updaterefferalbyid/:id',
    updateReferralValidation,
    handleValidationErrors,
    mapNamesToIds,
    async (req, res) => {
        try {
            const updated = await Referral.findByIdAndUpdate(
                req.params.id,
                req.body,
                { new: true, runValidators: true }
            );
            if (!updated) return res.status(404).json({ message: 'Referral not found' });
            res.status(200).json(updated);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }
);

router.put(
    '/updatebulkreferralstatusbyreferrer',
    updateBulkReferralValidation,
    handleValidationErrors,

    async (req, res) => {
        try {
            const { list } = req.body;
            const result = await Referral.updateMany(
                { referrer_id: { $in: list } },
                { $set: { status: true } }
            );
            if (result.matchedCount === 0) {
                return res.status(200).json({ message: 'No referrals found for the provided referrers.' });
            }
            res.status(200).json({ message: `Updated ${result.modifiedCount} referrals to status=true.` });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }
);

router.delete('/deleterefferalbyid/:id', idValidation, handleValidationErrors, async (req, res) => {
    try {
        const deleted = await Referral.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Referral not found' });
        res.status(200).json({ message: 'Referral deleted successfully' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
