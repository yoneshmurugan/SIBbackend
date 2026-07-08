import express from "express";
import mongoose from "mongoose";
import { Notification, Membership, User } from "../../schemas.mjs";
import { createNotificationValidation, getNotificationsValidation, createbulkNotificationValidation, getNotificationByIdValidation, updateNotificationValidation, deleteNotificationValidation, createBulkNotificationwithoutSenderValidation } from "../../validators.mjs";
import { handleValidationErrors, mapNamesToIds } from "../../middlewares.mjs";
import { sendPushNotification } from "../../utils/fcmHelper.mjs";
import transporter from '../Auth/transporter.mjs';

const router = express.Router();

import { body } from "express-validator";
const assertBodyObjectIds = [
    body("receiver").optional().custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage("receiver must be ObjectId"),
    body("sender").optional().custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage("sender must be ObjectId"),
];

router.post(
    "/createnotification",
    createNotificationValidation,
    handleValidationErrors,
    mapNamesToIds,
    assertBodyObjectIds,
    handleValidationErrors,
    async (req, res) => {
        try {
            const { receiver, sender, header, content, read, readAt, data } = req.body;
            const notif = new Notification({ receiver, sender, header, content, read, readAt });
            await notif.save();
            sendPushNotification([receiver], header, content, data);
            res.status(201).json(notif);
        } catch (err) {
            res.status(400).json({ error: err.message || "Failed to create notification" });
        }
    }
);

router.get(
    "/getallnotifications",
    getNotificationsValidation,
    (req, _res, next) => {
        if (typeof req.query.read === "string") {
            req.query.read = req.query.read === "true";
        }
        next();
    },
    handleValidationErrors,
    async (req, res) => {
        try {
            const { read } = req.query;
            const filter = {};
            filter.receiver = req.userid;
            if (read !== undefined) filter.read = read;
            const notifications = await Notification.find(filter).sort({ createdAt: -1 });
            res.json(notifications);
        } catch (err) {
            res.status(500).json({ error: err.message || "Failed to fetch notifications" });
        }
    }
);

router.get(
    "/getnotificationbyid/:id",
    getNotificationByIdValidation,
    handleValidationErrors,
    async (req, res) => {
        try {
            const notif = await Notification.findById(req.params.id);
            if (!notif) return res.status(404).json({ error: "Notification not found" });
            res.json(notif);
        } catch (err) {
            res.status(500).json({ error: err.message || "Failed to get notification" });
        }
    }
);

router.patch(
    "/updatenotificationbyid/:id",
    updateNotificationValidation,
    handleValidationErrors,
    async (req, res) => {
        try {
            const updateFields = {};
            const allowed = ["header", "content", "read", "readAt"];
            allowed.forEach((k) => {
                if (k in req.body) updateFields[k] = req.body[k];
            });
            const notif = await Notification.findByIdAndUpdate(
                req.params.id,
                { $set: updateFields },
                { new: true, runValidators: true }
            );
            if (!notif) return res.status(404).json({ error: "Notification not found" });
            res.json(notif);
        } catch (err) {
            res.status(400).json({ error: err.message || "Failed to update notification" });
        }
    }
);

router.delete(
    "/deletenotificationbyid/:id",
    deleteNotificationValidation,
    handleValidationErrors,
    async (req, res) => {
        try {
            const notif = await Notification.findByIdAndDelete(req.params.id);
            if (!notif) return res.status(404).json({ error: "Notification not found" });
            res.json({ success: true, deleted: notif });
        } catch (err) {
            res.status(500).json({ error: err.message || "Failed to delete notification" });
        }
    }
);

router.delete(
    "/deleteallnotifications",
    async (req, res) => {
        try {
            const result = await Notification.deleteMany({ receiver: req.userid });
            res.json({ success: true, deletedCount: result.deletedCount });
        } catch (err) {
            res.status(500).json({ error: err.message || "Failed to delete notifications" });
        }
    }
);

router.patch(
    "/readallnotifications",
    handleValidationErrors,
    async (req, res) => {
        try {

            const filter = { receiver: req.userid, read: { $ne: true } };
            const update = { $set: { read: true, readAt: new Date() } };

            const result = await Notification.updateMany(filter, update);
            const notifications = await Notification.find({ receiver: userObj._id })
                .sort({ createdAt: -1 });

            res.json({
                success: true,
                matchedCount: result.matchedCount ?? result.nMatched,
                modifiedCount: result.modifiedCount ?? result.nModified,
                notifications,
            });
        } catch (err) {
            res.status(500).json({ error: err.message || "Failed to update notifications" });
        }
    }
);

router.post(
    "/createbulknotifications",
    createbulkNotificationValidation,
    handleValidationErrors,
    async (req, res) => {
        try {
            req.body.sender = req.userid;
            const membership = await Membership.findOne({ user_id: req.userid });
            if (!membership || !membership.chapter_id) {
                return res.status(404).json({ error: "Membership or chapter not found." });
            }

            const chapterMemberships = await Membership.find({
                chapter_id: membership.chapter_id,
                membership_status: true
            }, 'user_id');

            if (!chapterMemberships || chapterMemberships.length === 0) {
                return res.status(404).json({ error: "No chapter members found for notifications." });
            }

            const { header, content, read = false, readAt = null, methods } = req.body;
            const inapp = methods?.inapp !== false;
            const push = methods?.push !== false;
            const email = methods?.email === true;
            
            const sender = req.userid;

            const targetUsers = chapterMemberships
                .filter(member => String(member.user_id) !== String(sender))
                .map(member => member.user_id);

            let notifications = [];

            if (inapp) {
                notifications = await Notification.insertMany(
                    targetUsers.map(user_id => ({
                        receiver: user_id,
                        sender,
                        header,
                        content,
                        read,
                        readAt
                    }))
                );
            }
            
            if (push) {
                sendPushNotification(targetUsers, header, content);
            }

            if (email) {
                const users = await User.find({ _id: { $in: targetUsers } }, 'email company_email');
                const emails = users.map(u => u.email || u.company_email).filter(Boolean);
                
                if (emails.length > 0) {
                    const mailOptions = {
                        from: process.env.GMAIL,
                        bcc: emails,
                        subject: header,
                        text: content
                    };
                    transporter.sendMail(mailOptions).catch(err => console.error("Email send error:", err));
                }
            }
            
            res.status(201).json({ message: "Bulk notifications created.", count: notifications.length });
        } catch (err) {
            res.status(400).json({ error: err.message || "Failed to create notifications" });
        }
    }
);

