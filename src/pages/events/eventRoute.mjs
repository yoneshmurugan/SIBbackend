import express from 'express';
import mongoose from 'mongoose';
import { Event, User, Membership, Chapter, Notification } from '../../schemas.mjs';
import {
    idValidation,
    createEventValidation,
    updateEventValidation
} from '../../validators.mjs';
import { mapNamesToIds, handleValidationErrors } from '../../middlewares.mjs';
import { sendPushNotification } from '../../utils/fcmHelper.mjs';

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

            // Dispatch In-App & Mobile Push Notifications to Active Chapter Members
            try {
                const activeMemberships = await Membership.find({
                    chapter_id: req.chapter._id,
                    membership_status: true
                }, 'user_id');

                const senderId = req.userid;
                const targetUserIds = activeMemberships
                    .map(m => m.user_id)
                    .filter(uid => uid && String(uid) !== String(senderId));

                if (targetUserIds.length > 0) {
                    const eventDateStr = saved.event_date 
                        ? new Date(saved.event_date).toLocaleDateString('en-GB') 
                        : '';
                    const header = `New Chapter Event: ${saved.event_title}`;
                    const content = `A new event titled "${saved.event_title}" has been scheduled for ${eventDateStr} at ${saved.event_time || ''}${saved.location ? ` in ${saved.location}` : ''}. Please mark your calendar and join us.`;

                    // 1. In-App Notifications
                    await Notification.insertMany(
                        targetUserIds.map(uid => ({
                            receiver: uid,
                            sender: senderId,
                            header,
                            content,
                            data: {
                                action: "OPEN_EVENTS",
                                eventId: String(saved._id),
                                chapterId: String(req.chapter._id)
                            },
                            read: false
                        }))
                    );

                    // 2. Mobile Push Notifications (FCM + APNs)
                    sendPushNotification(
                        targetUserIds,
                        `New Event: ${saved.event_title}`,
                        `${eventDateStr} at ${saved.event_time || ''} • ${saved.location || req.chapter.chapter_name || 'Chapter Event'}`,
                        {
                            action: "OPEN_EVENTS",
                            eventId: String(saved._id)
                        }
                    ).catch(err => console.error("Push notification error on event create:", err));
                }
            } catch (notifErr) {
                console.error("Event notification dispatch error:", notifErr);
            }

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
                    chapter_id: req.chapter._id,
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
