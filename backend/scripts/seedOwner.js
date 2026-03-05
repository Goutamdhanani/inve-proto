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

    const ownerExists = await User.findOne({ role: 'owner' });
    if (ownerExists) {
      console.log('Owner account already exists. Skipping seed.');
      return;
    }

    const email = process.env.OWNER_EMAIL || 'owner@inventoryavengers.com';
    const password = process.env.OWNER_PASSWORD || 'OwnerSecure#2024';
    const passwordHash = await bcrypt.hash(password, 10);

    await User.create({
      name: 'Owner',
      email,
      passwordHash,
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
