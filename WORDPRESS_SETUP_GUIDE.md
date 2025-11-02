# 🚀 WordPress/WooCommerce Setup Guide

## Quick Setup for Your Shipping System

Your Order Management System is live at:
**https://gale-homy-caprice.ngrok-free.dev**

---

## 📋 Step-by-Step WooCommerce Webhook Configuration

### 1. Access WooCommerce Settings
1. Login to your WordPress Admin Dashboard
2. Navigate to: **WooCommerce** → **Settings**
3. Click on the **Advanced** tab
4. Click on **Webhooks** sub-tab

### 2. Create New Webhook
Click the **"Add webhook"** button

### 3. Webhook Configuration

Fill in the following details:

| Field | Value |
|-------|-------|
| **Name** | Shipping System Integration |
| **Status** | ✅ Active |
| **Topic** | Order created |
| **Delivery URL** | `https://gale-homy-caprice.ngrok-free.dev/api/woocommerce/webhook` |
| **Secret** | (Leave empty or add your own) |
| **API Version** | WP REST API Integration v3 |

### 4. Save Configuration
Click **"Save webhook"** button at the bottom

---

## 🧪 Test Your Integration

### Option 1: Test from WooCommerce
1. Go to your WooCommerce webhook settings
2. Find your newly created webhook
3. Click **"View"** or **"Edit"**
4. Scroll down to **"Logs"** section
5. Create a test order in WooCommerce
6. Check if the webhook shows "Successful" delivery

### Option 2: Test with API Directly

**Test Endpoint (No Database Save):**
```bash
curl -X POST https://gale-homy-caprice.ngrok-free.dev/api/woocommerce/test \
  -H "Content-Type: application/json" \
  -d '{
    "id": 999,
    "status": "processing",
    "name": "Test Customer",
    "phone": "0501234567",
    "billing": "Riyadh, Saudi Arabia",
    "products": "Test Product",
    "total": "100.00",
    "date": "2025-10-07"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Test order received successfully"
}
```

---

## 📊 Check Your Orders

After creating a test order in WooCommerce:

1. **View in Dashboard:**
   Visit: https://gale-homy-caprice.ngrok-free.dev

2. **Check for New Order:**
   - Order will appear with prefix `WOO-{order_id}`
   - Status will be automatically mapped
   - Call Result will be set to "Pending"

3. **Assign to Agent:**
   - Click on the order
   - Add call result
   - Assign agent

---

## 🔍 API Endpoints Available

### Check API Status
```
GET https://gale-homy-caprice.ngrok-free.dev/api/woocommerce/status
```

### Main Webhook (Production)
```
POST https://gale-homy-caprice.ngrok-free.dev/api/woocommerce/webhook
```

### Test Endpoint (No Save)
```
POST https://gale-homy-caprice.ngrok-free.dev/api/woocommerce/test
```

### Test with Database Save
```
POST https://gale-homy-caprice.ngrok-free.dev/api/woocommerce/test/save
```

---

## 📦 What Happens When Order is Received?

1. **WooCommerce** creates new order
2. **Webhook** triggers automatically
3. **Your API** receives order data
4. **System processes:**
   - ✅ Formats phone number (+966...)
   - ✅ Parses billing address
   - ✅ Maps order status
   - ✅ Creates order in database
   - ✅ Sets call result to "Pending"
5. **Order appears** in your dashboard
6. **Agent** can now process the order

---

## 🎯 Supported Order Data Fields

### Automatically Handled:
- ✅ Customer name
- ✅ Phone number (auto-formatted)
- ✅ Email address
- ✅ Billing/Shipping address
- ✅ Order items/products
- ✅ Order total
- ✅ Order status
- ✅ Order date

### Set by System:
- Order Number: `WOO-{woocommerce_order_id}`
- Call Result: `Pending`
- Status: Mapped from WooCommerce

---

## 🔐 Security Tips

### 1. Use Webhook Secret (Recommended)
In WooCommerce webhook settings, add a secret key to verify requests.

### 2. Whitelist IPs (Optional)
If using a firewall, whitelist WooCommerce webhook IPs.

### 3. Monitor Logs
Check your terminal for webhook delivery logs:
```
✅ WooCommerce Order received:
✅ Order saved to database: WOO-12345
```

---

## ⚠️ Troubleshooting

### Webhook Not Firing?
1. Check webhook status is "Active"
2. Verify delivery URL is correct
3. Check WooCommerce webhook logs for errors
4. Ensure ngrok is running
5. Test with `/api/woocommerce/status` endpoint

### Order Not Showing in Dashboard?
1. Check server terminal for errors
2. Verify database connection
3. Check order filters on dashboard
4. Look for TEST-xxx or WOO-xxx prefix

### Phone Number Issues?
Phone numbers starting with "0" are automatically converted to international format (+966...)

### Address Not Parsed Correctly?
Format billing field as: `City, Country`
Example: `Jeddah, Saudi Arabia`

---

## 📞 Quick Reference

| Item | URL/Value |
|------|-----------|
| **Dashboard** | https://gale-homy-caprice.ngrok-free.dev |
| **Webhook URL** | https://gale-homy-caprice.ngrok-free.dev/api/woocommerce/webhook |
| **API Status** | https://gale-homy-caprice.ngrok-free.dev/api/woocommerce/status |
| **Test Endpoint** | https://gale-homy-caprice.ngrok-free.dev/api/woocommerce/test |
| **Local Server** | http://localhost:3000 |

---

## 📝 Example WooCommerce Order Payload

When WooCommerce sends an order, it looks like this:

```json
{
  "id": 12345,
  "status": "processing",
  "billing": {
    "first_name": "Ahmed",
    "last_name": "Hassan",
    "phone": "+966501234567",
    "email": "ahmed@example.com",
    "address_1": "123 King Fahd Road",
    "city": "Riyadh",
    "country": "SA"
  },
  "line_items": [
    {
      "name": "Product Name",
      "quantity": 1,
      "total": "100.00"
    }
  ],
  "total": "100.00"
}
```

This gets transformed into your order format automatically!

---

## ✅ Next Steps

1. ✅ **Set up webhook** in WooCommerce
2. ✅ **Test** with a sample order
3. ✅ **Verify** order appears in dashboard
4. ✅ **Train agents** on new workflow
5. ✅ **Monitor** webhook logs

---

**Last Updated**: October 7, 2025  
**System Status**: ✅ Active  
**Database**: ✅ Connected  

For detailed API documentation, see: `WOOCOMMERCE_API.md`



