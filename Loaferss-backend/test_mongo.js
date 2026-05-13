require('dotenv').config();
const mongoose = require('mongoose');

console.log("Attempting to connect to MongoDB...");
console.log("URI:", process.env.MONGO_URI ? "Found" : "Not Found");

mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000
})
.then(() => {
    console.log("✅ MongoDB Connected Successfully!");
    process.exit(0);
})
.catch(err => {
    console.error("❌ MongoDB Connection Error:");
    console.error(err.message);
    process.exit(1);
});
