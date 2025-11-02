// Show page after authentication check passed
document.body.classList.add('authenticated');

// Check authentication on page load
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    setupNavigationListeners();
    
    // Check if logout was triggered from another page
    if (sessionStorage.getItem('triggerLogout') === 'true') {
        sessionStorage.removeItem('triggerLogout');
        logout();
    }
});

// Setup navigation event listeners
function setupNavigationListeners() {
    // Add new order button
    const addNewOrderBtn = document.getElementById('addNewOrderBtn');
    if (addNewOrderBtn) {
        addNewOrderBtn.addEventListener('click', addNewOrder);
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Delete All Orders button
    const deleteAllOrdersBtn = document.getElementById('deleteAllOrdersBtn');
    if (deleteAllOrdersBtn) {
        deleteAllOrdersBtn.addEventListener('click', openDeleteAllOrdersModal);
    }
    
    // Delete Order modal controls
    const closeDeleteOrderModal = document.getElementById('closeDeleteOrderModal');
    const cancelDeleteOrderBtn = document.getElementById('cancelDeleteOrderBtn');
    const confirmDeleteOrderBtn = document.getElementById('confirmDeleteOrderBtn');
    
    if (closeDeleteOrderModal) {
        closeDeleteOrderModal.addEventListener('click', closeDeleteOrderModalHandler);
    }
    if (cancelDeleteOrderBtn) {
        cancelDeleteOrderBtn.addEventListener('click', closeDeleteOrderModalHandler);
    }
    if (confirmDeleteOrderBtn) {
        confirmDeleteOrderBtn.addEventListener('click', confirmDeleteOrder);
    }
    
    // Delete All Orders modal controls
    const closeDeleteAllModal = document.getElementById('closeDeleteAllModal');
    const cancelDeleteAllBtn = document.getElementById('cancelDeleteAllBtn');
    const confirmDeleteAllBtn = document.getElementById('confirmDeleteAllBtn');
    
    if (closeDeleteAllModal) {
        closeDeleteAllModal.addEventListener('click', closeDeleteAllOrdersModalHandler);
    }
    if (cancelDeleteAllBtn) {
        cancelDeleteAllBtn.addEventListener('click', closeDeleteAllOrdersModalHandler);
    }
    if (confirmDeleteAllBtn) {
        confirmDeleteAllBtn.addEventListener('click', confirmDeleteAllOrders);
    }
    
    // Logout modal controls
    const closeLogoutModalBtn = document.getElementById('closeLogoutModal');
    const cancelLogoutBtn = document.getElementById('cancelLogoutBtn');
    const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');
    
    if (closeLogoutModalBtn) {
        closeLogoutModalBtn.addEventListener('click', closeLogoutModal);
    }
    if (cancelLogoutBtn) {
        cancelLogoutBtn.addEventListener('click', closeLogoutModal);
    }
    if (confirmLogoutBtn) {
        confirmLogoutBtn.addEventListener('click', confirmLogout);
    }
    
    // Close modals on outside click
    window.addEventListener('click', function(e) {
        const logoutModal = document.getElementById('logoutConfirmModal');
        const deleteOrderModal = document.getElementById('deleteOrderModal');
        const deleteAllOrdersModal = document.getElementById('deleteAllOrdersModal');
        
        if (e.target === logoutModal) {
            closeLogoutModal();
        }
        if (e.target === deleteOrderModal) {
            closeDeleteOrderModalHandler();
        }
        if (e.target === deleteAllOrdersModal) {
            closeDeleteAllOrdersModalHandler();
        }
    });
    
    // Clear filters button
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearFilters);
    }
    
    // Pagination buttons
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    if (prevBtn) {
        prevBtn.addEventListener('click', previousPage);
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', nextPage);
    }
    
    // Table header sorting - use event delegation
    const ordersTableHead = document.querySelector('.orders-table thead');
    if (ordersTableHead) {
        ordersTableHead.addEventListener('click', function(e) {
            const th = e.target.closest('th');
            if (th && th.hasAttribute('data-sort-column')) {
                const columnIndex = parseInt(th.getAttribute('data-sort-column'));
                sortTable(columnIndex);
            }
        });
    }
}

