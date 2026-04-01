require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const SubjectQuestion = require('./models/SubjectQuestion');
const SubjectAttempt = require('./models/SubjectAttempt');

mongoose.connect('mongodb://127.0.0.1:27017/knowledge-hub')
    .then(async () => {
        const c_count = await SubjectQuestion.countDocuments({ subject: 'C' });
        const python_count = await SubjectQuestion.countDocuments({ subject: 'Python' });
        const java_count = await SubjectQuestion.countDocuments({ subject: 'Java' });
        console.log(`Questions -> C: ${c_count}, Python: ${python_count}, Java: ${java_count}`);

        const attempts = await SubjectAttempt.find({});
        console.log(`Total Attempts: ${attempts.length}`);
        
        // Delete all attempts to reset state
        await SubjectAttempt.deleteMany({});
        console.log('Cleared all attempts!');

        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
