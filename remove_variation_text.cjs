const mongoose = require('mongoose');
const SubjectQuestion = require('../backend/models/SubjectQuestion');
require('dotenv').config({ path: './backend/.env' });

const runMigration = async () => {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/knowledge-hub', { useNewUrlParser: true });
        console.log("Connected successfully.");

        // Find all questions that contain the "(Bank " string
        const questions = await SubjectQuestion.find({ question: { $regex: / \(Bank \d+ Variation \d+\)/ } });
        console.log(`Found ${questions.length} questions to clean...`);

        let updatedCount = 0;
        for (let q of questions) {
            const newQuestionText = q.question.replace(/ \(Bank \d+ Variation \d+\)/g, '');
            if (newQuestionText !== q.question) {
                q.question = newQuestionText;
                await q.save();
                updatedCount++;
            }
        }
        
        console.log(`✅ Success! Cleaned ${updatedCount} questions.`);
        process.exit(0);
    } catch (e) {
        console.error("Migration failed:", e);
        process.exit(1);
    }
};

runMigration();
