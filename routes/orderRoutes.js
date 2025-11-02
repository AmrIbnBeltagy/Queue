const express = require('express');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const User = require('../models/User');
const router = express.Router();

// Helper function to get next available agent for round-robin assignment
async function getNextAvailableAgent() {
  try {
    // Get all active users with 'agent' role, sorted consistently
    const agents = await User.find({ 
      role: 'agent', 
      isActive: true 
    }).select('_id name username').sort({ createdAt: 1, _id: 1 }); // Consistent sorting
    
    console.log('📋 Available agents for assignment:', agents.length);
    
    if (agents.length === 0) {
      console.log('⚠️ No agents available for assignment');
      return null; // No agents available
    }
    
    console.log('👥 Agents list:', agents.map(a => ({ name: a.name, username: a.username })));
    
    // Get the last assigned agent from the most recent order
    const lastOrder = await Order.findOne({ 
      assignedAgent: { $exists: true, $ne: null } 
    }).sort({ createdAt: -1 }).select('assignedAgent');
    
    console.log('📦 Last order assigned agent:', lastOrder ? lastOrder.assignedAgent : 'None');
    
    if (!lastOrder || !lastOrder.assignedAgent) {
      // No previous assignment, start with first agent
      console.log('✅ Assigning to first agent (no previous assignment):', agents[0].name);
      return agents[0];
    }
    
    // Find the index of the last assigned agent
    const lastAgentIndex = agents.findIndex(
      agent => agent._id.toString() === lastOrder.assignedAgent.toString()
    );
    
    console.log('📍 Last agent index:', lastAgentIndex);
    
    // Get next agent in round-robin fashion
    if (lastAgentIndex === -1 || lastAgentIndex >= agents.length - 1) {
      // Last agent not found or was the last in list, wrap around to first
      console.log('🔄 Wrapping around to first agent:', agents[0].name);
      return agents[0];
    } else {
      // Return next agent in the list
      const nextAgent = agents[lastAgentIndex + 1];
      console.log('➡️ Assigning to next agent:', nextAgent.name);
      return nextAgent;
    }
  } catch (error) {
    console.error('❌ Error getting next agent:', error);
    return null;
  }
}

// Helper function to get next available preparation user for round-robin assignment
async function getNextAvailablePreparationUser() {
  try {
    // Get all active users with 'preparation' role, sorted consistently
    const preparationUsers = await User.find({ 
      role: 'preparation', 
      isActive: true 
    }).select('_id name username').sort({ createdAt: 1, _id: 1 });
    
    console.log('📋 Available preparation users for assignment:', preparationUsers.length);
    
    if (preparationUsers.length === 0) {
      console.log('⚠️ No preparation users available for assignment');
      return null;
    }
    
    console.log('👥 Preparation users list:', preparationUsers.map(u => ({ name: u.name, username: u.username })));
    
    // Get the last assigned preparation user from the most recent order
    const lastOrder = await Order.findOne({ 
      assignedPreparation: { $exists: true, $ne: null } 
    }).sort({ createdAt: -1 }).select('assignedPreparation');
    
    console.log('📦 Last order assigned preparation user:', lastOrder ? lastOrder.assignedPreparation : 'None');
    
    if (!lastOrder || !lastOrder.assignedPreparation) {
      console.log('✅ Assigning to first preparation user (no previous assignment):', preparationUsers[0].name);
      return preparationUsers[0];
    }
    
    // Find the index of the last assigned preparation user
    const lastUserIndex = preparationUsers.findIndex(
      user => user._id.toString() === lastOrder.assignedPreparation.toString()
    );
    
    console.log('📍 Last preparation user index:', lastUserIndex);
    
    // Get next user in round-robin fashion
    if (lastUserIndex === -1 || lastUserIndex >= preparationUsers.length - 1) {
      console.log('🔄 Wrapping around to first preparation user:', preparationUsers[0].name);
      return preparationUsers[0];
    } else {
      const nextUser = preparationUsers[lastUserIndex + 1];
      console.log('➡️ Assigning to next preparation user:', nextUser.name);
      return nextUser;
    }
  } catch (error) {
    console.error('❌ Error getting next preparation user:', error);
    return null;
  }
}

