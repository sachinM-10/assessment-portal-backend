const mongoose = require('mongoose');
const SubjectQuestion = require('./models/SubjectQuestion');

require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true })
  .then(async () => {
    console.log("Connected to DB.");
    const questions = await SubjectQuestion.find({});
    console.log("Subject Questions:");
    console.log(questions);
    process.exit(0);
  })
  .catch(console.error);
