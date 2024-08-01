require("dotenv").config();

const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const taskSchema = new mongoose.Schema({
    taskName: {
        type: String,
        required: true
    },
    taskDescription: {
        type: String,
        required: true
    },
    taskCompleted: {
        type: Boolean,
        enum: ['complete', 'pending'],
        default: false
    },
    assigneDate: {
        type: Date,
        required: true
    },
    targetDate: {
        type: Date,
        required: true
    },
    priority: {
        type: String,
        enum: ['high', 'medium', 'low'],
        required: true
    }
}, { timestamps: true });


const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    birthday: {
        type: String,
        required: true
    },
    contact: {
        type: String,
        required: true
    },
    contact: {
        type: String,
        required: true,
    },
    accountnum: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true,
        // minlength: 6
    },
    cpassword: {
        type: String,
        required: true,
        // minlength: 6
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    super: {
        type: Boolean,
        default: false
    },
    tasks: [taskSchema],
    tokens: [
        {
            token: {
                type: String,
                required: true
            }
        }
    ]
}, { timestamps: true });

const key = process.env.SECREATKEY;

// generate token
userSchema.methods.generateToken = async function () {
    try {
        const token = await jwt.sign({
            _id: this._id.toString(),
        },
            key,
            {
                expiresIn: "1h"
            });
        this.tokens = this.tokens.concat({ token: token });
        await this.save();
        return token;
    } catch (error) {
        console.log("Token Error", error);
    }
}

const Data = mongoose.model("Employer", userSchema);

module.exports = Data;
