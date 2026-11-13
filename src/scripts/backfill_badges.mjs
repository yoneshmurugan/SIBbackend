import dotenv from "dotenv";
dotenv.config();
import connectDB from "../utils/mongo_connection.mjs";
import { ensureAllPastMonthlyBadgesAwarded } from "../utils/cronJobs.mjs";

const run = async () => {
    console.log("Connecting to MongoDB...");
    await connectDB();
    console.log("Checking and awarding any missing monthly badges...");
    const awarded = await ensureAllPastMonthlyBadgesAwarded();
    if (awarded.length > 0) {
        console.log("✅ Successfully awarded badges for months:", awarded);
    } else {
        console.log("✅ All past completed months already have badges awarded!");
    }
    process.exit(0);
};

run().catch(err => {
    console.error("❌ Failed to backfill badges:", err);
    process.exit(1);
});