// Check if user is authenticated
function checkAuth() {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('currentUser');
    
    if (!token || !user) {
        // Redirect to login if not authenticated
        window.location.href = 'login.html';
        return;
    }
    
    // Display user info
    try {
        const userData = JSON.parse(user);
        const userNameElement = document.getElementById('currentUserName');
        if (userNameElement) {
            userNameElement.textContent = userData.name || userData.username || 'User';
        }
    } catch (error) {
        console.error('Error parsing user data:', error);
    }
}

// Logout function - show confirmation modal
function logout() {
    document.getElementById('logoutConfirmModal').style.display = 'block';
}

// Confirm logout
function confirmLogout() {
    const confirmBtn = document.getElementById('confirmLogoutBtn');
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';
    
    // Clear authentication data
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    
    // Redirect to login page after short delay
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 500);
}

// Close logout modal
function closeLogoutModal() {
    document.getElementById('logoutConfirmModal').style.display = 'none';
}

// Global Variables
let orders = [];
let currentPage = 1;
let totalPages = 1;
let sortColumn = 0;
let sortDirection = 'asc';
let itemsPerPage = 10;

// DOM Elements
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const platformFilter = document.getElementById('platformFilter');
const dateFrom = document.getElementById('dateFrom');
const dateTo = document.getElementById('dateTo');
const ordersTableBody = document.getElementById('ordersTableBody');
const pageInfo = document.getElementById('pageInfo');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Initialize Application
function initializeApp() {
    setupEventListeners();
    loadOrders();
    setupDateFilters();
}

// Setup Event Listeners
function setupEventListeners() {
    // Search functionality
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    
    // Filter functionality
    statusFilter.addEventListener('change', loadOrders);
    platformFilter.addEventListener('change', loadOrders);
    dateFrom.addEventListener('change', loadOrders);
    dateTo.addEventListener('change', loadOrders);
    
    // Pagination
    prevBtn.addEventListener('click', previousPage);
    nextBtn.addEventListener('click', nextPage);
    
    // Modal close buttons
    document.getElementById('closeOrderModal').addEventListener('click', closeModal);
    document.getElementById('closeEditModal').addEventListener('click', closeEditModal);
    document.getElementById('closeCallResultModal').addEventListener('click', closeCallResultModal);
    document.getElementById('cancelEditBtn').addEventListener('click', closeEditModal);
    document.getElementById('cancelCallResultBtn').addEventListener('click', closeCallResultModal);
    
    // Form submissions
    document.getElementById('editOrderForm').addEventListener('submit', handleEditOrder);
    document.getElementById('callResultForm').addEventListener('submit', handleCallResult);
    
    // Action buttons delegation
    document.addEventListener('click', function(event) {
        if (event.target.closest('.action-btn')) {
            const button = event.target.closest('.action-btn');
            const orderId = button.getAttribute('data-order-id');
            const action = button.getAttribute('data-action');
            
            switch(action) {
                case 'view':
                    viewOrder(orderId);
                    break;
                case 'edit':
                    editOrder(orderId);
                    break;
                case 'call-result':
                    openCallResultModal(orderId);
                    break;
                case 'delete':
                    const orderNumber = button.getAttribute('data-order-number');
                    openDeleteOrderModal(orderId, orderNumber);
                    break;
            }
        }
    });
    
    // Row selection delegation
    document.addEventListener('click', function(event) {
        if (event.target.closest('.order-row')) {
            const row = event.target.closest('.order-row');
            const orderId = row.getAttribute('data-order-id');
            
            // Don't select row if clicking on action buttons
            if (!event.target.closest('.action-buttons')) {
                selectOrderRow(orderId);
            }
        }
    });
    
    // Keyboard navigation for row selection
    document.addEventListener('keydown', function(event) {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            navigateRows(event.key === 'ArrowDown' ? 1 : -1);
        }
    });
}

// Setup date filters with default values
function setupDateFilters() {
    const today = new Date();
    const oneMonthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    
    dateFrom.value = oneMonthAgo.toISOString().split('T')[0];
    dateTo.value = today.toISOString().split('T')[0];
}

