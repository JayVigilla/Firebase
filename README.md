# Florist E-Commerce System

A complete e-commerce system for a florist shop built with pure HTML, CSS, and JavaScript, integrated with Firebase for backend services.

## Features

### User Interface
- **Authentication**: Login, Register, Forgot Password
- **Product Browsing**: Shop page with category filtering (Cakes & Bouquets)
- **Product Details**: Detailed product pages with image gallery
- **Shopping Cart**: Add, update, remove items with real-time total calculation
- **Checkout Process**: 3-step checkout (Delivery Info → Payment → Confirmation)
- **Payment**: GCash payment simulation with QR code and receipt upload
- **Order Tracking**: Real-time order status tracking with timeline
- **User Profile**: Profile management with order history
- **Contact Form**: Customer support and complaint submission
- **Breadcrumb Navigation**: Easy navigation on all pages
- **Responsive Design**: Mobile-friendly interface

### Admin Interface
- **Separate Admin Login**: Secure admin portal (admin@florist.com / adminflorist123)
- **Dashboard**: Overview with statistics and recent orders
- **Product Management**: Full CRUD operations for products
- **Order Management**: View, update status, assign riders
- **User Management**: View users, ban/unban, delete accounts
- **Rider Management**: Manage delivery riders, track online/offline status
- **Payment Verification**: View and verify payment receipts
- **PDF Receipts**: Generate downloadable order receipts

### Delivery Rider API
- **Order Management**: Fetch assigned and pending orders
- **Accept Orders**: Accept assigned deliveries
- **Status Updates**: Update delivery status (picked_up, in_transit, delivered)
- **Location Tracking**: Update rider GPS location
- **Online Status**: Toggle online/offline availability
- **Rider Information**: Access rider profile and stats

## Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **PDF Generation**: jsPDF library
- **Icons**: Lucide Icons (via CDN)

## Project Structure

