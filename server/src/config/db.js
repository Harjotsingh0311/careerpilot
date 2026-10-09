import mongoose from 'mongoose';
import env from './env.js';

export async function connectDB() {
    await mongoose.connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000
    });

    console.log('MongoDB connected successfully');
}

export function getDatabaseStatus() {
    return mongoose.connection.readyState === 1
        ? 'connected'
        : 'down';
}

export default mongoose;
