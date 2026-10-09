import env from './config/env.js';
import app from './app.js';
import { connectDB } from './config/db.js';

try {
    await connectDB();

    app.listen(env.PORT, () => {
        console.log(
            `CareerPilot API running at http://localhost:${env.PORT}`
        );
    });
} catch (error) {
    // Never log the connection URI or database credentials.
    console.error('Failed to connect to MongoDB Atlas.');
    console.error('Check your connection string and Atlas network access.');
    console.error('Error type:', error.name || 'UnknownError');

    process.exitCode = 1;
}
