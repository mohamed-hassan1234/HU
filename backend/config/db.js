const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI
    || (process.env.NODE_ENV !== 'production' ? 'mongodb://127.0.0.1:27017/hucems_db' : null);
  if (!uri) {
    throw new Error('MONGO_URI is required in production. Configure it with the deployed hucems_db connection string.');
  }
  await mongoose.connect(uri);
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
};

module.exports = connectDB;
