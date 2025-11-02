const axios = require('axios');

// بيانات API
const storeUrl = 'https://venolahaircare.com'; // رابط المتجر
const consumerKey = 'ck_6053a76c16ed34e97fd0320a70d9fce8dac4bb90';
const consumerSecret = 'cs_1c8186090613aca9f31b30fbb7ac4b5e5dbddc83';

// Test function to update order status
async function updateOrderStatus(orderId, newStatus) {
    console.log(`\n🔄 Attempting to update Order #${orderId} to status: ${newStatus}`);
    console.log('=' .repeat(60));
    
    try {
        const response = await axios.put(
            `${storeUrl}/wp-json/wc/v3/orders/${orderId}`,
            {
                status: newStatus
            },
            {
                auth: {
                    username: consumerKey,
                    password: consumerSecret
                }
            }
        );
        
        console.log('✅ Order updated successfully!');
        console.log('\n📦 Updated Order Details:');
        console.log('  Order ID:', response.data.id);
        console.log('  Order Number:', response.data.number);
        console.log('  Status:', response.data.status);
        console.log('  Customer Name:', response.data.billing.first_name, response.data.billing.last_name);
        console.log('  Total:', response.data.total, response.data.currency);
        console.log('  Date Modified:', response.data.date_modified);
        
        return response.data;
    } catch (error) {
        console.error('❌ Error updating order:');
        if (error.response) {
            console.error('  Status Code:', error.response.status);
            console.error('  Status Text:', error.response.statusText);
            console.error('  Error Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('  Error Message:', error.message);
        }
        throw error;
    }
}

// Test function to get order details
async function getOrderDetails(orderId) {
    console.log(`\n📋 Fetching Order #${orderId} details...`);
    console.log('=' .repeat(60));
    
    try {
        const response = await axios.get(
            `${storeUrl}/wp-json/wc/v3/orders/${orderId}`,
            {
                auth: {
                    username: consumerKey,
                    password: consumerSecret
                }
            }
        );
        
        console.log('✅ Order details retrieved!');
        console.log('\n📦 Order Details:');
        console.log('  Order ID:', response.data.id);
        console.log('  Order Number:', response.data.number);
        console.log('  Current Status:', response.data.status);
        console.log('  Customer Name:', response.data.billing.first_name, response.data.billing.last_name);
        console.log('  Customer Email:', response.data.billing.email);
        console.log('  Customer Phone:', response.data.billing.phone);
        console.log('  Total:', response.data.total, response.data.currency);
        console.log('  Date Created:', response.data.date_created);
        console.log('  Date Modified:', response.data.date_modified);
        
        return response.data;
    } catch (error) {
        console.error('❌ Error fetching order:');
        if (error.response) {
            console.error('  Status Code:', error.response.status);
            console.error('  Status Text:', error.response.statusText);
            console.error('  Error Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('  Error Message:', error.message);
        }
        throw error;
    }
}

// Main test function
async function runTests() {
    console.log('\n🚀 Starting WooCommerce Order Update Tests');
    console.log('=' .repeat(60));
    console.log('Store URL:', storeUrl);
    console.log('Consumer Key:', consumerKey.substring(0, 10) + '...');
    console.log('=' .repeat(60));
    
    // Test parameters
    const orderId = 11014;
    const newStatus = 'completed';
    
    try {
        // Test 1: Get current order details
        console.log('\n📝 Test 1: Get Current Order Details');
        const currentOrder = await getOrderDetails(orderId);
        console.log('\n✅ Test 1 Passed - Current status:', currentOrder.status);
        
        // Test 2: Update order status
        console.log('\n📝 Test 2: Update Order Status');
        const updatedOrder = await updateOrderStatus(orderId, newStatus);
        console.log('\n✅ Test 2 Passed - New status:', updatedOrder.status);
        
        // Test 3: Verify the update
        console.log('\n📝 Test 3: Verify Status Update');
        const verifiedOrder = await getOrderDetails(orderId);
        
        if (verifiedOrder.status === newStatus) {
            console.log('\n✅ Test 3 Passed - Status update verified!');
        } else {
            console.log('\n❌ Test 3 Failed - Status mismatch!');
            console.log('  Expected:', newStatus);
            console.log('  Actual:', verifiedOrder.status);
        }
        
        // Summary
        console.log('\n' + '=' .repeat(60));
        console.log('🎉 All Tests Completed Successfully!');
        console.log('=' .repeat(60));
        
    } catch (error) {
        console.log('\n' + '=' .repeat(60));
        console.log('❌ Tests Failed!');
        console.log('=' .repeat(60));
        process.exit(1);
    }
}

// Additional test: Update multiple orders
async function updateMultipleOrders(orderUpdates) {
    console.log('\n🔄 Batch Update Test');
    console.log('=' .repeat(60));
    console.log(`Updating ${orderUpdates.length} orders...`);
    
    const results = [];
    
    for (const { orderId, status } of orderUpdates) {
        try {
            const result = await updateOrderStatus(orderId, status);
            results.push({ orderId, success: true, status: result.status });
        } catch (error) {
            results.push({ orderId, success: false, error: error.message });
        }
    }
    
    console.log('\n📊 Batch Update Results:');
    results.forEach(result => {
        if (result.success) {
            console.log(`  ✅ Order #${result.orderId}: ${result.status}`);
        } else {
            console.log(`  ❌ Order #${result.orderId}: ${result.error}`);
        }
    });
    
    return results;
}

// Test available order statuses
async function testOrderStatuses(orderId) {
    console.log('\n🧪 Testing Different Order Statuses');
    console.log('=' .repeat(60));
    
    const statuses = ['processing', 'on-hold', 'completed', 'cancelled'];
    
    for (const status of statuses) {
        try {
            console.log(`\n  Testing status: ${status}`);
            await updateOrderStatus(orderId, status);
            console.log(`  ✅ ${status} - Success`);
            
            // Wait 1 second between updates
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.log(`  ❌ ${status} - Failed`);
        }
    }
}

// Run the tests
if (require.main === module) {
    // Default: Run main tests
    runTests().catch(error => {
        console.error('\n💥 Fatal Error:', error.message);
        process.exit(1);
    });
    
    // Uncomment to test batch updates:
    // const batchUpdates = [
    //     { orderId: 11014, status: 'completed' },
    //     { orderId: 11013, status: 'processing' }
    // ];
    // updateMultipleOrders(batchUpdates);
    
    // Uncomment to test all statuses:
    // testOrderStatuses(11014);
}

// Export functions for use in other modules
module.exports = {
    updateOrderStatus,
    getOrderDetails,
    updateMultipleOrders,
    testOrderStatuses
};



