import express from 'express';
import mongoose from 'mongoose';
import { TYFTB, User, Membership } from '../../schemas.mjs';
import { createTyftbValidation, updateTyftbValidation, idValidation, updateBulkTyftbValidation } from '../../validators.mjs';
import { mapNamesToIds, handleValidationErrors } from '../../middlewares.mjs';

const router = express.Router();

router.post(
    '/createtyftb',
    createTyftbValidation,
    handleValidationErrors,
    mapNamesToIds,
    async (req, res) => {
        try {
            
            req.body.payer_id =req.userid;

            if (!req.body.payer_id || !req.body.receiver_id)
                return res.status(400).json({ message: 'Payer and receiver must be specified and valid.' });
            const tyftb = new TYFTB(req.body);
            const saved = await tyftb.save();
            res.status(201).json("TYFTB record created successfully with ID: " + saved._id);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
);

router.get('/getalltyftb', async (req, res) => {
    try {
        
        const userId = req.userid;

        const userMembership = await Membership.findOne({
            user_id: userId,
            membership_status: true
        });
        if (!userMembership) {
            return res.status(404).json({ error: "Active membership not found for user." });
        }

        const chapterMemberships = await Membership.find({
            chapter_id: userMembership.chapter_id,
            membership_status: true
        }).select('user_id');

        const chapterUserIds = chapterMemberships.map(m => m.user_id);
        if (chapterUserIds.length === 0) {
            return res.status(200).json([]);
        }

        const results = await TYFTB.aggregate([
            { $match: { payer_id: { $in: chapterUserIds } } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'payer_id',
                    foreignField: '_id',
                    as: 'payer'
                }
            },
            { $unwind: { path: "$payer", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'receiver_id',
                    foreignField: '_id',
                    as: 'receiver'
                }
            },
            { $unwind: { path: "$receiver", preserveNullAndEmptyArrays: true } }
        ]);

        return res.status(200).json(results);
    } catch (error) {
        console.error('Error in /getalltyftb:', error);
        return res.status(500).json({ error: error.message });
    }
});

router.get('/gettyftbbyid/:id',

    idValidation,
    handleValidationErrors,
    async (req, res) => {
        try {
            const [doc] = await TYFTB.aggregate([
                { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
                {
                    $lookup: {
                        from: 'referrals',
                        localField: 'referral_id',
                        foreignField: '_id',
                        as: 'referral'
                    }
                },
                { $unwind: { path: '$referral', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'profiles',
                        localField: 'payer_id',
                        foreignField: '_id',
                        as: 'payer'
                    }
                },
                { $unwind: { path: '$payer', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'profiles',
                        localField: 'receiver_id',
                        foreignField: '_id',
                        as: 'receiver'
                    }
                },
                { $unwind: { path: '$receiver', preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        referral: { referral_code: 1, contact_name: 1 },
                        payer: { _id: 1, display_name: 1 },
                        receiver: { _id: 1, display_name: 1 },
                        business_type: 1,
                        referral_type: 1,
                        business_amount: 1,
                        currency: 1,
                        business_description: 1,
                        date_closed: 1,
                        invoice_number: 1,
                        status: 1,
                        verification_status: 1,
                        created_at: 1,
                        createdAt: 1,
                        updatedAt: 1
                    }
                }
            ]);
            if (!doc) return res.status(404).json({ message: 'TYFTB record not found' });
            res.status(200).json(doc);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
);

router.put('/updatetyftbbyid/:id',

    updateTyftbValidation,
    handleValidationErrors,
    mapNamesToIds,
    async (req, res) => {
        try {
            const updated = await TYFTB.findByIdAndUpdate(
                req.params.id,
                req.body,
                { new: true, runValidators: true }
            );
            if (!updated)
                return res.status(404).json({ message: 'TYFTB record not found' });

            const [doc] = await TYFTB.aggregate([
                { $match: { _id: new mongoose.Types.ObjectId(updated._id) } },
                { $lookup: { from: 'referrals', localField: 'referral_id', foreignField: '_id', as: 'referral' } },
                { $unwind: { path: '$referral', preserveNullAndEmptyArrays: true } },
                { $lookup: { from: 'profiles', localField: 'payer_id', foreignField: '_id', as: 'payer' } },
                { $unwind: { path: '$payer', preserveNullAndEmptyArrays: true } },
                { $lookup: { from: 'profiles', localField: 'receiver_id', foreignField: '_id', as: 'receiver' } },
                { $unwind: { path: '$receiver', preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        referral: { referral_code: 1, contact_name: 1 },
                        payer: { _id: 1, display_name: 1 },
                        receiver: { _id: 1, display_name: 1 },
                        business_type: 1,
                        referral_type: 1,
                        business_amount: 1,
                        currency: 1,
                        business_description: 1,
                        date_closed: 1,
                        invoice_number: 1,
                        verification_status: 1,
                        created_at: 1,
                        status: 1,
                        createdAt: 1,
                        updatedAt: 1
                    }
                }
            ]);
            res.status(200).json(doc);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
);

router.put('/updatebulktyftbstatusbypayer',

    updateBulkTyftbValidation,
    handleValidationErrors,
    async (req, res) => {
        try {
            const { list } = req.body;
            const result = await TYFTB.updateMany(
                { payer_id: { $in: list } },
                { $set: { status: true } }
            );
            if (result.matchedCount === 0 && result.modifiedCount === 0) {
                return res.status(200).json({ message: 'No TYFTB records found for the provided payers.' });
            }
            res.status(200).json({ message: `Updated ${result.modifiedCount} TYFTB records to status=true.` });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }
);

router.delete(
    '/deletetyftbbyid/:id',

    idValidation,
    handleValidationErrors,
    async (req, res) => {
        try {
            const deleted = await TYFTB.findByIdAndDelete(req.params.id);
            if (!deleted)
                return res.status(404).json({ message: 'TYFTB record not found' });
            res.status(200).json({ message: 'TYFTB record deleted successfully' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
);

export default router;