// GET /api/orders - Get all orders with filtering and pagination
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
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter = { isActive: true };
    
    // Filter by assigned agent if specified (for agent dashboard)
    if (req.query.assignedAgent) {
      filter.assignedAgent = req.query.assignedAgent;
    }
    
    // Filter by assigned preparation if specified (for fulfillment dashboard)
    if (req.query.assignedPreparation) {
      filter.assignedPreparation = req.query.assignedPreparation;
    }
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.callResult) {
      filter.callResult = req.query.callResult;
    }
    
    if (req.query.agent) {
      filter.agent = new RegExp(req.query.agent, 'i');
    }
    
    if (req.query.customerName) {
      filter['customer.name'] = new RegExp(req.query.customerName, 'i');
    }
    
    if (req.query.customerEmail) {
      filter['customer.email'] = new RegExp(req.query.customerEmail, 'i');
    }
    
    if (req.query.orderNumber) {
      filter.orderNumber = new RegExp(req.query.orderNumber, 'i');
    }
    
    if (req.query.trackingNumber) {
      filter.trackingNumber = new RegExp(req.query.trackingNumber, 'i');
    }
    
    // Add platform filter
    if (req.query.platform) {
      filter.platform = req.query.platform;
    }
    
    // Add date range filters (support both startDate/endDate and dateFrom/dateTo)
    const startDate = req.query.startDate || req.query.dateFrom;
    const endDate = req.query.endDate || req.query.dateTo;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
      }
    }
    
    // Exclude confirmed orders if requested
    if (req.query.excludeConfirmed === 'true') {
      filter.callResult = { $ne: 'Confirmed' };
    }
    
    console.log('Orders API filter:', filter);

    const orders = await Order.find(filter)
      .populate('deliveryEmployee', 'name code vehicleType')
      .populate('shippingCompany', 'name code')
      .populate('assignedAgent', 'name username email')
      .populate('assignedPreparation', 'name username email')
      .populate('callHistory.calledBy', 'name username')
      .select('-__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments(filter);

    res.json({
      success: true,
      count: orders.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: orders
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching orders',
      error: error.message
    });
  }
});

// GET /api/orders/confirmed - Get only confirmed orders
router.get('/confirmed', async (req, res) => {
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
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build filter object specifically for confirmed orders
    const filter = { 
      isActive: true,
      callResult: 'Confirmed'
    };
    
    // Add additional filters if provided
    if (req.query.agent) {
      filter.agent = new RegExp(req.query.agent, 'i');
    }
    
    if (req.query.customerName) {
      filter['customer.name'] = new RegExp(req.query.customerName, 'i');
    }
    
    if (req.query.orderNumber) {
      filter.orderNumber = new RegExp(req.query.orderNumber, 'i');
    }
    
    // Add platform filter
    if (req.query.platform) {
      filter.platform = req.query.platform;
    }
    
    // Add date range filters (support both startDate/endDate and dateFrom/dateTo)
    const startDate = req.query.startDate || req.query.dateFrom;
    const endDate = req.query.endDate || req.query.dateTo;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
      }
    }
    
    console.log('Confirmed Orders API filter:', filter);

    const orders = await Order.find(filter)
      .populate('deliveryEmployee', 'name code vehicleType')
      .populate('shippingCompany', 'name code')
      .populate('assignedAgent', 'name username email')
      .populate('assignedPreparation', 'name username email')
      .populate('callHistory.calledBy', 'name username')
      .select('-__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments(filter);

    res.json({
      success: true,
      count: orders.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: orders
    });
  } catch (error) {
    console.error('Error fetching confirmed orders:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching confirmed orders',
      error: error.message
    });
  }
});

// GET /api/orders/confirmed/stats - Get statistics for confirmed orders
router.get('/confirmed/stats', async (req, res) => {
  try {
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection not available',
        data: {
          totalOrders: 0,
          totalRevenue: 0,
          uniqueCustomers: 0
        }
      });
    }

    // Build filter object specifically for confirmed orders
    const filter = { 
      isActive: true,
      callResult: 'Confirmed'
    };
    
    // Add additional filters if provided
    if (req.query.agent) {
      filter.agent = new RegExp(req.query.agent, 'i');
    }
    
    if (req.query.customerName) {
      filter['customer.name'] = new RegExp(req.query.customerName, 'i');
    }
    
    // Add platform filter
    if (req.query.platform) {
      filter.platform = req.query.platform;
    }
    
    // Add date range filters (support both startDate/endDate and dateFrom/dateTo)
    const startDate = req.query.startDate || req.query.dateFrom;
    const endDate = req.query.endDate || req.query.dateTo;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
      }
    }

    console.log('Confirmed Orders Stats filter:', filter);

    const totalOrders = await Order.countDocuments(filter);
    
    const totalRevenue = await Order.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    // Count unique customers
    const uniqueCustomers = await Order.aggregate([
      { $match: filter },
      { $group: { _id: '$customer.email' } },
      { $count: 'uniqueCustomers' }
    ]);

    res.json({
      success: true,
      data: {
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        uniqueCustomers: uniqueCustomers[0]?.uniqueCustomers || 0
      }
    });
  } catch (error) {
    console.error('Error fetching confirmed orders statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching confirmed orders statistics',
      error: error.message
    });
  }
});

