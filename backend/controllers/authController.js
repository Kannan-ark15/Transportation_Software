const crypto = require('crypto');
const AuthModel = require('../models/authModel');

const hashPassword = (password, salt) => {
    return crypto.createHmac('sha256', salt).update(password).digest('hex');
};

const register = async (req, res, next) => {
    try {
        const { full_name, email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        const existing = await AuthModel.findByEmail(email);
        if (existing) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        const salt = crypto.randomBytes(16).toString('hex');
        const password_hash = hashPassword(password, salt);
        const user = await AuthModel.createUser({ full_name, email, password_hash, password_salt: salt });

        res.status(201).json({ success: true, message: 'Account created successfully', data: user });
    } catch (error) {
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        const user = await AuthModel.findByEmail(email);
        if (!user || !user.is_active) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const computedHash = hashPassword(password, user.password_salt);
        if (computedHash !== user.password_hash) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: { id: user.id, full_name: user.full_name, email: user.email }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { register, login };
