import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import Question from '../models/Question.js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

async function seedQuestions() {
    const seedPath = path.join(currentDirectory, 'questions', 'core.json');
    const raw = await fs.readFile(seedPath, 'utf8');
    const questions = JSON.parse(raw.replace(/^\uFEFF/, ''));

    await connectDB();

    let written = 0;

    for (const question of questions) {
        await Question.updateOne(
            { seedKey: question.seedKey },
            { $set: question },
            { upsert: true, runValidators: true }
        );

        written += 1;
    }

    const total = await Question.countDocuments();

    console.log(`Starter questions processed: ${written}`);
    console.log(`Total questions currently in bank: ${total}`);
}

try {
    await seedQuestions();
} catch (error) {
    console.error('Question seeding failed:', error.name || 'UnknownError');
    process.exitCode = 1;
} finally {
    await mongoose.disconnect().catch(() => {});
}