\`\`\`
florist-ecommerce/
├── index.html                 # Home page with carousel
├── login.html                 # User login
├── register.html              # User registration
├── forgot-password.html       # Password recovery
├── shop.html                  # Product listing
├── product-detail.html        # Product details
├── cart.html                  # Shopping cart
├── checkout.html              # Checkout step 1
├── payment.html               # Checkout step 2
├── confirmation.html          # Checkout step 3
├── order-tracking.html        # Order tracking
├── profile.html               # User profile
├── contact.html               # Contact form
├── admin-login.html           # Admin login
├── admin-dashboard.html       # Admin dashboard
├── admin-products.html        # Product management
├── admin-orders.html          # Order management
├── admin-users.html           # User management
├── admin-riders.html          # Rider management
├── admin-payments.html        # Payment verification
├── rider-demo.html            # Rider API demo
├── css/
│   ├── styles.css             # Global styles
│   ├── auth.css               # Authentication styles
│   ├── product-detail.css     # Product detail styles
│   ├── cart.css               # Cart styles
│   ├── checkout.css           # Checkout styles
│   ├── order-tracking.css     # Order tracking styles
│   ├── profile.css            # Profile styles
│   └── admin.css              # Admin panel styles
├── js/
│   ├── firebase-config.js     # Firebase configuration
│   ├── components.js          # Shared components
│   ├── home.js                # Home page logic
│   ├── login.js               # Login logic
│   ├── register.js            # Registration logic
│   ├── forgot-password.js     # Password recovery logic
│   ├── shop.js                # Shop page logic
│   ├── product-detail.js      # Product detail logic
│   ├── cart.js                # Cart logic
│   ├── checkout.js            # Checkout logic
│   ├── payment.js             # Payment logic
│   ├── confirmation.js        # Confirmation logic
│   ├── order-tracking.js      # Order tracking logic
│   ├── profile.js             # Profile logic
│   ├── contact.js             # Contact form logic
│   ├── admin-login.js         # Admin login logic
│   ├── admin-dashboard.js     # Admin dashboard logic
│   ├── admin-products.js      # Product management logic
│   ├── admin-orders.js        # Order management logic
│   ├── admin-users.js         # User management logic
│   ├── admin-riders.js        # Rider management logic
│   ├── admin-payments.js      # Payment verification logic
│   └── delivery-rider-api.js  # Delivery Rider API
├── API-DOCUMENTATION.md       # API documentation
└── README.md                  # This file
\`\`\`

## Setup Instructions

### 1. Firebase Configuration

1. Create a Firebase project at [https://console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication (Email/Password)
3. Create a Firestore database
4. Enable Firebase Storage
5. Copy your Firebase configuration
6. Update `js/firebase-config.js` with your credentials:

\`\`\`javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
\`\`\`

### 2. Firestore Security Rules

Set up the following security rules in Firestore:

\`\`\`javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    
    // Products collection
    match /products/{productId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Orders collection
    match /orders/{orderId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
    }
    
    // Riders collection
    match /riders/{riderId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Contact messages
    match /contacts/{contactId} {
      allow read: if request.auth != null;
      allow create: if true;
    }
  }
}
\`\`\`

### 3. Create Admin User

1. Register a regular user account
2. Go to Firebase Console → Authentication
3. Find the user and copy their UID
4. Go to Firestore → Create a document in `users` collection:
   - Document ID: [User UID]
   - Fields:
     \`\`\`
     email: "admin@florist.com"
     role: "admin"
     name: "Admin"
     createdAt: [Current Timestamp]
     \`\`\`

### 4. Add Sample Products

Run the admin panel and use the "Add Product" feature, or manually add to Firestore:

\`\`\`javascript
{
  name: "Chocolate Cake",
  category: "cake",
  price: 850,
  description: "Delicious chocolate cake",
  images: ["image_url_1", "image_url_2"],
  stock: 10,
  createdAt: Timestamp
}
\`\`\`

### 5. Deploy

You can deploy this project to any static hosting service:

- **Vercel**: `vercel deploy`
- **Netlify**: Drag and drop the folder
- **Firebase Hosting**: `firebase deploy`
- **GitHub Pages**: Push to repository and enable Pages

## Usage

### For Customers

1. Visit the website and browse products
2. Register or login to your account
3. Add products to cart
4. Proceed to checkout
5. Enter delivery information
6. Upload GCash payment receipt
7. Track your order status
8. View order history in profile

### For Admins

1. Go to `/admin-login.html`
2. Login with admin credentials
3. Manage products, orders, users, and riders
4. Verify payments and generate receipts
5. Assign delivery riders to orders

### For Delivery Riders

Use the Delivery Rider API to build a mobile app or web interface:

\`\`\`javascript
import DeliveryRiderAPI from './js/delivery-rider-api.js';

const riderAPI = new DeliveryRiderAPI();
riderAPI.setRiderId('rider_001');

// Fetch orders
const orders = await riderAPI.fetchAssignedOrders();

// Accept order
await riderAPI.acceptOrder('order123');

// Update status
await riderAPI.updateDeliveryStatus('order123', 'in_transit');

// Update location
await riderAPI.updateRiderLocation(14.5995, 120.9842);
\`\`\`

See `API-DOCUMENTATION.md` for complete API reference.

## Default Credentials

**Admin Account:**
- Email: admin@florist.com
- Password: adminflorist123

**Test User:**
- Create your own account via registration

## Features in Detail

### Payment System
- GCash QR code displayed during checkout
- Users upload payment receipt
- Admin verifies payment before processing order
- Automatic receipt generation with jsPDF

### Order Tracking
- Real-time status updates
- Visual timeline showing order progress
- Statuses: Pending → Confirmed → Assigned → Picked Up → In Transit → Delivered

### Delivery Rider System
- Riders can be assigned to orders
- Track rider online/offline status
- Update delivery status in real-time
- GPS location tracking

### Security Features
- Firebase Authentication
- Role-based access control (User/Admin)
- Secure Firestore rules
- Input validation and sanitization

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## License

This project is for educational purposes.

## Support

For issues or questions, use the contact form on the website or refer to the documentation.
\`\`\`



<AssistantMessageContentPart partEncoded="eyJ0eXBlIjoidGFzay13YWl0aW5nLXYxIiwiY3JlYXRlZEF0IjoxNzYwNTk0NDE4OTc5LCJmaW5pc2hlZEF0IjoxNzYwNTk0NDE4OTc5LCJpZCI6ImVrTWpBZDNyckdQcjU1dVkiLCJsYXN0UGFydFNlbnRBdCI6MTc2MDU5NDQxODk3OSwicGFydHMiOlt7InR5cGUiOiJ0b29sLWNhbGxzIn1dfQ==" />



<AssistantMessageContentPart partEncoded="eyJ0eXBlIjoidGFzay1tYW5hZ2UtdG9kb3MtdjEiLCJpZCI6IktLbzM1aHcza3pMS0NMQ3MiLCJ0YXNrTmFtZUFjdGl2ZSI6IkNvbXBsZXRpbmcgYWxsIHRhc2tzIiwidG9vbENhbGxJZCI6InRvb2x1XzAxSmpmYUhUNlVKaWV4WnM5THNVclkzOSIsInRhc2tOYW1lQ29tcGxldGUiOiJDb21wbGV0ZWQgYWxsIHRhc2tzIiwiY3JlYXRlZEF0IjoxNzYwNTk0NDE5MDU0LCJmaW5pc2hlZEF0IjpudWxsLCJwYXJ0cyI6W10sImxhc3RQYXJ0U2VudEF0IjpudWxsfQ==" />
