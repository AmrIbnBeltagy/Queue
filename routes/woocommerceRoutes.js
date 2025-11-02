const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const mongoose = require('mongoose');

// Helper function to get next available agent for round-robin assignment
async function getNextAvailableAgent() {
  try {
    // Get all active users with 'agent' role, sorted consistently
    const agents = await User.find({ 
      role: 'agent', 
      isActive: true 
    }).select('_id name username').sort({ createdAt: 1, _id: 1 });
    
    console.log('📋 Available agents for webhook assignment:', agents.length);
    
    if (agents.length === 0) {
      console.log('⚠️ No agents available for assignment');
      return null;
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

// 📦 Receive orders from WooCommerce webhook
router.post('/webhook', async (req, res) => {
  try {
    const wooOrder = req.body;

    console.log('✅ WooCommerce Order received:');
    console.log(JSON.stringify(wooOrder, null, 2));

    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      console.error('⚠️ Database not connected, order logged but not saved');
      return res.status(200).json({ 
        message: 'Order received and logged (database not available)',
        orderId: wooOrder.id 
      });
    }
// Parse billing address
const billingParts = wooOrder.billing ? wooOrder.billing.split(',').map(p => p.trim()) : ['Jeddah', 'Saudi Arabia'];
const city = wooOrder.city;
const country = wooOrder.country;
const state = wooOrder.state;
const zipCode = wooOrder.zipcode;
// Format phone number to match validation (must start with + or digit 1-9, max 16 digits)
let formattedPhone = wooOrder.phone;

    // Auto-assign agent using round-robin
    console.log('🔍 Auto-assigning agent to webhook order...');
    const nextAgent = await getNextAvailableAgent();
    let assignedAgentId = null;
    let agentName = null;
    
    if (nextAgent) {
      assignedAgentId = nextAgent._id;
      agentName = nextAgent.name;
      console.log('✅ Webhook order assigned to agent:', nextAgent.name, '(', nextAgent.username, ')');
    } else {
      console.log('⚠️ No agents available, webhook order created without assignment');
    }

// Transform test order to our Order schema
const orderData = {
  orderNumber: wooOrder.id,
  customer: {
    name: wooOrder.name,
    email: wooOrder.email,
    phone: formattedPhone
  },
  shippingAddress: {
    street: wooOrder.street,
    city: city,
    state: state,
    zipCode: zipCode,
    country: country
  },
  items: {
    name: wooOrder.products,
    description:wooOrder.products,
    quantity: 1,
    price: 0,
    weight: 0.5 
  },
  shippingMethod: 'standard',
  status: mapWooCommerceStatus(wooOrder.status),
  totalAmount: parseFloat(wooOrder.total || 0),
  shippingCost: 0,
  tax: 0,
  notes: `Order #${wooOrder.id} - WooCommerce Integration`,
  estimatedDelivery: calculateEstimatedDelivery(),
  isActive: true,
  callResult: 'Pending',
  assignedAgent: assignedAgentId,
  agent: agentName
};


    // Create new order in database
    const newOrder = await Order.create(orderData);
    
    // Populate agent information in response
    if (assignedAgentId) {
      await newOrder.populate('assignedAgent', 'name username email');
    }

    console.log('✅ Order saved to database:', newOrder.orderNumber, '- Assigned to:', agentName || 'Unassigned');

    res.status(200).json({ 
      success: true,
      message: 'Order received and saved successfully',
      wooOrderId: wooOrder.id,
      systemOrderId: newOrder._id,
      orderNumber: newOrder.orderNumber
    });

  } catch (error) {
    console.error('❌ Error processing WooCommerce order:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error processing order',
      error: error.message 
    });
  }
});

// 📦 Test endpoint - Simple structure like your example
router.post('/test', (req, res) => {
  const order = req.body;

  console.log('✅ Test Order received:');
  console.log(JSON.stringify(order, null, 2));

  // Log the order structure
  console.log({
    id: order.id,
    status: order.status,
    name: order.name,
    phone: order.phone,
    billing: order.billing,
    products: order.products,
    total: order.total,
    date: order.date
  });

  res.status(200).json({ 
    success: true,
    message: 'Test order received successfully',
    receivedData: order 
  });
});

// 📦 Save test order to database
router.post('/test/save', async (req, res) => {
  try {
    const testOrder = req.body;

    console.log('✅ Test Order received for saving:');
    console.log(JSON.stringify(testOrder, null, 2));

    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      console.error('⚠️ Database not connected');
      return res.status(503).json({ 
        success: false,
        message: 'Database not available',
        receivedData: testOrder 
      });
    }

    // Parse billing address
    const billingParts = testOrder.billing ? testOrder.billing.split(',').map(p => p.trim()) : ['Jeddah', 'Saudi Arabia'];
    const city = testOrder.city;
    const country = testOrder.country;
    const state = testOrder.state;
    const zipCode = testOrder.zipcode;
    // Format phone number to match validation (must start with + or digit 1-9, max 16 digits)
    let formattedPhone = testOrder.phone;
    
    // Auto-assign agent using round-robin
    console.log('🔍 Auto-assigning agent to test order...');
    const nextAgent = await getNextAvailableAgent();
    let assignedAgentId = null;
    let agentName = null;
    
    if (nextAgent) {
      assignedAgentId = nextAgent._id;
      agentName = nextAgent.name;
      console.log('✅ Test order assigned to agent:', nextAgent.name, '(', nextAgent.username, ')');
    } else {
      console.log('⚠️ No agents available, test order created without assignment');
    }
    
    // Transform test order to our Order schema
    const orderData = {
      orderNumber: testOrder.id,
      customer: {
        name: testOrder.name,
        email: testOrder.email,
        phone: formattedPhone
      },
      shippingAddress: {
        street: testOrder.street,
        city: city,
        state: state,
        zipCode: zipCode,
        country: country
      },
      items: {
        name: testOrder.products,
        description:testOrder.products,
        quantity: 1,
        price: 0,
        weight: 0.5 
      },
      shippingMethod: 'standard',
      status: mapWooCommerceStatus(testOrder.status),
      totalAmount: parseFloat(testOrder.total || 0),
      shippingCost: 0,
      tax: 0,
      notes: `Order #${testOrder.id} - WooCommerce Integration`,
      estimatedDelivery: new Date(testOrder.date || Date.now()),
      isActive: true,
      callResult: 'Pending',
      assignedAgent: assignedAgentId,
      agent: agentName
    };

    // Create new order in database
    const newOrder = await Order.create(orderData);
    
    // Populate agent information in response
    if (assignedAgentId) {
      await newOrder.populate('assignedAgent', 'name username email');
    }

    console.log('✅ Test order saved to database:', newOrder.orderNumber, '- Assigned to:', agentName || 'Unassigned');

    res.status(200).json({ 
      success: true,
      message: 'Test order saved successfully',
      testOrderId: testOrder.id,
      systemOrderId: newOrder._id,
      orderNumber: newOrder.orderNumber,
      order: newOrder
    });

  } catch (error) {
    console.error('❌ Error saving test order:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error saving test order',
      error: error.message 
    });
  }
});

