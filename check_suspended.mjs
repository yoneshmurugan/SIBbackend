import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User, Membership } from './src/schemas.mjs';

dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("Connected to MongoDB.");

    const suspendedMemberships = await Membership.find({ membership_status: false }).populate('user_id');
    console.log(`Found ${suspendedMemberships.length} suspended memberships.`);
    
    for (const mem of suspendedMemberships) {
      console.log(`User: ${mem.user_id?.username}, Membership Status: ${mem.membership_status}, User Status: ${mem.user_id?.status}`);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
