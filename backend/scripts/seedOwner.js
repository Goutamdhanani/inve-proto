require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const seedOwner = async () => {
  const shouldConnect = mongoose.connection.readyState === 0;
  try {
    if (shouldConnect) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    const User = require('../models/User');

    const email = (process.env.OWNER_EMAIL || 'owner@inventoryavengers.com').toLowerCase();
    const password = process.env.OWNER_PASSWORD || 'OwnerSecure#2024';

    const existingOwner = await User.findOne({ role: 'owner' });

    if (existingOwner) {
      // Verify the existing owner can actually log in (detect double-hash corruption)
      const canLogin = await bcrypt.compare(password, existingOwner.passwordHash);
      if (canLogin) {
        console.log('Owner account already exists and is valid. Skipping seed.');
        return;
      }
      // Owner exists but password is corrupted (double-hashed) — fix it
      console.log('Owner account found but password is corrupted. Resetting password...');
      existingOwner.passwordHash = password; // plain text — pre-save hook will hash
      existingOwner.status = 'approved';
      await existingOwner.save();
      console.log(`Owner account password reset for: ${existingOwner.email}`);
      return;
    }

    // No owner exists — create one
    await User.create({
      name: 'Owner',
      email,
      passwordHash: password, // plain text — pre-save hook will hash
      role: 'owner',
      status: 'approved',
      mustChangePassword: true
    });

    console.log(`Owner account created: ${email}`);
  } catch (err) {
    console.error('seedOwner error:', err.message);
  } finally {
    if (shouldConnect) {
      await mongoose.disconnect();
    }
  }
};

if (require.main === module) {
  seedOwner();
}

module.exports = seedOwner;
