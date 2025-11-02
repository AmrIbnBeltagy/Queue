# 📦 WooCommerce Integration API Documentation

## Overview
This API provides endpoints to receive and process orders from WooCommerce (or any WordPress e-commerce platform) into your shipping management system.

## Base URL
```
http://localhost:3000/api/woocommerce
```

For production with ngrok:
```
https://gale-homy-caprice.ngrok-free.dev/api/woocommerce
```

---

## 🔌 Endpoints

### 1. Check API Status
**GET** `/api/woocommerce/status`

Check if the WooCommerce webhook endpoint is active and database connection status.

**Response Example:**
```json
{
  "success": true,
  "message": "WooCommerce webhook endpoint is active",
  "endpoints": {
    "webhook": "/api/woocommerce/webhook",
    "test": "/api/woocommerce/test",
    "testSave": "/api/woocommerce/test/save",
    "status": "/api/woocommerce/status"
  },
  "databaseStatus": "Connected",
  "timestamp": "2025-10-07T20:15:51.225Z"
}
```

---

### 2. Test Endpoint (No Database Save)
**POST** `/api/woocommerce/test`

Test the API without saving to database. Good for debugging and testing your webhook payload.

**Request Body Example:**
```json
{
  "id": 102,
  "status": "processing",
  "name": "Amr Beltagy",
  "phone": "0501234567",
  "billing": "Jeddah, Saudi Arabia",
  "products": "Product A, Product B",
  "total": "250.00",
  "date": "2025-10-07"
}
```

**Response Example:**
```json
{
  "success": true,
  "message": "Test order received successfully",
  "receivedData": {
    "id": 102,
    "status": "processing",
    "name": "Amr Beltagy",
    "phone": "0501234567",
    "billing": "Jeddah, Saudi Arabia",
    "products": "Product A, Product B",
    "total": "250.00",
    "date": "2025-10-07"
  }
}
```

---

### 3. Test with Database Save
**POST** `/api/woocommerce/test/save`

Test the API and save the order to your database. Uses the same simple format as the test endpoint.

**Request Body:** Same as test endpoint

**Response Example:**
```json
{
  "success": true,
  "message": "Test order saved successfully",
  "testOrderId": 102,
  "systemOrderId": "68e5783ca13eefe9ca38a57b",
  "orderNumber": "TEST-102",
  "order": {
    "orderNumber": "TEST-102",
    "customer": {
      "name": "Amr Beltagy",
      "email": "customer102@test.com",
      "phone": "+966501234567"
    },
    "shippingAddress": {
      "street": "Jeddah, Saudi Arabia",
      "city": "Jeddah",
      "state": "Jeddah",
      "zipCode": "12345",
      "country": "Saudi Arabia"
    },
    "items": [...],
    "status": "processing",
    "totalAmount": 250,
    ...
  }
}
```

---

### 4. WooCommerce Webhook (Production)
**POST** `/api/woocommerce/webhook`

The main endpoint for receiving orders from WooCommerce webhooks. Automatically saves orders to the database.

**Supported WooCommerce Webhook Formats:**
1. **Full WooCommerce Format** (with `line_items`, `billing`, `shipping`, etc.)
2. **Simple Format** (like the test endpoint)

**Full WooCommerce Request Example:**
```json
{
  "id": 12345,
  "status": "processing",
  "customer_note": "Please deliver in the morning",
  "billing": {
    "first_name": "Ahmed",
    "last_name": "Hassan",
    "email": "ahmed@example.com",
    "phone": "+966501234567",
    "address_1": "123 King Fahd Road",
    "city": "Riyadh",
    "state": "Riyadh Region",
    "postcode": "11564",
    "country": "SA"
  },
  "shipping": {
    "first_name": "Ahmed",
    "last_name": "Hassan",
    "address_1": "123 King Fahd Road",
    "city": "Riyadh",
    "state": "Riyadh Region",
    "postcode": "11564",
    "country": "SA"
  },
  "line_items": [
    {
      "name": "Gaming Laptop",
      "product_id": 789,
      "quantity": 1,
      "price": "1200.00",
      "total": "1200.00"
    }
  ],
  "shipping_lines": [
    {
      "method_title": "Express Shipping"
    }
  ],
  "total": "1250.00",
  "shipping_total": "50.00",
  "total_tax": "0.00"
}
```

