const crypto = require('crypto');
const AuthModel = require('../models/authModel');

const hashPassword = (password, salt) => {
    return crypto.createHmac('sha256', salt).update(password).digest('hex');
};

const normalizeLoginPrefix = (val) => {
    const raw = String(val || '').toUpperCase().trim();
    const map = {
        ARIYALUR: 'ARY',
        ALATHIYUR: 'PND',
        'HEAD OFFICE': 'HOF',
        HEADOFFICE: 'HOF',
        HOF: 'HOF',
        ARY: 'ARY',
        PND: 'PND'
    };
    return map[raw] || '';
};

const register = async (req, res, next) => {
    try {
        const { full_name, email, password, login_prefix } = req.body;
        const normalizedPrefix = normalizeLoginPrefix(login_prefix);

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }
        if (!normalizedPrefix) {
            return res.status(400).json({ success: false, message: 'Login branch is required' });
        }

        const existing = await AuthModel.findByEmail(email);
        if (existing) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        const salt = crypto.randomBytes(16).toString('hex');
        const password_hash = hashPassword(password, salt);
        const user = await AuthModel.createUser({ full_name, email, login_prefix: normalizedPrefix, password_hash, password_salt: salt });

        res.status(201).json({ success: true, message: 'Account created successfully', data: user });
    } catch (error) {
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password, login_prefix } = req.body;
        const normalizedPrefix = normalizeLoginPrefix(login_prefix);

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }
        if (!normalizedPrefix) {
            return res.status(400).json({ success: false, message: 'Login branch is required' });
        }

        const user = await AuthModel.findByEmail(email);
        if (!user || !user.is_active) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const computedHash = hashPassword(password, user.password_salt);
        if (computedHash !== user.password_hash) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        if (user.login_prefix !== normalizedPrefix) {
            await AuthModel.updateLoginPrefix(user.id, normalizedPrefix);
        }

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: { id: user.id, full_name: user.full_name, email: user.email, login_prefix: normalizedPrefix }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { register, login };
