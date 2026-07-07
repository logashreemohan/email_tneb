require('dotenv').config();
const sequelize = require('./src/config/database');
const User = require('./src/models/User');
const Report = require('./src/models/Report');

const seedData = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to SQLite');

    // Sync database and force recreate tables
    await sequelize.sync({ force: true });
    console.log('Database synced');

    // Add default admin and manager
    await User.create({ email: 'admin@emailshield.com', password: 'Admin@123', role: 'admin' });
    await User.create({ email: 'manager@emailshield.com', password: 'Manager@123', role: 'manager' });
    console.log('Seed successful: Created admin and manager users');
    
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
};

seedData();