// Load orders from MongoDB
async function loadOrders() {
    try {
        showLoading(true);
        
        // Build query parameters
        const params = new URLSearchParams();
        params.append('page', currentPage);
        params.append('limit', itemsPerPage);
        
        if (statusFilter.value) {
            params.append('status', statusFilter.value);
        }
        
        if (platformFilter.value) {
            params.append('platform', platformFilter.value);
        }
        
        if (dateFrom.value) {
            params.append('dateFrom', dateFrom.value);
        }
        
        if (dateTo.value) {
            params.append('dateTo', dateTo.value);
        }
        
        // Exclude confirmed orders (only show orders where callResult !== 'Confirmed')
        params.append('excludeConfirmed', 'true');
        
        const response = await fetch(`${API_BASE_URL}/orders?${params.toString()}`);
        const result = await response.json();
        
        if (result.success) {
            orders = result.data;
            totalPages = result.pages;
            renderOrders();
            updatePagination();
        } else {
            showMessage('Error loading orders: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        showMessage('Network error. Please check if the server is running.', 'error');
    } finally {
        showLoading(false);
    }
}

// Handle search with debouncing
function handleSearch() {
    loadOrders();
}

// Render orders table
function renderOrders() {
    const tbody = document.getElementById('ordersTableBody');
    
    if (orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="14" class="text-center text-muted">
                    <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                    No orders found
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = orders.map(order => {
        const statusClass = `status-${order.status.toLowerCase()}`;
        const totalItems = order.items ? order.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
        const products = order.items ? order.items.map(item => item.name).join(', ') : 'N/A';
        const address = `${order.shippingAddress.street}, ${order.shippingAddress.city}`;
        
        // Add confirmed-order class if call result is Confirmed
        const confirmedClass = order.callResult === 'Confirmed' ? 'confirmed-order' : '';
        
        return `
            <tr data-order-id="${order._id}" class="order-row ${confirmedClass}">
                <td>${order.orderNumber}</td>
                <td>${formatDate(order.createdAt)}</td>
                <td><span class="status ${statusClass}">${order.status}</span></td>
                <td>${order.customer.name}</td>
                <td>${order.customer.phone}</td>
                <td>${order.shippingAddress.state}</td>
                <td>${address}</td>
                <td>${order.totalAmount.toFixed(2)} EGP</td>
                <td>${totalItems}</td>
                <td>${products}</td>
                <td>Website</td>
                <td>${order.callResult || '—'}</td>
                <td>${order.assignedAgent ? `<span style="display: flex; align-items: center; gap: 6px;"><i class="fas fa-user-circle" style="color: #28a745;"></i> ${order.assignedAgent.name}</span>` : (order.agent || '—')}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn btn-view" data-order-id="${order._id}" data-action="view" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn btn-success" data-order-id="${order._id}" data-action="call-result" title="Add Call Result">
                            <i class="fas fa-headset"></i>
                        </button>
                        <button class="action-btn btn-edit" data-order-id="${order._id}" data-action="edit" title="Edit Order">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn btn-danger" data-order-id="${order._id}" data-order-number="${order.orderNumber}" data-action="delete" title="Delete Order">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Select order row and highlight it
function selectOrderRow(orderId) {
    // Remove selection from all rows
    document.querySelectorAll('.order-row').forEach(row => {
        row.classList.remove('selected');
    });
    
    // Add selection to clicked row
    const selectedRow = document.querySelector(`tr[data-order-id="${orderId}"]`);
    if (selectedRow) {
        selectedRow.classList.add('selected');
        
        // Store selected order ID for reference
        window.selectedOrderId = orderId;
    }
}

// Navigate rows with keyboard
function navigateRows(direction) {
    const rows = Array.from(document.querySelectorAll('.order-row'));
    if (rows.length === 0) return;
    
    const currentSelected = document.querySelector('.order-row.selected');
    let currentIndex = -1;
    
    if (currentSelected) {
        currentIndex = rows.indexOf(currentSelected);
    }
    
    let newIndex = currentIndex + direction;
    
    // Wrap around if needed
    if (newIndex < 0) {
        newIndex = rows.length - 1;
    } else if (newIndex >= rows.length) {
        newIndex = 0;
    }
    
    const orderId = rows[newIndex].getAttribute('data-order-id');
    selectOrderRow(orderId);
    
    // Scroll the selected row into view
    rows[newIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Update pagination
function updatePagination() {
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages || totalPages === 0;

    if (currentPage === 1) {
        prevBtn.style.opacity = '0.5';
        prevBtn.style.cursor = 'not-allowed';
    } else {
        prevBtn.style.opacity = '1';
        prevBtn.style.cursor = 'pointer';
    }

    if (currentPage === totalPages || totalPages === 0) {
        nextBtn.style.opacity = '0.5';
        nextBtn.style.cursor = 'not-allowed';
    } else {
        nextBtn.style.opacity = '1';
        nextBtn.style.cursor = 'pointer';
    }
}

// Pagination functions
function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        loadOrders();
    }
}

function nextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        loadOrders();
    }
}

// Sort table
function sortTable(columnIndex) {
    if (sortColumn === columnIndex) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = columnIndex;
        sortDirection = 'asc';
    }
    
    // For now, just reload with current filters
    // In a real implementation, you'd send sort parameters to the API
    loadOrders();
}

// Clear all filters
function clearFilters() {
    searchInput.value = '';
    statusFilter.value = '';
    platformFilter.value = '';
    dateFrom.value = '';
    dateTo.value = '';
    
    currentPage = 1;
    loadOrders();
}

// View order details
async function viewOrder(orderId) {
    try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`);
        const result = await response.json();
        
        if (result.success) {
            const order = result.data;
            const modal = document.getElementById('orderModal');
            const orderDetails = document.getElementById('orderDetails');
            
            const totalItems = order.items ? order.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
            const products = order.items ? order.items.map(item => `${item.name} (${item.quantity}x)`).join(', ') : 'N/A';
            
            
            orderDetails.innerHTML = `
                ${generateTimelineView(order)}
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <h3 style="color: #28a745; margin-bottom: 15px; border-bottom: 2px solid #f1f3f4; padding-bottom: 10px;">
                            <i class="fas fa-info-circle"></i> Order Information
                        </h3>
                        <p><strong>Order Number:</strong> ${order.orderNumber}</p>
                        <p><strong>Date:</strong> ${formatDate(order.createdAt)}</p>
                        <p><strong>Status:</strong> <span class="status status-${order.status.toLowerCase()}">${order.status}</span></p>
                        <p><strong>Tracking:</strong> ${order.trackingNumber || 'Not assigned'}</p>
                        <p><strong>Call Result:</strong> ${order.callResult || 'Not called'}</p>
                        <p><strong>Agent:</strong> ${order.assignedAgent ? `${order.assignedAgent.name} (@${order.assignedAgent.username})` : (order.agent || 'Not assigned')}</p>
                    </div>
                    <div>
                        <h3 style="color: #28a745; margin-bottom: 15px; border-bottom: 2px solid #f1f3f4; padding-bottom: 10px;">
                            <i class="fas fa-user"></i> Customer Information
                        </h3>
                        <p><strong>Name:</strong> ${order.customer.name}</p>
                        <p><strong>Email:</strong> ${order.customer.email}</p>
                        <p><strong>Phone:</strong> ${order.customer.phone}</p>
                    </div>
                </div>
                <div>
                    <h3 style="color: #28a745; margin-bottom: 15px; border-bottom: 2px solid #f1f3f4; padding-bottom: 10px;">
                        <i class="fas fa-map-marker-alt"></i> Shipping Address
                    </h3>
                    <p><strong>Address:</strong> ${order.shippingAddress.street}</p>
                    <p><strong>City:</strong> ${order.shippingAddress.city}</p>
                    <p><strong>State:</strong> ${order.shippingAddress.state}</p>
                    <p><strong>ZIP:</strong> ${order.shippingAddress.zipCode}</p>
                    <p><strong>Country:</strong> ${order.shippingAddress.country}</p>
                </div>
                <div>
                    <h3 style="color: #28a745; margin-bottom: 15px; border-bottom: 2px solid #f1f3f4; padding-bottom: 10px;">
                        <i class="fas fa-shopping-bag"></i> Order Details
                    </h3>
                    <p><strong>Items:</strong> ${products}</p>
                    <p><strong>Total Items:</strong> ${totalItems}</p>
                    <p><strong>Shipping Method:</strong> ${order.shippingMethod}</p>
                    <p><strong>Shipping Cost:</strong> ${order.shippingCost.toFixed(2)} EGP</p>
                    <p><strong>Tax:</strong> ${order.tax.toFixed(2)} EGP</p>
                    <p><strong>Total:</strong> <span style="font-size: 1.2rem; font-weight: bold; color: #28a745;">${order.totalAmount.toFixed(2)} EGP</span></p>
                </div>
            `;

            modal.style.display = 'block';
        } else {
            showMessage('Error loading order details: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error loading order:', error);
        showMessage('Network error loading order details.', 'error');
    }
}

// Edit order
async function editOrder(orderId) {
    try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`);
        const result = await response.json();
        
        if (result.success) {
            const order = result.data;
            
            // Populate the edit form with current values
            document.getElementById('editStatus').value = order.status;
            document.getElementById('editAddress').value = `${order.shippingAddress.street}, ${order.shippingAddress.city}`;
            document.getElementById('editPieces').value = order.items ? order.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
            document.getElementById('editPlatform').value = order.platform || '';
            document.getElementById('editNotes').value = order.notes || '';
            document.getElementById('editTotal').value = order.totalAmount || 0;

            // Show the edit modal
            document.getElementById('editModal').style.display = 'block';
            
            // Store the order ID for saving
            document.getElementById('editOrderForm').setAttribute('data-order-id', orderId);
        } else {
            showMessage('Error loading order for editing: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error loading order for editing:', error);
        showMessage('Network error loading order for editing.', 'error');
    }
}


// Handle edit order form submission
async function handleEditOrder(event) {
    event.preventDefault();
    
    const orderId = document.getElementById('editOrderForm').getAttribute('data-order-id');
    
    // Get all form values
    const updateData = {
        status: document.getElementById('editStatus').value,
        platform: document.getElementById('editPlatform').value,
        totalAmount: parseFloat(document.getElementById('editTotal').value),
        notes: document.getElementById('editNotes').value
    };
    
    // Add address update to notes if changed
    const address = document.getElementById('editAddress').value;
    const pieces = document.getElementById('editPieces').value;
    if (address || pieces) {
        updateData.notes = `${updateData.notes}\n\nUpdated Details:\n- Address: ${address}\n- Pieces: ${pieces}`;
    }
    
    try {
        showMessage('Updating order...', 'info');
        
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('Order updated successfully!', 'success');
            closeEditModal();
            loadOrders();
        } else {
            showMessage('Error updating order: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error updating order:', error);
        showMessage('Network error updating order.', 'error');
    }
}

// Add new order
function addNewOrder() {
    // Redirect to create order page or open modal
    window.location.href = 'create-order.html';
}

// Close modal
function closeModal() {
    document.getElementById('orderModal').style.display = 'none';
}

// Close edit modal
function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    document.getElementById('editOrderForm').reset();
}

// Call Result modal handlers
let callResultOrderId = null;

async function openCallResultModal(orderId) {
    callResultOrderId = orderId;
    
    // Load agents and call history
    await loadAgentsForCallResult();
    await loadCallHistoryForModal(orderId);
    
    document.getElementById('callResultModal').style.display = 'block';
}

// Load agents for call result modal
async function loadAgentsForCallResult() {
    try {
        const response = await fetch(`${API_BASE_URL}/agents?status=active`);
        const result = await response.json();
        
        const agentSelect = document.getElementById('callAgentSelect');
        agentSelect.innerHTML = '<option value="">Select Agent</option>';
        
        if (result.success && result.data) {
            result.data.forEach(agent => {
                const option = document.createElement('option');
                option.value = agent.name;
                option.textContent = `${agent.name} (${agent.department})`;
                agentSelect.appendChild(option);
            });
        } else {
            // Fallback to hardcoded agents if API fails
            const fallbackAgents = [
                'Alaa Hassan',
                'Mona Youssef', 
                'Karim Nabil',
                'Sara Adel',
                'Omar Tarek',
                'Nour Samir'
            ];
            
            fallbackAgents.forEach(agentName => {
                const option = document.createElement('option');
                option.value = agentName;
                option.textContent = agentName;
                agentSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading agents:', error);
        // Fallback to hardcoded agents
        const agentSelect = document.getElementById('callAgentSelect');
        agentSelect.innerHTML = '<option value="">Select Agent</option>';
        
        const fallbackAgents = [
            'Alaa Hassan',
            'Mona Youssef', 
            'Karim Nabil',
            'Sara Adel',
            'Omar Tarek',
            'Nour Samir'
        ];
        
        fallbackAgents.forEach(agentName => {
            const option = document.createElement('option');
            option.value = agentName;
            option.textContent = agentName;
            agentSelect.appendChild(option);
        });
    }
}

// Load call history for the modal
async function loadCallHistoryForModal(orderId) {
    try {
        const callHistoryContent = document.getElementById('callHistoryContent');
        
        // Show loading state
        callHistoryContent.innerHTML = `
            <div class="text-center text-muted" style="padding: 20px;">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                Loading call history...
            </div>
        `;
        
        const response = await fetch(`${API_BASE_URL}/call-logs/order/${orderId}`);
        const result = await response.json();
        
        if (result.success && result.data.length > 0) {
            // Sort by call date (newest first)
            const sortedLogs = result.data.sort((a, b) => new Date(b.callDate) - new Date(a.callDate));
            
            callHistoryContent.innerHTML = sortedLogs.map(log => `
                <div style="border-bottom: 1px solid #e1e5e9; padding: 12px 0; margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <strong style="color: #667eea; font-size: 0.95rem;">${log.agentName}</strong>
                        <span style="font-size: 0.85rem; color: #6c757d;">${new Date(log.callDate).toLocaleString()}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <span class="status status-${log.callResult.toLowerCase().replace(/\s+/g, '-')}" style="font-size: 0.85rem; padding: 3px 8px;">
                            ${log.callResult}
                        </span>
                        <span style="font-size: 0.85rem; color: #6c757d;">
                            ${log.statusBeforeCall} → ${log.statusAfterCall}
                        </span>
                    </div>
                    ${log.callNotes ? `<p style="font-size: 0.85rem; color: #495057; margin: 6px 0; font-style: italic; background: white; padding: 8px; border-radius: 4px;">"${log.callNotes}"</p>` : ''}
                </div>
            `).join('');
            
            // Set the last call result as default
            if (sortedLogs.length > 0) {
                const lastCallResult = sortedLogs[0].callResult;
                const callResultSelect = document.getElementById('callResultSelect');
                callResultSelect.value = lastCallResult;
                
                // Also set the last agent as default
                const lastAgent = sortedLogs[0].agentName;
                const agentSelect = document.getElementById('callAgentSelect');
                agentSelect.value = lastAgent;
            }
            
        } else {
            callHistoryContent.innerHTML = `
                <div class="text-center text-muted" style="padding: 20px;">
                    <i class="fas fa-phone-slash" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                    No call history recorded yet
                </div>
            `;
        }
    } catch (error) {
        console.warn('Error loading call history:', error);
        document.getElementById('callHistoryContent').innerHTML = `
            <div class="text-center text-danger" style="padding: 20px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                Error loading call history
            </div>
        `;
    }
}

function closeCallResultModal() {
    document.getElementById('callResultModal').style.display = 'none';
    
    // Reset the submit button to its original state
    const submitButton = document.querySelector('button[form="callResultForm"][type="submit"]') ||
                        document.querySelector('#callResultModal button[type="submit"]') ||
                        document.querySelector('#callResultModal .btn-primary');
    
    if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML = 'Save';
    }
    
    // Clear the form and call history
    document.getElementById('callResultForm').reset();
    document.getElementById('callHistoryContent').innerHTML = `
        <div class="text-center text-muted" style="padding: 20px;">
            <i class="fas fa-phone-slash" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
            Loading call history...
        </div>
    `;
    callResultOrderId = null;
}

async function handleCallResult(event) {
    event.preventDefault();
    
    if (!callResultOrderId) return;
    
    const callResult = document.getElementById('callResultSelect').value;
    const agent = document.getElementById('callAgentSelect').value;
    const callNotes = document.getElementById('callNotesInput')?.value || '';
    
    // Get submit button - it's outside the form but linked via form attribute
    const submitButton = document.querySelector('button[form="callResultForm"][type="submit"]') ||
                        document.querySelector('#callResultModal button[type="submit"]') ||
                        document.querySelector('#callResultModal .btn-primary');
    
    if (!submitButton) {
        console.error('Submit button not found in modal');
        return;
    }
    
    const originalButtonText = submitButton.innerHTML;
    
    // Show loader and disable button
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    
    try {
        // Get current order details for call log
        const orderResponse = await fetch(`${API_BASE_URL}/orders/${callResultOrderId}`);
        const orderResult = await orderResponse.json();
        
        if (!orderResult.success) {
            showMessage('Error loading order details: ' + orderResult.message, 'error');
            // Re-enable button
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
            return;
        }
        
        const order = orderResult.data;
        const statusBeforeCall = order.status;
        
        // Prepare update data
        const updateData = {
            callResult: callResult,
            agent: agent
        };
        
        // If call result is "Confirmed", also update status to "processing" (in progress)
        let statusAfterCall = statusBeforeCall;
        if (callResult === 'Confirmed') {
            updateData.status = 'processing';
            statusAfterCall = 'processing';
        }
        
        // Update order
        const response = await fetch(`${API_BASE_URL}/orders/${callResultOrderId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Create call log entry
            const callLogData = {
                orderId: callResultOrderId,
                agentName: agent,
                callResult: callResult,
                callNotes: callNotes,
                statusBeforeCall: statusBeforeCall,
                statusAfterCall: statusAfterCall,
                callType: 'Outbound',
                callDate: new Date().toISOString()
            };
            
            try {
                const callLogResponse = await fetch(`${API_BASE_URL}/call-logs`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(callLogData)
                });
                
                const callLogResult = await callLogResponse.json();
                
                if (!callLogResult.success) {
                    console.warn('Call log creation failed:', callLogResult.message);
                }
            } catch (callLogError) {
                console.warn('Error creating call log:', callLogError);
                // Don't fail the main operation if call log fails
            }
            
            let message = 'Call result added successfully!';
            if (callResult === 'Confirmed') {
                message += ' Order status updated to "In Progress".';
            }
            message += ' Call logged with timestamp.';
            
            showMessage(message, 'success');
            
            // Reload orders to show updated data
            await loadOrders();
            
            // Close the modal on success
            closeCallResultModal();
        } else {
            showMessage('Error adding call result: ' + result.message, 'error');
            // Re-enable button on error
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    } catch (error) {
        console.error('Error adding call result:', error);
        showMessage('Network error adding call result.', 'error');
        // Re-enable button on error
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
    }
}

// Utility functions
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
    });
}