**Response Example:**
```json
{
  "success": true,
  "message": "Order received and saved successfully",
  "wooOrderId": 12345,
  "systemOrderId": "68e5783ca13eefe9ca38a57b",
  "orderNumber": "WOO-12345"
}
```

---

## 📊 Status Mapping

WooCommerce statuses are automatically mapped to your system:

| WooCommerce Status | System Status |
|-------------------|---------------|
| `pending`         | `pending`     |
| `processing`      | `processing`  |
| `on-hold`         | `pending`     |
| `completed`       | `delivered`   |
| `cancelled`       | `cancelled`   |
| `refunded`        | `returned`    |
| `failed`          | `cancelled`   |

---

## 🔧 Setting Up WooCommerce Webhook

1. **In WordPress Admin:**
   - Go to `WooCommerce` → `Settings` → `Advanced` → `Webhooks`
   - Click `Add webhook`

2. **Webhook Configuration:**
   - **Name**: Shipping System Integration
   - **Status**: Active
   - **Topic**: Order created (or Order updated)
   - **Delivery URL**: `https://your-ngrok-domain.ngrok-free.dev/api/woocommerce/webhook`
   - **Secret**: (optional, for security)
   - **API Version**: WC API (latest)

3. **Save** and test by creating a test order in WooCommerce

---

## 🧪 Testing with cURL

### Test Status:
```bash
curl http://localhost:3000/api/woocommerce/status
```

### Test Order (No Save):
```bash
curl -X POST http://localhost:3000/api/woocommerce/test \
  -H "Content-Type: application/json" \
  -d '{
    "id": 102,
    "status": "processing",
    "name": "Amr Beltagy",
    "phone": "0501234567",
    "billing": "Jeddah, Saudi Arabia",
    "products": "Product A, Product B",
    "total": "250.00",
    "date": "2025-10-07"
  }'
```

### Test Order (With Save):
```bash
curl -X POST http://localhost:3000/api/woocommerce/test/save \
  -H "Content-Type: application/json" \
  -d '{
    "id": 102,
    "status": "processing",
    "name": "Amr Beltagy",
    "phone": "0501234567",
    "billing": "Jeddah, Saudi Arabia",
    "products": "Product A, Product B",
    "total": "250.00",
    "date": "2025-10-07"
  }'
```

---

## 🚀 Using with ngrok

1. **Install ngrok** (if not installed):
   ```bash
   npm install -g ngrok
   ```

2. **Start your server:**
   ```bash
   npm start
   ```

3. **In a new terminal, start ngrok:**
   ```bash
   ngrok http 3000
   ```

4. **Your Current ngrok URL:**
   ```
   https://gale-homy-caprice.ngrok-free.dev
   ```

5. **Use this URL in WooCommerce webhook:**
   ```
   https://gale-homy-caprice.ngrok-free.dev/api/woocommerce/webhook
   ```

---

## 📝 Order Data Transformation

The API automatically transforms WooCommerce orders to match your system:

- **Order Number**: `WOO-{woocommerce_order_id}` or `TEST-{id}`
- **Phone**: Automatically formatted to international format (+966...)
- **Address**: Parsed from billing/shipping data
- **Products**: Extracted from `line_items` or `products` field
- **Call Result**: Set to "Pending" by default
- **Status**: Mapped from WooCommerce status

---

## ⚠️ Error Handling

### Database Not Connected:
```json
{
  "message": "Order received and logged (database not available)",
  "orderId": 102
}
```

### Validation Error:
```json
{
  "success": false,
  "message": "Error processing order",
  "error": "Order validation failed: ..."
}
```

---

## 📞 Support

For issues or questions, check:
- Server logs in terminal
- MongoDB connection status
- WooCommerce webhook delivery logs
- API status endpoint: `/api/woocommerce/status`

---

## 🎯 Features

✅ Automatic order synchronization from WooCommerce  
✅ Phone number formatting and validation  
✅ Address parsing and normalization  
✅ Product line item extraction  
✅ Status mapping  
✅ Test endpoints for debugging  
✅ Graceful error handling  
✅ Database connection checking  
✅ Order logging in console  

---

**Last Updated**: October 7, 2025  
**API Version**: 1.0.0