// GET /api/orders/:id - Get order by ID
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('deliveryEmployee', 'name code vehicleType')
      .populate('shippingCompany', 'name code')
      .populate('assignedAgent', 'name username email')
      .populate('assignedPreparation', 'name username email')
      .populate('callHistory.calledBy', 'name username')
      .select('-__v');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching order',
      error: error.message
    });
  }
});

// GET /api/orders/track/:trackingNumber - Track order by tracking number
router.get('/track/:trackingNumber', async (req, res) => {
  try {
    const order = await Order.findOne({ 
      trackingNumber: req.params.trackingNumber,
      isActive: true 
    }).select('-__v');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found with this tracking number'
      });
    }

    res.json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        status: order.status,
        trackingNumber: order.trackingNumber,
        estimatedDelivery: order.estimatedDelivery,
        actualDelivery: order.actualDelivery,
        shippingAddress: order.shippingAddress,
        customer: {
          name: order.customer.name,
          email: order.customer.email
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error tracking order',
      error: error.message
    });
  }
});

// POST /api/orders - Create new order
router.post('/', async (req, res) => {
  try {
    // Calculate total amount if not provided
    if (!req.body.totalAmount && req.body.items) {
      req.body.totalAmount = req.body.items.reduce((total, item) => {
        return total + (item.price * item.quantity);
      }, 0);
    }

    // Set estimated delivery date based on shipping method
    if (req.body.shippingMethod && !req.body.estimatedDelivery) {
      const deliveryDays = {
        'standard': 5,
        'express': 2,
        'overnight': 1,
        'international': 10
      };
      
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + (deliveryDays[req.body.shippingMethod] || 5));
      req.body.estimatedDelivery = deliveryDate;
    }

    // Auto-assign agent if not provided
    if (!req.body.assignedAgent) {
      console.log('🔍 Auto-assigning agent to new order...');
      const nextAgent = await getNextAvailableAgent();
      if (nextAgent) {
        req.body.assignedAgent = nextAgent._id;
        // Also set the agent name for backward compatibility
        if (!req.body.agent) {
          req.body.agent = nextAgent.name;
        }
        console.log('✅ Order assigned to agent:', nextAgent.name, '(', nextAgent.username, ')');
      } else {
        console.log('⚠️ No agents available, order created without assignment');
      }
    }

    const order = new Order(req.body);
    await order.save();
    
    // Populate agent and preparation information in response
    await order.populate('assignedAgent', 'name username email');
    await order.populate('assignedPreparation', 'name username email');
    
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Order number or tracking number already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating order',
      error: error.message
    });
  }
});

