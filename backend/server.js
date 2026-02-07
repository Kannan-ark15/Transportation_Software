const express = require('express');
const cors = require('cors');
require('dotenv').config();

const companyRoutes = require('./routes/companyRoutes');
const productRoutes = require('./routes/productRoutes');
const driverRoutes = require('./routes/driverRoutes');
const pumpRoutes = require('./routes/pumpRoutes');
const placeRoutes = require('./routes/placeRoutes');
const dealerRoutes = require('./routes/dealerRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const ownerRoutes = require('./routes/ownerRoutes');
const bankRoutes = require('./routes/bankRoutes');
const rateCardRoutes = require('./routes/rateCardRoutes');
const templateRoutes = require('./routes/templateRoutes');
const authRoutes = require('./routes/authRoutes');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Health check route
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api/companies', companyRoutes);
app.use('/api/products', productRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/pumps', pumpRoutes);
app.use('/api/places', placeRoutes);
app.use('/api/dealers', dealerRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/owners', ownerRoutes);
app.use('/api/banks', bankRoutes);
app.use('/api/rate-cards', rateCardRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/auth', authRoutes);

// 404 handler
app.use(notFound);

// Error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
});

module.exports = app;
