import { MongoClient, Db } from 'mongodb';
import mongoose from 'mongoose';

const MONGODB_URI = "mongodb+srv://shshams:shams.mongodb999@auth.2yerkbm.mongodb.net/?retryWrites=true&w=majority&appName=auth";

let client: MongoClient;
let db: Db;

export async function connectToDatabase() {
  if (!client) {
    console.log('Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db('nexxauth');
    console.log('Connected to MongoDB successfully');
  }
  return db;
}

export async function connectMongoose() {
  if (mongoose.connection.readyState === 0) {
    console.log('Connecting to MongoDB with Mongoose...');
    await mongoose.connect(MONGODB_URI, {
      dbName: 'nexxauth'
    });
    console.log('Connected to MongoDB with Mongoose successfully');
  }
  return mongoose.connection;
}

export { db };