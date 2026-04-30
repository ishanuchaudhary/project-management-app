const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Dummy user storage for demonstration
let users = {};

// Signup function
exports.signup = async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    users[username] = {password: hashedPassword};
    res.status(201).send('User created!');
};

// Login function
exports.login = async (req, res) => {
    const { username, password } = req.body;
    const user = users[username];
    if (user && (await bcrypt.compare(password, user.password))) {
        const token = jwt.sign({ username }, 'your_jwt_secret'); // Replace with a secure secret
        res.json({ token });
    } else {
        res.status(400).send('Invalid credentials');
    }
};

// Logout function
exports.logout = (req, res) => {
    // Implementation depends on your strategy, e.g., clearing tokens
    res.send('Logged out!');
};

// Function to refresh token
exports.refreshToken = (req, res) => {
    // Implementation logic here
    res.send('Token refreshed!');
};

// Password reset function
exports.resetPassword = async (req, res) => {
    const { username, newPassword } = req.body;
    const user = users[username];
    if (user) {
        user.password = await bcrypt.hash(newPassword, 10);
        res.send('Password reset successful!');
    } else {
        res.status(404).send('User not found');
    }
};