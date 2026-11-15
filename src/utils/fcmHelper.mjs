import admin from "../pages/Auth/firebase.mjs";
import { User } from "../schemas.mjs";

/**
 * Sends a push notification to multiple users.
 * @param {Array<String|ObjectId>} receiverIds - Array of user ObjectIds or user_ids
 * @param {String} title - Notification title
 * @param {String} body - Notification body
 */
export const sendPushNotification = async (receiverIds, title, body, data = {}) => {
    try {
        if (!receiverIds || receiverIds.length === 0) return;

        // Fetch users to get their FCM tokens (supports both ObjectId and user_id UID)
        const users = await User.find({
            $or: [
                { _id: { $in: receiverIds } },
                { user_id: { $in: receiverIds } }
            ]
        });
        
        let allTokens = [];
        let tokenToUserIdMap = {};

        users.forEach(user => {
            if (user.fcmTokens && user.fcmTokens.length > 0) {
                user.fcmTokens.forEach(token => {
                    allTokens.push(token);
                    tokenToUserIdMap[token] = user._id;
                });
            }
        });

        if (allTokens.length === 0) return;

        // Sanitize data payload for FCM: all keys and values MUST be strings
        const sanitizedData = {};
        if (data && typeof data === 'object') {
            for (const [key, val] of Object.entries(data)) {
                if (val !== undefined && val !== null) {
                    sanitizedData[String(key)] = typeof val === 'object' ? JSON.stringify(val) : String(val);
                }
            }
        }

        // Firebase sendMulticast accepts up to 500 tokens per batch
        const BATCH_SIZE = 500;
        const invalidTokens = [];

        for (let i = 0; i < allTokens.length; i += BATCH_SIZE) {
            const tokenBatch = allTokens.slice(i, i + BATCH_SIZE);
            
            const message = {
                notification: {
                    title,
                    body
                },
                android: {
                    priority: 'high',
                    notification: {
                        icon: 'ic_launcher',
                        color: '#d97706',
                        sound: 'default',
                        defaultSound: true,
                        defaultVibrateTimings: true
                    }
                },
                ...(Object.keys(sanitizedData).length > 0 ? { data: sanitizedData } : {}),
                apns: {
                    headers: {
                        'apns-priority': '10'
                    },
                    payload: {
                        aps: {
                            sound: 'default',
                            badge: 1
                        }
                    }
                },
                tokens: tokenBatch
            };

            const response = await admin.messaging().sendEachForMulticast(message);
            
            if (response.failureCount > 0) {
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        const errorCode = resp.error?.code;
                        // Identify invalid/expired tokens to remove from DB
                        if (
                            errorCode === 'messaging/invalid-registration-token' ||
                            errorCode === 'messaging/registration-token-not-registered'
                        ) {
                            invalidTokens.push(tokenBatch[idx]);
                        }
                    }
                });
            }
        }

        // Cleanup invalid tokens from database
        if (invalidTokens.length > 0) {
            // Group tokens by user to perform bulk update
            for (const user of users) {
                const userTokensToRemove = invalidTokens.filter(t => user.fcmTokens.includes(t));
                if (userTokensToRemove.length > 0) {
                    await User.updateOne(
                        { _id: user._id },
                        { $pull: { fcmTokens: { $in: userTokensToRemove } } }
                    );
                }
            }
        }
    } catch (error) {
        console.error("Error sending push notification:", error);
    }
};
