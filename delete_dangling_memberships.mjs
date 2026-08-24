import mongoose from 'mongoose';
import { Membership, User } from './src/schemas.mjs';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGODB_URL);
    
    console.log("Checking for dangling memberships...");
    
    // Find all memberships
    const memberships = await Membership.find();
    let deletedCount = 0;
    
    for (const m of memberships) {
        if (!m.user_id) {
            console.log(`Deleting membership ${m._id} because user_id is completely missing.`);
            await Membership.deleteOne({ _id: m._id });
            deletedCount++;
            continue;
        }
        
        // Verify the user actually exists in the Users collection
        const userExists = await User.findById(m.user_id);
        if (!userExists) {
            console.log(`Deleting membership ${m._id} because referenced user ${m.user_id} no longer exists in DB.`);
            await Membership.deleteOne({ _id: m._id });
            deletedCount++;
        }
    }
    
    console.log(`\nCleanup complete! Deleted ${deletedCount} dangling memberships.`);
    process.exit(0);
}
run().catch(console.error);
