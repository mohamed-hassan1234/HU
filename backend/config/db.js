const mongoose = require('mongoose');

mongoose.set('bufferCommands', false);

const connectDB = async () => {
  const uri = process.env.MONGO_URI
    || (process.env.NODE_ENV !== 'production' ? 'mongodb://127.0.0.1:27017/hucems_db' : null);
  if (!uri) {
    throw new Error('MONGO_URI is required in production. Configure it with the deployed hucems_db connection string.');
  }
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000
  });
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
};

module.exports = connectDB;
