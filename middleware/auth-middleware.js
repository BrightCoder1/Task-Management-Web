const jwt = require("jsonwebtoken");

const authmiddleware = (req, res, next) => {
    const token = req.cookies.token;
    const key = process.env.SECREATKEY;

    if (!token) {
        return res.status(401).redirect("/login");
    }

    try {
        const verified = jwt.verify(token, key);
        req.user = verified;  // Attach the decoded user to the request
        next();  // Allow the request to proceed
    } catch (error) {
        console.log("Token verification failed", error);
        res.status(401).redirect("/login");
    }
};

module.exports = authmiddleware;
