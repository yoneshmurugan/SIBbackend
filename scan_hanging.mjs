import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Membership, User } from './src/schemas.mjs';

dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("Connected to MongoDB.");

    const memberships = await Membership.find({});
    console.log(`Found ${memberships.length} chapter memberships.`);

    let hangingCount = 0;
    const hangingMemberships = [];

    for (const mem of memberships) {
      const user = await User.findById(mem.user_id);
      if (!user) {
        hangingCount++;
        hangingMemberships.push({
          membership_id: mem._id,
          user_id: mem.user_id,
          chapter_id: mem.chapter_id,
          role: mem.role
        });
      }
    }

    console.log(`\nFound ${hangingCount} hanging memberships (user does not exist).`);
    if (hangingCount > 0) {
      console.log(JSON.stringify(hangingMemberships, null, 2));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
