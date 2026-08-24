import mongoose from 'mongoose';
import { EarnedBadge } from './src/schemas.mjs';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGODB_URL);
    const badges = await EarnedBadge.find();
    console.log("Total EarnedBadges:", badges.length);
    if (badges.length > 0) {
        console.log("Sample badge:", badges[0]);
    }
    process.exit(0);
}
run().catch(console.error);
