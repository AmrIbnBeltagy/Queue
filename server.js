const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config({ path: './config.env' });

const connectDB = require('./config/database');

// Connect to MongoDB
connectDB();

const app = express();

// Middleware

// Enable CORS with comprehensive options
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static('public'));

// Import routes
const userRoutes = require('./routes/userRoutes');
const orderRoutes = require('./routes/orderRoutes');
const callLogRoutes = require('./routes/callLogRoutes');
const woocommerceRoutes = require('./routes/woocommerceRoutes');
const shippingCompanyRoutes = require('./routes/shippingCompanyRoutes');
const groupRoutes = require('./routes/groupRoutes');
const areaRoutes = require('./routes/areaRoutes');
const companyGroupRoutes = require('./routes/companyGroupRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const degreeRoutes = require('./routes/degreeRoutes');
const specialityRoutes = require('./routes/specialityRoutes');
const locationRoutes = require('./routes/locationRoutes');
const clinicRoutes = require('./routes/clinicRoutes');
const monitorRoutes = require('./routes/monitorRoutes');
const physicianScheduleRoutes = require('./routes/physicianScheduleRoutes');
const physicianClinicAssignmentRoutes = require('./routes/physicianClinicAssignmentRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const agentCounterRoutes = require('./routes/agentCounterRoutes');
const configurationRoutes = require('./routes/configurationRoutes');
const physicianDashboardRoutes = require('./routes/physicianDashboardRoutes');
const todayPhysicianScheduleRoutes = require('./routes/todayPhysicianScheduleRoutes');
const callingSequenceRoutes = require('./routes/callingSequenceRoutes');

// Routes
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/call-logs', callLogRoutes);
app.use('/api/woocommerce', woocommerceRoutes);
app.use('/api/shipping-companies', shippingCompanyRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/areas', areaRoutes);
app.use('/api/company-groups', companyGroupRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/degrees', degreeRoutes);
app.use('/api/specialities', specialityRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/clinics', clinicRoutes);
app.use('/api/monitors', monitorRoutes);
app.use('/api/physician-schedules', physicianScheduleRoutes);
app.use('/api/physician-clinic-assignments', physicianClinicAssignmentRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/agent-counters', agentCounterRoutes);
app.use('/api/configuration', configurationRoutes);
app.use('/api/physician-dashboard', physicianDashboardRoutes);
app.use('/api/today-physician-schedules', todayPhysicianScheduleRoutes);
app.use('/api/calling-sequences', callingSequenceRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Queue Project API',
    status: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Health check route
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    database: 'Connected',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Route not found',
    path: req.originalUrl
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