// Generate timeline view
function generateTimelineView(order) {
    const timeline = order.timeline || {};
    
    const events = [
        {
            icon: 'fa-plus-circle',
            title: 'Order Created',
            date: order.createdAt || timeline.createdAt,
            color: '#28a745'
        },
        {
            icon: 'fa-phone',
            title: 'Last Calling Time',
            date: timeline.lastCallingTime,
            color: '#ffc107'
        },
        {
            icon: 'fa-check-circle',
            title: 'Marked Ready for Delivery',
            date: timeline.readyForDeliveryAt,
            color: '#28a745'
        },
        {
            icon: 'fa-user-tie',
            title: 'Assigned to Delivery',
            date: timeline.assignedToDeliveryAt,
            color: '#2e3943'
        },
        {
            icon: 'fa-truck',
            title: 'Shipped',
            date: timeline.shippedAt,
            color: '#6c757d'
        },
        {
            icon: 'fa-box-open',
            title: 'Delivered',
            date: timeline.deliveredAt,
            color: '#28a745'
        }
    ];
    
    const timelineHtml = events
        .filter(event => event.date)
        .map((event, index) => `
            <div class="timeline-item" style="display: flex; gap: 15px; margin-bottom: 20px; position: relative;">
                <div style="width: 40px; height: 40px; background: ${event.color}; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
                    <i class="fas ${event.icon}" style="color: white; font-size: 1rem;"></i>
                </div>
                <div style="flex: 1; padding-top: 5px;">
                    <div style="font-weight: 600; color: #2c3e50; margin-bottom: 3px;">${event.title}</div>
                    <div style="color: #6c757d; font-size: 0.9rem;">${formatDate(event.date)}</div>
                </div>
            </div>
        `).join('');
    
    if (!timelineHtml) {
        return '';
    }
    
    return `
        <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; margin-bottom: 25px; border-left: 4px solid #28a745;">
            <h3 style="color: #2c3e50; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-history"></i> Order Timeline
            </h3>
            <div class="timeline-container">
                ${timelineHtml}
            </div>
        </div>
    `;
}