// Helper function to parse WooCommerce line items
function parseOrderItems(wooOrder) {
  if (wooOrder.line_items && Array.isArray(wooOrder.line_items)) {
    return wooOrder.line_items.map(item => ({
      name: item.name,
      description: item.product_id ? `Product ID: ${item.product_id}` : '',
      quantity: item.quantity || 1,
      price: parseFloat(item.price || item.total || 0),
      weight: 0.5 // Default weight, adjust as needed
    }));
  }
  
  // Fallback for simple products string
  if (wooOrder.products) {
    const productNames = wooOrder.products.split(',').map(p => p.trim());
    return productNames.map(name => ({
      name: name,
      description: '',
      quantity: 1,
      price: parseFloat(wooOrder.total || 0) / productNames.length,
      weight: 0.5
    }));
  }
  
  return [{
    name: 'WooCommerce Product',
    description: 'Imported from WooCommerce',
    quantity: 1,
    price: parseFloat(wooOrder.total || 0),
    weight: 0.5
  }];
}

// Helper function to parse test order items
function parseTestOrderItems(testOrder) {
  if (testOrder.products) {
    const productNames = testOrder.products.split(',').map(p => p.trim());
    const pricePerProduct = parseFloat(testOrder.total || 0) / productNames.length;
    
    return productNames.map(name => ({
      name: name,
      description: name,
      quantity: 1,
      price: 0,
      weight: 0
    }));
  }
  
  return [{
    name: 'Test Product',
    description: 'Test order item',
    quantity: 1,
    price: 0,
    weight: 0
  }];
}

// Helper function to map WooCommerce status to our system status
function mapWooCommerceStatus(wooStatus) {
  const statusMap = {
    'pending': 'pending',
    'processing': 'processing',
    'on-hold': 'pending',
    'completed': 'delivered',
    'cancelled': 'cancelled',
    'refunded': 'returned',
    'failed': 'cancelled'
  };
  
  return statusMap[wooStatus?.toLowerCase()] || 'pending';
}

// Helper function to calculate estimated delivery (7 days from now)
function calculateEstimatedDelivery() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date;
}

// GET endpoint to check webhook status
router.get('/status', (req, res) => {
  res.json({
    success: true,
    message: 'WooCommerce webhook endpoint is active',
    endpoints: {
      webhook: '/api/woocommerce/webhook',
      test: '/api/woocommerce/test',
      testSave: '/api/woocommerce/test/save',
      status: '/api/woocommerce/status'
    },
    databaseStatus: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