// PUT /api/orders/:id - Update order
router.put('/:id', async (req, res) => {
  try {
    const existingOrder = await Order.findById(req.params.id);
    
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // If callResult is being updated, ALWAYS add to call history (even if same result)
    if (req.body.callResult) {
      const callHistoryEntry = {
        callResult: req.body.callResult,
        notes: req.body.notes || req.body.callNotes || '',
        calledAt: new Date()
      };
      
      // If we have agent info, include it
      if (req.body.agentId) {
        callHistoryEntry.calledBy = req.body.agentId;
      }
      if (req.body.agentName) {
        callHistoryEntry.calledByName = req.body.agentName;
      }
      
      if (!existingOrder.callHistory) {
        existingOrder.callHistory = [];
      }
      existingOrder.callHistory.push(callHistoryEntry);
      
      console.log('📝 Added to call history:', callHistoryEntry.callResult, 'by', callHistoryEntry.calledByName);
      
      // Update timeline
      if (!existingOrder.timeline) existingOrder.timeline = {};
      existingOrder.timeline.lastCallingTime = new Date();
      
      // Auto-update order status based on call result
      if (req.body.callResult === 'Confirmed') {
        req.body.status = 'Processing';
        
        // Auto-assign to preparation user if not already assigned
        if (!existingOrder.assignedPreparation) {
          console.log('🔍 Auto-assigning preparation user for confirmed order...');
          const nextPreparationUser = await getNextAvailablePreparationUser();
          if (nextPreparationUser) {
            req.body.assignedPreparation = nextPreparationUser._id;
            console.log('✅ Order assigned to preparation user:', nextPreparationUser.name, '(', nextPreparationUser.username, ')');
          }
        }
      } else if (req.body.callResult === 'Cancelled by Customer') {
        req.body.status = 'Cancelled';
      } else if (req.body.callResult === 'On Hold') {
        req.body.status = 'On Hold';
      }
    }

    // Update timeline based on status changes
    if (req.body.status && req.body.status !== existingOrder.status) {
      if (!existingOrder.timeline) existingOrder.timeline = {};
      
      if (req.body.status === 'Ready To Delivery' && !existingOrder.timeline.readyForDeliveryAt) {
        existingOrder.timeline.readyForDeliveryAt = new Date();
      }
      
      if (req.body.status === 'shipped' && !existingOrder.timeline.shippedAt) {
        existingOrder.timeline.shippedAt = new Date();
      }
      
      if (req.body.status === 'delivered' && !existingOrder.timeline.deliveredAt) {
        existingOrder.timeline.deliveredAt = new Date();
      }
    }
    
    // Update timeline when assigning delivery employee or company
    if ((req.body.deliveryEmployee || req.body.shippingCompany) && 
        (!existingOrder.deliveryEmployee && !existingOrder.shippingCompany)) {
      if (!existingOrder.timeline) existingOrder.timeline = {};
      if (!existingOrder.timeline.assignedToDeliveryAt) {
        existingOrder.timeline.assignedToDeliveryAt = new Date();
      }
    }

    // Update other fields
    Object.assign(existingOrder, req.body);
    
    // Save the order
    await existingOrder.save();
    
    // Populate for response
    await existingOrder.populate('callHistory.calledBy', 'name username');
    await existingOrder.populate('assignedAgent', 'name username email');
    await existingOrder.populate('assignedPreparation', 'name username email');
    await existingOrder.populate('deliveryEmployee', 'name code vehicleType');
    await existingOrder.populate('shippingCompany', 'name code');

    res.json({
      success: true,
      message: 'Order updated successfully',
      data: existingOrder
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating order',
      error: error.message
    });
  }
});

// PATCH /api/orders/:id/status - Update order status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Valid statuses are: ' + validStatuses.join(', ')
      });
    }

    const updateData = { status };
    
    // Set actual delivery date when status changes to 'delivered'
    if (status === 'delivered') {
      updateData.actualDelivery = new Date();
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-__v');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating order status',
      error: error.message
    });
  }
});

// DELETE /api/orders - Delete all orders
router.delete('/', async (req, res) => {
  try {
    // Delete all orders (permanent delete for testing purposes)
    const result = await Order.deleteMany({});

    res.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} orders`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting all orders',
      error: error.message
    });
  }
});

// DELETE /api/orders/:id - Delete order (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting order',
      error: error.message
    });
  }
});

// GET /api/orders/stats/summary - Get order statistics
router.get('/stats/summary', async (req, res) => {
  try {
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection not available',
        data: {
          totalOrders: 0,
          totalRevenue: 0,
          uniqueCustomers: 0,
          statusBreakdown: []
        }
      });
    }

    // Build match criteria based on query parameters
    const matchCriteria = { isActive: true };
    
    // Add callResult filter if provided
    if (req.query.callResult) {
      matchCriteria.callResult = req.query.callResult;
    }
    
    // Add agent filter if provided
    if (req.query.agent) {
      matchCriteria.agent = new RegExp(req.query.agent, 'i');
    }
    
    // Add platform filter if provided
    if (req.query.platform) {
      matchCriteria.platform = req.query.platform;
    }
    
    // Add date range filters (support both startDate/endDate and dateFrom/dateTo)
    const startDate = req.query.startDate || req.query.dateFrom;
    const endDate = req.query.endDate || req.query.dateTo;
    
    if (startDate || endDate) {
      matchCriteria.createdAt = {};
      if (startDate) {
        matchCriteria.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        matchCriteria.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
      }
    }

    console.log('Stats match criteria:', matchCriteria);

    const stats = await Order.aggregate([
      { $match: matchCriteria },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    const totalOrders = await Order.countDocuments(matchCriteria);
    
    const totalRevenue = await Order.aggregate([
      { $match: matchCriteria },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    // Count unique customers
    const uniqueCustomers = await Order.aggregate([
      { $match: matchCriteria },
      { $group: { _id: '$customer.email' } },
      { $count: 'uniqueCustomers' }
    ]);

    res.json({
      success: true,
      data: {
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        uniqueCustomers: uniqueCustomers[0]?.uniqueCustomers || 0,
        statusBreakdown: stats
      }
    });
  } catch (error) {
    console.error('Error fetching order statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching order statistics',
      error: error.message
    });
  }
});

module.exports = router;

