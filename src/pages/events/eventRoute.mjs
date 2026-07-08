import express from 'express';
import mongoose from 'mongoose';
import { Event, User, Membership, Chapter } from '../../schemas.mjs';
import {
    idValidation,
    createEventValidation,
    updateEventValidation
} from '../../validators.mjs';
import { mapNamesToIds, handleValidationErrors } from '../../middlewares.mjs'

const router = express.Router();

router.post(
    '/createevent',
    createEventValidation,
    handleValidationErrors,
    mapNamesToIds,
    async (req, res) => {
        req.body.chapter_id = req.chapter._id;
        try {
            if (!req.body.chapter_id) {
                return res.status(400).json({ message: 'Valid chapter_name and created_by_username are required.' });
            }
            const doc = new Event(req.body);
            const saved = await doc.save();
            res.status(201).json({
                message: "success",
                id: saved._id
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
);

router.get('/getallevents', async (req, res) => {
    try {
        
        const chapter = await Chapter.findById(req.chapter._id);
        if (!chapter) {
            return res.status(404).json({ error: "Chapter not found." });
        }
        const docs = await Event.aggregate([
            { $match: { chapter_id: chapter._id } },
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
        res.status(500).json({ error: err.message });
    }
});

router.get('/geteventbyid/:id', idValidation, handleValidationErrors, async (req, res) => {
    try {
        const [doc] = await Event.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
            { $lookup: { from: 'chapters', localField: 'chapter_id', foreignField: '_id', as: 'chapter' } },
            { $unwind: { path: '$chapter', preserveNullAndEmptyArrays: true } },
            { $lookup: { from: 'users', localField: 'created_by', foreignField: '_id', as: 'created_by_user' } },
            { $unwind: { path: '$created_by_user', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    event_title: 1,
                    event_description: 1,
                    event_date: 1,
                    event_time: 1,
                    location: 1,
                    organizer_company: 1,
                    vat_number: 1,
                    event_type: 1,
                    max_attendees: 1,
                    current_attendees: 1,
                    event_status: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    chapter: { _id: 1, chapter_name: 1, chapter_code: 1 },
                    created_by_user: { _id: 1, username: 1, name: 1 }
                }
            }
        ]);
        if (!doc) return res.status(404).json({ message: 'Event not found' });
        res.status(200).json(doc);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put(
    '/updateevent',
    updateEventValidation,
    handleValidationErrors,
    async (req, res) => {
        try {
            const id = req.body._id;
            const updated = await Event.findByIdAndUpdate(
                id,
                req.body,
                { new: true, runValidators: true }
            );
            if (!updated) return res.status(404).json({ message: 'Event not found' });
            res.status(200).json({ message: "success", id: updated._id });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
);

router.delete('/deleteeventbyid/:id', idValidation, handleValidationErrors, async (req, res) => {
    try {
        const deleted = await Event.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Event not found' });
        res.status(200).json({ message: 'Event deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/getlatestevent', async (req, res) => {
    try {
        const now = new Date();
        const [doc] = await Event.aggregate([
            {
                $match: {
                    event_status: "upcoming",
                    event_date: { $gte: now }
                }
            },
            { $sort: { event_date: 1, event_time: 1 } },
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
                    event_date: 1,
                    event_time: 1,
                    event_type: 1,
                    duration: 1,
                    event_title: 1,
                    location: 1,
                    event_description: 1,
                    event_status: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    chapter: { _id: 1, chapter_name: 1, chapter_code: 1 }
                }
            }
        ]);
        if (!doc) return res.status(404).json({ message: 'No upcoming meetings found' });
        res.status(200).json(doc);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
