const mongoose = require('mongoose');
const Quiz = require('./models/Quiz');
const Question = require('./models/Question');
const QuizAttempt = require('./models/QuizAttempt');
const SubjectAttempt = require('./models/SubjectAttempt');
const User = require('./models/User');
require('dotenv').config({ path: './.env' });

const runMigration = async () => {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true });
        console.log("Connected successfully.");

        // Get users
        const users = await User.find();
        if (users.length === 0) {
            console.log("No users found. Please create users first.");
            process.exit(1);
        }

        const adminUser = users.find(u => u.role === 'admin') || users[0];
        const studentUsers = users.filter(u => u.role === 'student');

        if (studentUsers.length === 0) {
            console.log("No student users found, assigning attempts to admin for demo purposes.");
            studentUsers.push(adminUser);
        }

        // Generate Legacy Quizzes
        const quizzesToInsert = [
            { title: "General Knowledge", description: "Test your general knowledge.", category: "Trivia", timeLimitMinutes: 10, isPublished: true, createdBy: adminUser._id },
            { title: "Web Development Basics", description: "HTML, CSS, and JS basics.", category: "Programming", timeLimitMinutes: 15, isPublished: true, createdBy: adminUser._id }
        ];

        const insertedQuizzes = await Quiz.insertMany(quizzesToInsert);
        const gkQuiz = insertedQuizzes[0];
        const webQuiz = insertedQuizzes[1];

        // Generate Questions for Quizzes
        const questionsToInsert = [
            // GK Quiz Questions
            { quizId: gkQuiz._id, questionText: "What is the capital of France?", options: ["London", "Paris", "Berlin", "Madrid"], correctAnswer: "Paris", points: 1, sortOrder: 1 },
            { quizId: gkQuiz._id, questionText: "Which planet is known as the Red Planet?", options: ["Mars", "Venus", "Jupiter", "Saturn"], correctAnswer: "Mars", points: 1, sortOrder: 2 },
            // Web Dev Quiz Questions
            { quizId: webQuiz._id, questionText: "What does HTML stand for?", options: ["Hyper Text Markup Language", "High Tech Multi Language", "Home Tool Markup Language", "Hyperlinks and Text Markup Language"], correctAnswer: "Hyper Text Markup Language", points: 2, sortOrder: 1 },
            { quizId: webQuiz._id, questionText: "Which of these is a CSS framework?", options: ["React", "Angular", "Tailwind CSS", "Vue"], correctAnswer: "Tailwind CSS", points: 2, sortOrder: 2 }
        ];

        await Question.insertMany(questionsToInsert);

        // Generate Quiz Attempts
        const quizAttempts = [];
        studentUsers.forEach(student => {
            quizAttempts.push({
                quizId: gkQuiz._id,
                userId: student._id,
                score: 1,
                totalPoints: 2,
                percentage: 50,
                startedAt: new Date(Date.now() - 3600000),
                completedAt: new Date(),
                answers: []
            });
            quizAttempts.push({
                quizId: webQuiz._id,
                userId: student._id,
                score: 4,
                totalPoints: 4,
                percentage: 100,
                startedAt: new Date(Date.now() - 7200000),
                completedAt: new Date(Date.now() - 7100000),
                answers: []
            });
        });
        await QuizAttempt.insertMany(quizAttempts);

        // Generate Subject Attempts
        const subjectAttempts = [];
        const subjects = ['C', 'Python', 'Java'];
        studentUsers.forEach(student => {
            subjects.forEach(subject => {
                subjectAttempts.push({
                    userId: student._id,
                    subject: subject,
                    score: Math.floor(Math.random() * 20) + 10, // 10 to 30
                    total: 30,
                    completedAt: new Date(Date.now() - Math.random() * 10000000)
                });
            });
        });
        await SubjectAttempt.insertMany(subjectAttempts);

        console.log("✅ Success! Legacy Quizzes, Questions, QuizAttempts, and SubjectAttempts populated successfully.");
        process.exit(0);
    } catch (e) {
        console.error("Data Population failed:", e);
        process.exit(1);
    }
};

runMigration();
