require("dotenv").config();
const mongoose = require("mongoose");
const url = process.env.URL; 

const connectDB = async () => {
    try {
        await mongoose.connect(url);
        console.log(`Database connect on ${url}`);
    } catch (error) {
        console.log(error);
    }
}

module.exports = connectDB;