require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const app = express();
const port = process.env.PORT;
const connectDB = require('./database/dbconnect');
const path = require("path");
const staticpath = path.join(__dirname, "./public");
const Data = require("./database/dbschema");
const jwt = require("jsonwebtoken");
const cookieParser = require('cookie-parser');
const authmiddleware = require("./middleware/auth-middleware");


app.use(cookieParser());
app.use(express.json());
app.set("view engine", "ejs");
app.use(express.static(staticpath));
app.use(express.urlencoded({ extended: false }));



// Register Page
app.get("/register", (req, res) => {
    res.status(201).render("register");
});


app.post("/register", async (req, res) => {
    const { username, email, birthday, address, accountnum, contact, password, cpassword } = req.body;

    const user = await Data.findOne({ email: email });

    if (password === cpassword) {
        if (!user) {
            const newuser = new Data({ username, email, birthday, address, accountnum, contact, password, cpassword });

            // generate token
            const token = await newuser.generateToken();
            res.cookie("Token", token, {
                expires: new Date(Date.now() + 60000)
            });

            await newuser.save();

            res.status(201).redirect("/login");
        } else {
            res.status(409).render("register", { error: "Email already exists!" });
        }
    } else {
        res.status(400).render("register", { error: "Password or Confirm Password do not match!" });
    }
});

// Login Route
app.get("/login", (req, res) => {
    res.status(201).render("login");
});

app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await Data.findOne({ email: email });

        // generate token 
        const token = await user.generateToken();
        console.log(token);
        if (user) {
            if (password === user.password) {
                if (user.super === true) {

                    res.cookie("token", token, {
                        expires: new Date(Date.now() + 60000)
                    })
                    res.status(201).redirect(`/overview/${user._id}`)
                } else if (user.isAdmin === true) {
                    res.cookie("token", token, {
                        expires: new Date(Date.now() + 60000)
                    })
                    res.status(201).redirect(`/overview/${user._id}`)
                } else {
                    res.cookie("token", token, {
                        expires: new Date(Date.now() + 60000)
                    })
                    res.status(201).redirect(`/overview/${user._id}`)

                }
            } else {
                res.status(409).render("login", { error: "Invalid Details !" });
            }
        } else {
            res.status(409).render("login", { error: "Invalid Details !" });
        }
    } catch (error) {
        console.log(error);
        res.status(500).render("login", { error: "User Not Found !" });
    }
});

// // Profile
app.get("/profile/:id", authmiddleware ,async (req, res) => {
    try {
        const { id } = req.params;

        const user = await Data.findById(id);
        if (user) {
            res.status(201).render("profile", {
                user,
                id: user._id
            });
        } else {
            console.log("User Not Found");
            res.status(404).render("profile", { error: "User not found!" });
        }
    } catch (error) {
        console.log(error);
        res.status(500).render("profile", { error: "Internal server error." });
    }
});

// // Setting Route
app.get("/setting/:id", authmiddleware ,async (req, res) => {
    try {
        const { id } = req.params;

        const user = await Data.findById(id);
        if (user) {
            if (user.super === true) {
                res.status(201).render("setting", {
                    user
                })
            } else if (user.isAdmin === true) {
                res.status(201).render("setting", {
                    user
                })
            } else {
                res.status(201).render("setting", {
                    user
                })
            }
        }
        else {
            console.log("User not found")
        }
    } catch (error) {
        console.log(error);
        res.status(500).render("setting", { error: "Internal server error." });
    }
});

// // Overview Route
app.get("/overview/:id",authmiddleware,async (req, res) => {
    try {
        const { id } = req.params;
        const user = await Data.findById(id);

        console.log(user);
        if (user) {
            const allusers = await Data.find({});

            const filteruser = allusers.filter(user => !user.super);

            if (user.super === true) {
                res.status(201).render("super", {
                    user,
                    all: filteruser
                })
            } else if (user.isAdmin === true) {
                res.status(201).render("admin", {
                    user,
                    all: filteruser
                })
            } else {
                res.status(201).render("employee", {
                    user
                })
            }
        }
        else {
            console.log("User not found")
        }
    } catch (error) {
        console.log(error);
        res.status(500).render("profile", { error: "Internal server error." });
    }
});

// tasks
app.get("/task/:id",authmiddleware ,async (req, res) => {
    try {
        const { id } = req.params;
        const user = await Data.findById(id);

        if (user.super === true) {
            const allUsers = await Data.find({});
            let allTasks = [];
            allUsers.forEach(user => {
                user.tasks.forEach(task => {
                    allTasks.push({
                        username: user.username,
                        taskName: task.taskName,
                        taskDescription: task.taskDescription,
                        taskCompleted: task.taskCompleted,
                        assigneDate: task.assigneDate,
                        targetDate: task.targetDate,
                        priority: task.priority
                    });
                });
            });

            res.status(201).render("task", {
                tasks: allTasks,
                user
            });
        } else if (user.isAdmin === true) {
            const allUsers = await Data.find({});
            let allTasks = [];
            allUsers.forEach(user => {
                user.tasks.forEach(task => {
                    allTasks.push({
                        username: user.username,
                        taskName: task.taskName,
                        taskDescription: task.taskDescription,
                        taskCompleted: task.taskCompleted,
                        assigneDate: task.assigneDate,
                        targetDate: task.targetDate,
                        priority: task.priority
                    });
                });
            });

            res.status(201).render("task", {
                tasks: allTasks,
                user
            });
        } else {
            // For regular users, only show their tasks
            const userTasks = user.tasks.map(task => ({
                username: user.username,
                taskName: task.taskName,
                taskDescription: task.taskDescription,
                taskCompleted: task.taskCompleted,
                assigneDate: task.assigneDate,
                targetDate: task.targetDate,
                priority: task.priority
            }));

            res.status(201).render("task", {
                tasks: userTasks,
                user
            });
        }
    } catch (error) {
        console.log(error);
        res.status(500).render("profile", { error: "Internal server error.", user: req.user });
    }
});