function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showLoading(show) {
    const tbody = document.getElementById('ordersTableBody');
    if (show) {
        tbody.innerHTML = `
            <tr>
                <td colspan="14" class="text-center">
                    <div class="loading"></div>
                    <p style="margin-top: 10px;">Loading orders...</p>
                </td>
            </tr>
        `;
    }
}

function showMessage(message, type = 'info') {
    // Create a simple notification
    const notification = document.createElement('div');
    notification.className = `message ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        max-width: 400px;
        animation: slideIn 0.3s ease;
    `;
    
    if (type === 'success') {
        notification.style.background = '#28a745';
    } else if (type === 'error') {
        notification.style.background = '#dc3545';
    } else {
        notification.style.background = '#17a2b8';
    }
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

// Delete Order Functions
let orderToDelete = null;

function openDeleteOrderModal(orderId, orderNumber) {
    orderToDelete = orderId;
    document.getElementById('deleteOrderNumber').textContent = orderNumber;
    document.getElementById('deleteOrderModal').style.display = 'block';
}

function closeDeleteOrderModalHandler() {
    orderToDelete = null;
    document.getElementById('deleteOrderModal').style.display = 'none';
}

async function confirmDeleteOrder() {
    if (!orderToDelete) return;
    
    const confirmBtn = document.getElementById('confirmDeleteOrderBtn');
    const originalText = confirmBtn.innerHTML;
    
    try {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
        
        const response = await fetch(`${API_BASE_URL}/orders/${orderToDelete}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('Order deleted successfully!', 'success');
            closeDeleteOrderModalHandler();
            // Reload orders
            await fetchOrders();
        } else {
            showMessage(result.message || 'Failed to delete order', 'error');
        }
    } catch (error) {
        console.error('Error deleting order:', error);
        showMessage('Error deleting order', 'error');
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = originalText;
    }
}

// Delete All Orders Functions
function openDeleteAllOrdersModal() {
    const totalOrders = orders.length;
    document.getElementById('totalOrdersCount').textContent = totalOrders;
    document.getElementById('deleteAllOrdersModal').style.display = 'block';
}

function closeDeleteAllOrdersModalHandler() {
    document.getElementById('deleteAllOrdersModal').style.display = 'none';
}

async function confirmDeleteAllOrders() {
    const confirmBtn = document.getElementById('confirmDeleteAllBtn');
    const originalText = confirmBtn.innerHTML;
    
    try {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting All...';
        
        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage(`Successfully deleted ${result.deletedCount || 'all'} orders!`, 'success');
            closeDeleteAllOrdersModalHandler();
            // Reload orders (should be empty now)
            await fetchOrders();
        } else {
            showMessage(result.message || 'Failed to delete all orders', 'error');
        }
    } catch (error) {
        console.error('Error deleting all orders:', error);
        showMessage('Error deleting all orders', 'error');
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = originalText;
    }
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    const orderModal = document.getElementById('orderModal');
    const editModal = document.getElementById('editModal');
    const callResultModal = document.getElementById('callResultModal');
    
    if (event.target === orderModal) {
        orderModal.style.display = 'none';
    }
    
    if (event.target === editModal) {
        closeEditModal();
    }
    
    if (event.target === callResultModal) {
        closeCallResultModal();
    }
});