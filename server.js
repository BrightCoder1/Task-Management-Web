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
                expires: new Date(Date.now() + 6000000)
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
                        expires: new Date(Date.now() + 6000000)
                    })
                    res.status(201).redirect(`/overview/${user._id}`)
                } else if (user.isAdmin === true) {
                    res.cookie("token", token, {
                        expires: new Date(Date.now() + 6000000)
                    })
                    res.status(201).redirect(`/overview/${user._id}`)
                } else {
                    res.cookie("token", token, {
                        expires: new Date(Date.now() + 6000000)
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
app.get("/profile/:id", authmiddleware, async (req, res) => {
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
app.get("/setting/:id", authmiddleware, async (req, res) => {
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


// overview 
app.get("/overview/:id", authmiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const user = await Data.findById(id);

        if (user) {
            const allusers = await Data.find({});
            const filteruser = allusers.filter(user => !user.super);

            if (user.super === true) {
                res.status(201).render("super", {
                    user,
                    all: filteruser
                });
            } else if (user.isAdmin === true) {
                const employeeIDs = user.employer.map(emp => emp.employee);
                const employees = await Promise.all(employeeIDs.map(empID => Data.findById(empID)));

                res.status(201).render("admin", {
                    user,
                    employees
                });
            } else {
                res.status(201).render("employee", {
                    user
                });
            }
        } else {
            console.log("User not found");
            res.status(404).render("profile", { error: "User not found." });
        }
    } catch (error) {
        console.log(error);
        res.status(500).render("profile", { error: "Internal server error." });
    }
});


// tasks
app.get("/task/:id", authmiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const user = await Data.findById(id);
        if (user.super === true) {
            const allUsers = await Data.find({});
            let allTasks = [];
            allUsers.forEach(user => {
                user.tasks.forEach(task => {
                    allTasks.push({
                        _id: task._id,  // Add task ID here
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
            // Admin can view tasks of their employees
            const employeeIDs = user.employer.map(emp => emp.employee);
            const employees = await Promise.all(employeeIDs.map(empID => Data.findById(empID)));

            let allTasks = [];
            employees.forEach(employee => {
                employee.tasks.forEach(task => {
                    allTasks.push({
                        _id: task._id,
                        username: employee.username,
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

        }
        else {

            // const employeeIDs = user.employer.map(emp => emp.employee);
            // const employees = await Promise.all(employeeIDs.map(empId => Data.findById(empId)));
            // console.log(employees);


            // For regular users, only show their tasks
            const userTasks = user.tasks.map(task => ({
                _id: task._id,  // Add task ID here
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
        // res.status(500).render("profile", { error: "Internal server error.", user: req.user });
    }
});


// app.post("/tasks/update/:id", async (req, res) => {
//     const { id } = req.params;
//     const { status } = req.body;

//     try {
//         const user = await Data.findOneAndUpdate(
//             { "tasks._id": id },
//             { $set: { "tasks.$.taskCompleted": status === "true" } },
//             { new: true }
//         );

//         if (!user) {
//             return res.status(404).json({ msg: "Task not found" });
//         } else {
//             // Redirect to the task page after updating
//             // res.status(201).redirect(`/task/${user._id}`);
//             res.status(200).render("update");
//         }
//     } catch (error) {
//         console.log(error);
//         res.status(500).render("profile", { error: "Internal server error.", user: req.user });
//     }
// });




// addtask
app.get("/addtask/:id", async (req, res) => {
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

app.get("/addtask/edit/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const user = await Data.findOne({ "tasks._id": id }, { "tasks.$": 1 });
        if (!user) {
            return res.status(404).send("Task not found");
        }
        const taskToEdit = user.tasks[0];
        res.status(201).render("taskedit", {
            task: taskToEdit
        });
    } catch (error) {
        console.log(error);
        res.status(500).send("Server error");
    }
});



// update task 
app.post("/addtask/update/:id", async (req, res) => {
    const { id } = req.params;

    const { taskName, taskDescription, priority, assigneDate, targetDate, taskCompleted } = req.body;

    try {
        const task = await Data.findOneAndUpdate(
            { "tasks._id": id },
            {
                $set: {
                    "tasks.$.taskName": taskName,
                    "tasks.$.taskDescription": taskDescription,
                    "tasks.$.priority": priority,
                    "tasks.$.assigneDate": assigneDate,
                    "tasks.$.targetDate": targetDate,
                    "tasks.$.taskCompleted": taskCompleted
                }
            },
            { new: true }
        )

        res.status(201).redirect(`/addtask/${task._id}`)
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


app.get("/mytask/:id", authmiddleware, async (req, res) => {
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
app.get("/viewprofile/:id", authmiddleware, async (req, res) => {
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


app.post("/update/profile/:id", authmiddleware, async (req, res) => {
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
app.post("/update/password/:id", authmiddleware, async (req, res) => {
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

app.get("/admin/employerCount/:id", async (req, res) => {
    const { id } = req.params;
    console.log(id); // Make sure this logs the expected ID
    try {
        const admin = await Data.findById(id);
        if (!admin) {
            return res.status(404).json({ error: "Admin not found" });
        }
        const employerCount = admin.employer.length;
        res.json({ count: employerCount });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


// app.get("/admin/employerTask/:id",async (req, res) => {
//     const { id } = req.params;

//     try {
//         const admin = await Data.findById(id);
//         if (!admin) {
//             return res.status(404).json({ error: "Admin not found" });
//         }
//         const employerTask = admin.employer.map(emp => emp.employee);
//         console.log(employerTask[0])

//         for (let i = 0; i < employerTask.length; i++) {
//             return element = employerTask[i];
//         }
//         console.log(element);

//         const employerFind = await Data.findById(element);
//         console.log(employerFind);

//     } catch (error) {
//         console.log(error);
//     }
// })






app.get("/admin/employerTask/:id", async (req, res) => {
    const { id } = req.params;

    try {
        // Fetch the admin
        const admin = await Data.findById(id);
        if (!admin) {
            return res.status(404).json({ error: "Admin not found" });
        }

        // Extract all employee IDs
        const employeeIds = admin.employer.map(emp => emp.employee);

        // Array to store employee details
        const employees = [];

        // Variable to count total tasks
        let totalTasks = 0;

        // Fetch details for each employee ID
        for (const empId of employeeIds) {
            const employee = await Data.findById(empId);
            if (employee) {
                // Add employee details to the array
                employees.push(employee);

                // Calculate the number of tasks
                totalTasks += employee.tasks ? employee.tasks.length : 0;
            } else {
                console.log(`Employee with ID ${empId} not found`);
            }
        }

        // Send the results as a JSON response
        res.json({ employees, totalTasks });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal Server Error" });
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



// assigne employee
app.get("/add/employee/user/:id", authmiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        // Fetching only non-admin and non-super employees
        const employees = await Data.find({
            isAdmin: false,
            super: false
        });

        // Fetching only admin users for managers
        const managers = await Data.find({ isAdmin: true });

        // Create a dictionary to store the manager for each employee
        let employeeManagerMap = {};

        // Iterate through the managers and their employees
        for (const manager of managers) {
            for (const emp of manager.employer) {
                const employee = await Data.findById(emp.employee);
                if (employee) {
                    if (!employeeManagerMap[employee._id]) {
                        employeeManagerMap[employee._id] = new Set();
                    }
                    employeeManagerMap[employee._id].add(manager.username);
                }
            }
        }

        // Convert the sets to arrays for rendering
        for (let employeeId in employeeManagerMap) {
            employeeManagerMap[employeeId] = Array.from(employeeManagerMap[employeeId]);
        }

        res.status(200).render("adduser", {
            employees,
            managers,
            employeeManagerMap
        });
    } catch (error) {
        console.log(error);
        res.status(500).send("Internal Server Error");
    }
});


// Route to remove a manager from an employee's team
app.post("/remove/manager/from/team/:employeeId", authmiddleware, async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { managerId } = req.body; // Get managerId from the form data

        // Fetch the manager
        const manager = await Data.findById(managerId);
        if (!manager) {
            return res.status(404).send("Manager not found");
        }

        // Remove the employee from the manager's employer array
        manager.employer = manager.employer ? manager.employer.filter(emp => emp.employee.toString() !== employeeId) : [];
        await manager.save();

        // Fetch the employee
        const employee = await Data.findById(employeeId);
        if (!employee) {
            return res.status(404).send("Employee not found");
        }

        // Remove the manager from the employee's manager list
        employee.managers = employee.managers ? employee.managers.filter(mgr => mgr.toString() !== managerId) : [];
        await employee.save();

        // Redirect back to the employee assignment page or another appropriate page
        res.redirect(`/add/employee/user/${employeeId}`);
    } catch (error) {
        console.log(error);
        res.status(500).send("Internal Server Error");
    }
});

// Route to assign an employee to a manager
app.post("/assign/employee/:id", async (req, res) => {
    try {
        const { id } = req.params; // Employee ID
        const { managerId } = req.body; // Manager ID from the form

        // Find the manager by ID and update their employer field
        const manager = await Data.findById(managerId);
        if (!manager) {
            return res.status(404).send("Manager not found");
        }

        // Ensure manager.employer is initialized
        if (!manager.employer) {
            manager.employer = [];
        }

        manager.employer.push({ employee: id });
        await manager.save();
        res.redirect(`/add/employee/user/${id}`);
    } catch (error) {
        console.log(error);
        res.status(500).send("Internal Server Error");
    }
});




connectDB().then(() => {
    app.listen(port, () => {
        console.log(`http://localhost:${port}/login`);
    });
});
