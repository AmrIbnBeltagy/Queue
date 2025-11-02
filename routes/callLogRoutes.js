const express = require('express');
const mongoose = require('mongoose');
const CallLog = require('../models/CallLog');
const Order = require('../models/Order');
const router = express.Router();

// GET /api/call-logs - Get all call logs with filtering and pagination
router.get('/', async (req, res) => {
  try {
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection not available',
        data: []
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = { isActive: true };

    // Filter by agent name
    if (req.query.agent) {
      filter.agentName = { $regex: req.query.agent, $options: 'i' };
    }

    // Filter by call result
    if (req.query.callResult) {
      filter.callResult = req.query.callResult;
    }

    // Filter by order number
    if (req.query.orderNumber) {
      filter.orderNumber = { $regex: req.query.orderNumber, $options: 'i' };
    }

    // Filter by date range
    if (req.query.startDate || req.query.endDate) {
      filter.callDate = {};
      if (req.query.startDate) {
        filter.callDate.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        filter.callDate.$lte = new Date(req.query.endDate);
      }
    }

    // Filter by call type
    if (req.query.callType) {
      filter.callType = req.query.callType;
    }

    // Execute query with pagination
    const callLogs = await CallLog.find(filter)
      .sort({ callDate: -1 })
      .skip(skip)
      .limit(limit)
      .populate('orderId', 'orderNumber customer status totalAmount')
      .select('-__v');

    // Get total count for pagination
    const total = await CallLog.countDocuments(filter);
    const pages = Math.ceil(total / limit);

    res.json({
      success: true,
      count: callLogs.length,
      total,
      page,
      pages,
      data: callLogs
    });
  } catch (error) {
    console.error('Error fetching call logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching call logs',
      error: error.message
    });
  }
});

// GET /api/call-logs/stats/summary - Get call log statistics
router.get('/stats/summary', async (req, res) => {
  try {
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection not available',
        data: {
          totalCalls: 0,
          confirmedCalls: 0,
          noAnswerCalls: 0,
          wrongNumberCalls: 0,
          callbackRequests: 0,
          cancelledCalls: 0,
          averageDuration: 0,
          totalDuration: 0,
          confirmationRate: 0
        }
      });
    }

    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    const stats = await CallLog.getCallStatistics(startDate, endDate);

    // Get agent performance stats
    const agentStats = await CallLog.aggregate([
      {
        $match: {
          isActive: true,
          ...(startDate || endDate ? {
            callDate: {
              ...(startDate ? { $gte: new Date(startDate) } : {}),
              ...(endDate ? { $lte: new Date(endDate) } : {})
            }
          } : {})
        }
      },
      {
        $group: {
          _id: '$agentName',
          totalCalls: { $sum: 1 },
          confirmedCalls: {
            $sum: { $cond: [{ $eq: ['$callResult', 'Confirmed'] }, 1, 0] }
          },
          averageDuration: { $avg: '$callDuration' },
          totalDuration: { $sum: '$callDuration' }
        }
      },
      {
        $project: {
          agentName: '$_id',
          totalCalls: 1,
          confirmedCalls: 1,
          averageDuration: { $round: ['$averageDuration', 2] },
          totalDuration: 1,
          confirmationRate: {
            $round: [
              { $multiply: [{ $divide: ['$confirmedCalls', '$totalCalls'] }, 100] },
              2
            ]
          }
        }
      },
      { $sort: { totalCalls: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        ...stats,
        agentPerformance: agentStats
      }
    });
  } catch (error) {
    console.error('Error fetching call log statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching call log statistics',
      error: error.message
    });
  }
});

// GET /api/call-logs/order/:orderId - Get call logs for a specific order
router.get('/order/:orderId', async (req, res) => {
  try {
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection not available',
        data: []
      });
    }

    const { orderId } = req.params;

    const callLogs = await CallLog.find({ 
      orderId: orderId, 
      isActive: true 
    })
    .sort({ callDate: -1 })
    .select('-__v');

    res.json({
      success: true,
      count: callLogs.length,
      data: callLogs
    });
  } catch (error) {
    console.error('Error fetching call logs for order:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching call logs for order',
      error: error.message
    });
  }
});

// POST /api/call-logs - Create a new call log entry
router.post('/', async (req, res) => {
  try {
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    // Get order details for additional context
    const order = await Order.findById(req.body.orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Create call log entry
    const callLogData = {
      ...req.body,
      orderNumber: order.orderNumber,
      customerName: order.customer.name,
      customerPhone: order.customer.phone
    };

    const callLog = new CallLog(callLogData);
    await callLog.save();

    res.status(201).json({
      success: true,
      message: 'Call log created successfully',
      data: callLog
    });
  } catch (error) {
    console.error('Error creating call log:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating call log',
      error: error.message
    });
  }
});

// PUT /api/call-logs/:id - Update a call log entry
router.put('/:id', async (req, res) => {
  try {
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const callLog = await CallLog.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-__v');

    if (!callLog) {
      return res.status(404).json({
        success: false,
        message: 'Call log not found'
      });
    }

    res.json({
      success: true,
      message: 'Call log updated successfully',
      data: callLog
    });
  } catch (error) {
    console.error('Error updating call log:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating call log',
      error: error.message
    });
  }
});

// DELETE /api/call-logs/:id - Soft delete a call log entry
router.delete('/:id', async (req, res) => {
  try {
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const callLog = await CallLog.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select('-__v');

    if (!callLog) {
      return res.status(404).json({
        success: false,
        message: 'Call log not found'
      });
    }

    res.json({
      success: true,
      message: 'Call log deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting call log:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting call log',
      error: error.message
    });
  }
});

module.exports = router;


