import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import Question from '../models/Question.js';
import { TOPICS, DIFFICULTIES } from '../utils/assessmentConstants.js';

const directory = path.dirname(fileURLToPath(import.meta.url));
const questionDirectory = path.join(directory, 'questions');

async function loadQuestionBank() {
    const files = (await fs.readdir(questionDirectory))
        .filter(file => file.endsWith('.json'))
        .sort();

    const questions = [];

    for (const file of files) {
        const raw = await fs.readFile(
            path.join(questionDirectory, file),
            'utf8'
        );

        const entries = JSON.parse(raw.replace(/^\uFEFF/, ''));

        if (!Array.isArray(entries)) {
            throw new Error(file + ' must contain a JSON array.');
        }

        questions.push(...entries);
    }

    const keys = new Set();
    const prompts = new Set();

    for (const question of questions) {
        if (
            !question.seedKey ||
            !TOPICS.includes(question.topic) ||
            !DIFFICULTIES.includes(question.difficulty) ||
            typeof question.text !== 'string' ||
            !question.text.trim() ||
            !Array.isArray(question.options) ||
            question.options.length !== 4 ||
            question.options.some(option =>
                typeof option !== 'string' || !option.trim()
            ) ||
            new Set(question.options).size !== 4 ||
            !Number.isInteger(question.correctIndex) ||
            question.correctIndex < 0 ||
            question.correctIndex > 3 ||
            typeof question.explanation !== 'string' ||
            !question.explanation.trim()
        ) {
            throw new Error(
                'Invalid question record: ' +
                (question.seedKey || 'missing seedKey')
            );
        }

        const promptKey = question.topic + ':' +
            question.text.trim().toLowerCase();

        if (keys.has(question.seedKey)) {
            throw new Error('Duplicate seedKey: ' + question.seedKey);
        }

        if (prompts.has(promptKey)) {
            throw new Error('Duplicate prompt: ' + question.text);
        }

        keys.add(question.seedKey);
        prompts.add(promptKey);
    }

    if (questions.length < 150) {
        throw new Error(
            'The question bank requires at least 150 questions; found ' +
            questions.length
        );
    }

    const counts = Object.fromEntries(
        TOPICS.map(topic => [
            topic,
            questions.filter(question => question.topic === topic).length
        ])
    );

    for (const topic of TOPICS) {
        if (counts[topic] < 15) {
            throw new Error(
                'Topic ' + topic + ' requires at least 15 questions; found ' +
                counts[topic]
            );
        }
    }

    return { questions, files, counts };
}

async function seedQuestions() {
    // Validate every file and the complete bank before connecting to Atlas.
    const { questions, files, counts } = await loadQuestionBank();

    console.log('Validated files:', files.join(', '));
    console.log('Validated questions:', questions.length);
    console.log('Question coverage:', JSON.stringify(counts));

    await connectDB();

    for (const question of questions) {
        await Question.updateOne(
            { seedKey: question.seedKey },
            { $set: question },
            { upsert: true, runValidators: true }
        );
    }

    const total = await Question.countDocuments();

    const databaseCounts = await Question.aggregate([
        { $group: { _id: '$topic', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
    ]);

    console.log('Questions processed:', questions.length);
    console.log('Total questions in database:', total);
    console.log('Database coverage:', JSON.stringify(databaseCounts));
    console.log('Question bank seeding completed.');
}

try {
    await seedQuestions();
} catch (error) {
    console.error(
        'Question seeding failed:',
        error.message || error.name || 'Unknown error'
    );
    process.exitCode = 1;
} finally {
    await mongoose.disconnect().catch(() => {});
}
