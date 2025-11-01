# Delivery Rider API Documentation

## Overview

The Delivery Rider API provides a comprehensive interface for delivery riders to interact with the florist e-commerce system. This API is built using vanilla JavaScript and Firebase Firestore, allowing riders to manage their deliveries, update their status, and track their location.

## Installation

\`\`\`javascript
import DeliveryRiderAPI from './js/delivery-rider-api.js';

const riderAPI = new DeliveryRiderAPI();
riderAPI.setRiderId('your-rider-id');
\`\`\`

## API Reference

### Initialization

#### `setRiderId(riderId)`

Initialize the API with a rider ID. This must be called before using any other methods.

**Parameters:**
- `riderId` (string): The unique identifier for the delivery rider

**Example:**
\`\`\`javascript
riderAPI.setRiderId('rider_001');
\`\`\`

---

### Order Management

#### `fetchAssignedOrders()`

Fetch all orders assigned to the current rider.

**Returns:** `Promise<Object>`
\`\`\`javascript
{
  success: true,
  orders: [
    {
      id: "order123",
      userId: "user456",
      items: [...],
      total: 1500,
      status: "assigned",
      riderId: "rider_001",
      deliveryInfo: {...},
      createdAt: Timestamp
    }
  ],
  count: 5
}
\`\`\`

**Example:**
\`\`\`javascript
const result = await riderAPI.fetchAssignedOrders();
console.log(`You have ${result.count} assigned orders`);
\`\`\`

---

#### `fetchPendingOrders()`

Fetch only pending orders that need to be accepted by the rider.

**Returns:** `Promise<Object>`
\`\`\`javascript
{
  success: true,
  orders: [...],
  count: 2
}
\`\`\`

**Example:**
\`\`\`javascript
const pending = await riderAPI.fetchPendingOrders();
console.log(`You have ${pending.count} pending orders`);
\`\`\`

---

#### `acceptOrder(orderId)`

Accept an assigned order and change its status to "picked_up".

**Parameters:**
- `orderId` (string): The ID of the order to accept

**Returns:** `Promise<Object>`
\`\`\`javascript
{
  success: true,
  message: "Order accepted successfully",
  orderId: "order123"
}
\`\`\`

**Example:**
\`\`\`javascript
const result = await riderAPI.acceptOrder('order123');
if (result.success) {
  console.log('Order accepted!');
}
\`\`\`

---

#### `updateDeliveryStatus(orderId, status, notes)`

Update the delivery status of an order.

**Parameters:**
- `orderId` (string): The ID of the order
- `status` (string): New status - must be one of: `picked_up`, `in_transit`, `delivered`
- `notes` (string, optional): Additional notes about the status update

**Returns:** `Promise<Object>`
\`\`\`javascript
{
  success: true,
  message: "Order status updated to in_transit",
  orderId: "order123",
  newStatus: "in_transit"
}
\`\`\`

**Example:**
\`\`\`javascript
const result = await riderAPI.updateDeliveryStatus(
  'order123', 
  'in_transit', 
  'On the way to customer'
);
\`\`\`

---

#### `getOrderDetails(orderId)`

Get detailed information about a specific order.

**Parameters:**
- `orderId` (string): The ID of the order

**Returns:** `Promise<Object>`
\`\`\`javascript
{
  success: true,
  order: {
    id: "order123",
    userId: "user456",
    items: [...],
    total: 1500,
    status: "in_transit",
    deliveryInfo: {
      fullName: "John Doe",
      phone: "09123456789",
      address: "123 Main St",
      city: "Manila",
      postalCode: "1000"
    },
    createdAt: Timestamp
  }
}
\`\`\`

**Example:**
\`\`\`javascript
const result = await riderAPI.getOrderDetails('order123');
console.log(result.order.deliveryInfo.address);
\`\`\`

---

### Location Management

#### `updateRiderLocation(latitude, longitude)`

Update the rider's current GPS location.

**Parameters:**
- `latitude` (number): Latitude coordinate (-90 to 90)
- `longitude` (number): Longitude coordinate (-180 to 180)

**Returns:** `Promise<Object>`
\`\`\`javascript
{
  success: true,
  message: "Location updated successfully",
  location: {
    latitude: 14.5995,
    longitude: 120.9842
  }
}
\`\`\`

**Example:**
\`\`\`javascript
// Using browser geolocation
navigator.geolocation.getCurrentPosition(async (position) => {
  const result = await riderAPI.updateRiderLocation(
    position.coords.latitude,
    position.coords.longitude
  );
  console.log('Location updated!');
});
\`\`\`

---

### Rider Status Management

#### `updateOnlineStatus(isOnline)`

Update the rider's online/offline status.

**Parameters:**
- `isOnline` (boolean): `true` for online, `false` for offline

**Returns:** `Promise<Object>`
\`\`\`javascript
{
  success: true,
  message: "Status updated to online",
  isOnline: true
}
\`\`\`

**Example:**
\`\`\`javascript
// Go online
await riderAPI.updateOnlineStatus(true);

// Go offline
await riderAPI.updateOnlineStatus(false);
\`\`\`

---

#### `getRiderInfo()`

Get the current rider's information and status.

**Returns:** `Promise<Object>`
\`\`\`javascript
{
  success: true,
  rider: {
    id: "rider_001",
    name: "John Rider",
    phone: "09123456789",
    isOnline: true,
    location: {
      latitude: 14.5995,
      longitude: 120.9842,
      updatedAt: Timestamp
    },
    lastActive: Timestamp
  }
}
\`\`\`

**Example:**
\`\`\`javascript
const result = await riderAPI.getRiderInfo();
console.log(`Rider: ${result.rider.name}`);
console.log(`Status: ${result.rider.isOnline ? 'Online' : 'Offline'}`);
\`\`\`

---

## Error Handling

All API methods return a consistent error format:

\`\`\`javascript
{
  success: false,
  error: "Error message describing what went wrong"
}
\`\`\`

**Example:**
\`\`\`javascript
const result = await riderAPI.acceptOrder('invalid-order-id');
if (!result.success) {
  console.error('Error:', result.error);
  // Handle error appropriately
}
\`\`\`

---

## Complete Usage Example

\`\`\`javascript
import DeliveryRiderAPI from './js/delivery-rider-api.js';

// Initialize API
const riderAPI = new DeliveryRiderAPI();
riderAPI.setRiderId('rider_001');

// Go online
await riderAPI.updateOnlineStatus(true);

// Fetch pending orders
const pending = await riderAPI.fetchPendingOrders();
console.log(`You have ${pending.count} pending orders`);

// Accept first order
if (pending.orders.length > 0) {
  const firstOrder = pending.orders[0];
  await riderAPI.acceptOrder(firstOrder.id);
  
  // Update location
  navigator.geolocation.getCurrentPosition(async (position) => {
    await riderAPI.updateRiderLocation(
      position.coords.latitude,
      position.coords.longitude
    );
  });
  
  // Update status to in transit
  await riderAPI.updateDeliveryStatus(
    firstOrder.id, 
    'in_transit',
    'On the way to customer'
  );
  
  // When delivered
  await riderAPI.updateDeliveryStatus(
    firstOrder.id, 
    'delivered',
    'Package delivered successfully'
  );
}

// Go offline when done
await riderAPI.updateOnlineStatus(false);
\`\`\`

---

## Demo Page

A demo page is available at `rider-demo.html` that showcases all API functionality with an interactive interface. Use this page to test the API and understand how each method works.

---

## Firebase Requirements

The API requires the following Firestore collections:

### `orders` Collection
\`\`\`javascript
{
  id: "order123",
  userId: "user456",
  riderId: "rider_001",
  status: "assigned" | "picked_up" | "in_transit" | "delivered",
  items: [...],
  total: 1500,
  deliveryInfo: {...},
  createdAt: Timestamp,
  updatedAt: Timestamp,
  acceptedAt: Timestamp,
  deliveredAt: Timestamp
}
\`\`\`

### `riders` Collection
\`\`\`javascript
{
  id: "rider_001",
  name: "John Rider",
  phone: "09123456789",
  isOnline: true,
  location: {
    latitude: 14.5995,
    longitude: 120.9842,
    updatedAt: Timestamp
  },
  lastActive: Timestamp
}
\`\`\`

---

## Security Considerations

1. **Authentication**: In production, implement proper authentication to verify rider identity
2. **Authorization**: Ensure riders can only access their assigned orders
3. **Rate Limiting**: Implement rate limiting for location updates
4. **Data Validation**: All inputs are validated before database operations
5. **Error Handling**: Comprehensive error handling prevents data corruption

---

## Support

For issues or questions about the Delivery Rider API, please contact the development team or refer to the main system documentation.
