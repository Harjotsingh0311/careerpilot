import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import SkillCatalog from '../models/SkillCatalog.js';
import RoleProfile from '../models/RoleProfile.js';

const directory = path.dirname(fileURLToPath(import.meta.url));

async function readJson(fileName) {
    const text = await fs.readFile(path.join(directory, fileName), 'utf8');
    return JSON.parse(text.replace(/^\uFEFF/, ''));
}

async function seedRoles() {
    const [skills, roles] = await Promise.all([
        readJson('skills.json'),
        readJson('roles.json')
    ]);

    await connectDB();

    for (const skill of skills) {
        await SkillCatalog.updateOne(
            { name: skill.name },
            { $set: skill },
            { upsert: true, runValidators: true }
        );
    }

    for (const role of roles) {
        await RoleProfile.updateOne(
            { slug: role.slug },
            { $set: role },
            { upsert: true, runValidators: true }
        );
    }

    console.log(`Canonical skills processed: ${skills.length}`);
    console.log(`Role profiles processed: ${roles.length}`);
    console.log(`Total catalog skills: ${await SkillCatalog.countDocuments()}`);
    console.log(`Total role profiles: ${await RoleProfile.countDocuments()}`);
}

try {
    await seedRoles();
} catch (error) {
    console.error('Role seeding failed:', error.name || 'UnknownError');
    process.exitCode = 1;
} finally {
    await mongoose.disconnect().catch(() => {});
}
