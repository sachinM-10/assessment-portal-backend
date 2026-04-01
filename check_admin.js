const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb://localhost:27017/knowledge-hub').then(async () => {
    const admin = await User.findOne({role: 'admin'});
    console.log("ADMIN:", admin ? admin.email : 'None found');
    process.exit(0);
});