router.post(
    "/createnotificationwithoutsender",
    createNotificationValidation,
    handleValidationErrors,
    mapNamesToIds,
    assertBodyObjectIds,
    handleValidationErrors,
    async (req, res) => {
        try {
            req.body.sender = req.userid;
            const { receiver, sender, header, content, read, readAt } = req.body;
            const notif = new Notification({ receiver, sender, header, content, read, readAt });
            await notif.save();
            sendPushNotification([receiver], header, content);
            res.status(201).json(notif);
        } catch (err) {
            res.status(400).json({ error: err.message || "Failed to create notification" });
        }
    }
);

router.post(
    "/createbulknotificationwithoutsenderbyid",
    createBulkNotificationwithoutSenderValidation,
    handleValidationErrors,
    assertBodyObjectIds,
    handleValidationErrors,
    async (req, res) => {
        try {
            console.log(req.body)
            const { receiverList, header, content, read = false, readAt = null } = req.body;
            
            const sender = req.userid;

            const notificationsToInsert = receiverList.map(receiver => ({
                receiver,
                sender,
                header,
                content,
                read,
                readAt
            }));

            const result = await Notification.insertMany(notificationsToInsert);
            const receivers = result.map(n => n.receiver);
            sendPushNotification(receivers, header, content);
            res.status(201).json({ message: "Notifications created successfully", count: result.length });
        } catch (err) {
            res.status(400).json({ error: err.message || "Failed to create notification" });
        }
    }
);

router.post(
    "/createbulknotificationsforchapters",
    createbulkNotificationValidation,
    handleValidationErrors,
    async (req, res) => {
        try {
            const { chapterids = [], header, content, read = false, readAt = null, notifyInApp = true, notifyViaMail = false } = req.body;
            if (!Array.isArray(chapterids) || chapterids.length === 0) {
                return res.status(400).json({ error: "chapterids must be a non-empty array." });
            }
            if (!header || !content) {
                return res.status(400).json({ error: "header and content are required." });
            }
            const sender = req.userid;
            const chapterMemberships = await Membership.find({
                chapter_id: { $in: chapterids },
                membership_status: true,
                user_id: { $ne: sender }
            }, 'user_id chapter_id');

            if (!chapterMemberships.length) {
                return res.status(404).json({ error: "No chapter members found for notifications." });
            }

            const uniqueUserIds = [...new Set(chapterMemberships.map(m => String(m.user_id)))];

            let notifications = [];

            if (notifyInApp) {
                const notificationsToInsert = uniqueUserIds.map(user_id => ({
                    receiver: user_id,
                    sender,
                    header,
                    content,
                    read,
                    readAt
                }));

                notifications = await Notification.insertMany(notificationsToInsert);
                sendPushNotification(uniqueUserIds, header, content);
            }

            if (notifyViaMail) {
                const users = await User.find({ _id: { $in: uniqueUserIds } }, 'email company_email');
                const emails = users.map(u => u.email || u.company_email).filter(Boolean);
                
                if (emails.length > 0) {
                    const mailOptions = {
                        from: process.env.GMAIL,
                        bcc: emails,
                        subject: header,
                        text: content
                    };
                    transporter.sendMail(mailOptions).catch(err => console.error("Email send error:", err));
                }
            }

            res.status(201).json({
                message: "Alert dispatched successfully.",
                count: notifyInApp ? notifications.length : 0,
                receivers: uniqueUserIds
            });
        } catch (err) {
            res.status(400).json({ error: err.message || "Failed to create notifications" });
        }
    }
);

// Personal Wish notification
router.post("/send-personal-wish", async (req, res) => {
    try {
        const { receiverId, celebrationType = "special day" } = req.body;
        if (!receiverId) return res.status(400).json({ error: "receiverId is required" });

        const senderId = req.userid; 
        let senderName = "A member";

        if (senderId) {
            const sender = await User.findById(senderId);
            if (sender) {
                senderName = sender.username;
            }
        }

        const header = "🎉 Warm Wishes!";
        const content = `✨ ${senderName} just sent you a warm wish for your ${celebrationType}!`;
        const data = { action: "OPEN_WALL_OF_WISHES" };

        // Prevent spam: Check if sender already sent a wish to this receiver today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const existingWish = await Notification.findOne({
            receiver: receiverId,
            sender: senderId,
            header: header,
            createdAt: { $gte: todayStart }
        });

        if (existingWish) {
            return res.status(429).json({ error: "You have already sent a wish to this member today." });
        }

        const notif = new Notification({
            receiver: receiverId,
            sender: senderId,
            header,
            content,
            read: false,
            readAt: null
        });

        await notif.save();
        await sendPushNotification([receiverId], header, content, data);

        res.status(200).json({ message: "Wish sent successfully", notification: notif });
    } catch (err) {
        console.error("Error in /send-personal-wish:", err);
        res.status(500).json({ error: err.message || "Failed to send wish" });
    }
});

export default router;