// addtask
app.get("/addtask/:id",async (req, res) => {
    try {
        const { id } = req.params;
        const user = await Data.findById(id);

        if (!user) {
            res.status(201).redirect("/register");
        } else {
            res.status(201).render("addtask", {
                user,
                tasks: user.tasks
            })
        }
    } catch (error) {
        console.log(error);
    }
})

// taskadd
app.post("/tasks/add", async (req, res) => {
    try {
        const { userId, taskName, taskDescription, assigneDate, targetDate, priority } = req.body;

        const user = await Data.findById(userId);

        const formattedAssigneDate = new Date(assigneDate).toISOString();
        const formattedTargetDate = new Date(targetDate).toISOString();

        if (!user) {
            res.status(404).render("login", { error: "Internal server error." });
        } else {
            user.tasks.push({
                taskName,
                taskDescription,
                taskCompleted: false,
                assigneDate: formattedAssigneDate,
                targetDate: formattedTargetDate,
                priority
            });

            await user.save();

            res.status(201).redirect(`/addtask/${user._id}`);
        }
    } catch (error) {
        console.log(error);
        res.status(500).render("error", { error: "Server error." }); // Example error handling
    }
});


app.get("/mytask/:id",authmiddleware ,async (req, res) => {
    try {
        const { id } = req.params;
        const user = await Data.findById(id);

        if (user.isAdmin) {
            res.status(201).render("mytask", {
                tasks: user.tasks,
                user
            });
        }
    } catch (error) {
        console.log(error);
    }
})



// view profile
app.get("/viewprofile/:id",authmiddleware ,async (req, res) => {
    try {
        const { id } = req.params;
        const user = await Data.findById(id);

        if (!user) {
            res.status(500).render("login", { error: "User Not Found" });
        } else {
            res.status(201).render("viewprofile", {
                user
            })
        }

    } catch (error) {
        console.log(error);
    }
})


// update user edit file
app.get("/edit/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const user = await Data.findById(id);

        if (!user) {
            res.status(201).redirect("/login")
        } else {
            res.render("edit", {
                user: user
            })
        }
    } catch (error) {
        console.log(error);
    }
})


app.post("/update/:id", async (req, res) => {
    const { id } = req.params;
    const { username, email, contact, birthday, address, isAdmin } = req.body;

    // Convert isAdmin to boolean
    const isAdminBoolean = (isAdmin === 'true');

    try {
        const updatedUser = await Data.findByIdAndUpdate(id, {
            username, email, contact, birthday, address, isAdmin: isAdminBoolean
        }, { new: true });

        if (!updatedUser) {
            return res.status(404).send("User not found");
        }

        res.redirect(`/edit/${updatedUser._id}`)
    } catch (error) {
        console.log(error);
        res.status(500).send("Internal Server Error");
    }
});

 
app.post("/update/profile/:id",authmiddleware, async (req, res) => {
    const { id } = req.params;
    const { username, email, birthday, address } = req.body;

    try {
        const user = await Data.findByIdAndUpdate(id, {
            username, email, birthday, address
        }, {
            new: true
        });

        res.status(201).redirect(`/overview/${user._id}`);

    } catch (error) {
        console.log(error);
    }
})

// updatepassword
app.post("/update/password/:id",authmiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { currentpassword, password, cpassword } = req.body;

        const userfind = await Data.findById(id);

        if (currentpassword === userfind.password) {
            const user = await Data.findByIdAndUpdate(id, {
                password, cpassword
            },
                {
                    new: true
                }
            )
            res.status(201).redirect(`/overview/${user._id}`);
        } else {
            console.log("Current password wrong!");
        }

    } catch (error) {
        console.log(error);
    }
})

// delete user
app.get("/delete/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const deletedUser = await Data.findByIdAndDelete(id);

        res.status(201).render("delete", {
            user: deletedUser.username
        });

    } catch (error) {
        console.log(error);

    }
});


// logout
app.get("/logout", async (req, res) => {
    try {
        res.clearCookie("token");
        res.redirect("login")
    } catch (error) {
        console.log(error);
    }
})



// Employee Counter route
app.get("/employeeCount", async (req, res) => {
    try {
        const totalUser = await Data.countDocuments({ super: { $ne: true } });
        res.json({ count: totalUser });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal server error" });
    }
});



// Task Counter route
app.get("/taskCount", async (req, res) => {
    try {
        const allUsers = await Data.find({});
        let taskCount = 0;
        allUsers.forEach(user => {
            taskCount += user.tasks.length;
        });
        res.json({ count: taskCount });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal server error" });
    }
});


app.get("/completTask", async (req, res) => {
    try {
        const completeTask = await Data.find({});
        let completeCount = 0;

        completeTask.forEach(user => {
            user.tasks.forEach(task => {
                if (task.taskCompleted) {
                    completeCount += 1;
                }
            })
        })
        res.json({ count: completeCount });
    } catch (error) {
        console.log(error);
    }
})




connectDB().then(() => {
    app.listen(port, () => {
        console.log(`http://localhost:${port}/register`);
    });
});
