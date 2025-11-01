rules_version = '2';

// ============================================================================
// FLORIST & CAKE SHOP - FIRESTORE SECURITY RULES
// ============================================================================
// File: firestore.rules
// Version: 2.0
// Last Updated: 2025
// 
// This file defines security rules for the Florist & Cake Shop application.
// It balances security with functionality for customers, riders, and admins.
// ============================================================================

service cloud.firestore {
  match /databases/{database}/documents {
    
    // ========================================================================
    // HELPER FUNCTIONS
    // ========================================================================
    
    // Check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Check if user owns the resource
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Check if user is admin (using custom claims)
    function isAdmin() {
      return isAuthenticated() && request.auth.token.admin == true;
    }
    
    // Check if user is a rider (using custom claims or rider ID match)
    function isRider() {
      return isAuthenticated() && (
        request.auth.token.rider == true ||
        exists(/databases/$(database)/documents/riders/$(request.auth.uid))
      );
    }
    
    // Check if user is the assigned rider for an order
    function isAssignedRider(orderId) {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/orders/$(orderId)).data.riderId == request.auth.uid;
    }
    
    // Validate incoming data has required fields
    function hasRequiredFields(fields) {
      return request.resource.data.keys().hasAll(fields);
    }
    
    // Check if data hasn't changed specific fields (for preventing tampering)
    function unchangedFields(fields) {
      return request.resource.data.diff(resource.data).unchangedKeys().hasAll(fields);
    }
    
    // ========================================================================
    // USERS COLLECTION
    // ========================================================================
    
    match /users/{userId} {
      // Anyone can read user profiles (for public profiles, order tracking)
      allow read: if true;
      
      // Users can create their own account
      allow create: if isAuthenticated() && request.auth.uid == userId;
      
      // Users can update their own data, admins can update any user
      allow update: if isOwner(userId) || isAdmin();
      
      // Only admins can delete users
      allow delete: if isAdmin();
    }
    
    // ========================================================================
    // PRODUCTS COLLECTION
    // ========================================================================
    
    match /products/{productId} {
      // Anyone can read products (public catalog)
      allow read: if true;
      
      // Only admins can create, update, or delete products
      allow create, update, delete: if isAdmin() || true; // true for development
      
      // Validate product data on creation
      allow create: if hasRequiredFields(['name', 'price', 'category', 'stock']);
      
      // Prevent price tampering (price can only be updated by admin)
      allow update: if unchangedFields(['price']) || isAdmin();
    }
    
    // ========================================================================
    // ORDERS COLLECTION - ENHANCED SECURITY
    // ========================================================================
    
    match /orders/{orderId} {
      // Read permissions:
      // - Order owner can read their orders
      // - Assigned rider can read their assigned orders
      // - Admins can read all orders
      // - Public tracking (for delivery tracking pages)
      allow read: if true; // For tracking links
      
      // Create permissions:
      // - Authenticated users can create orders
      // - Unauthenticated users can create orders (guest checkout)
      allow create: if true;
      
      // Update permissions:
      // - Order owner can update their order (before processing)
      // - Assigned rider can update order status and delivery info
      // - Admins can update any order
      allow update: if 
        isAdmin() || // Admin can do anything
        true || // Development - allow all updates
        (isOwner(resource.data.userId) && resource.data.status == 'pending') || // Owner can update pending orders
        (isAssignedRider(orderId) && // Rider can update delivery status
          request.resource.data.status in ['picked_up', 'in_transit', 'delivered']
        );
      
      // Delete permissions:
      // - Only admins can delete orders
      allow delete: if isAdmin() || true; // true for development
      
      // Validate order data
      allow create: if hasRequiredFields(['userId', 'items', 'total', 'status']);
      
      // Prevent tampering with total amount after creation
      allow update: if unchangedFields(['total', 'items']) || isAdmin();
    }
    
    // ========================================================================
    // RIDERS COLLECTION - ENHANCED SECURITY
    // ========================================================================
    
    match /riders/{riderId} {
      // Read permissions:
      // - Anyone can read rider info (for assignment, tracking)
      allow read: if true;
      
      // Create permissions:
      // - Only admins can create rider accounts
      allow create: if isAdmin() || true; // true for development
      
      // Update permissions:
      // - Rider can update their own info (location, status)
      // - Admins can update any rider
      allow update: if 
        isAdmin() ||
        true || // Development - allow all updates
        (isAuthenticated() && request.auth.uid == riderId);
      
      // Delete permissions:
      // - Only admins can delete riders
      allow delete: if isAdmin() || true; // true for development
      
      // Validate rider data
      allow create: if hasRequiredFields(['name', 'phone', 'vehicle']);
      
      // Riders can only update their location and status, not profile info
      allow update: if 
        isAdmin() || 
        (isOwner(riderId) && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['location', 'isOnline', 'status', 'lastActive']));
    }
    
    // ========================================================================
    // FEEDBACK COLLECTION - NEW
    // ========================================================================
    
    match /feedback/{feedbackId} {
      // Read permissions:
      // - Admins can read all feedback
      // - Users can read their own feedback
      allow read: if isAdmin() || isOwner(resource.data.userId);
      
      // Create permissions:
      // - Authenticated users can create feedback
      // - Unauthenticated users can create feedback (guest orders)
      allow create: if true;
      
      // Update permissions:
      // - Only admins can update feedback (for moderation)
      allow update: if isAdmin();
      
      // Delete permissions:
      // - Only admins can delete feedback
      allow delete: if isAdmin();
      
      // Validate feedback data
      allow create: if 
        hasRequiredFields(['orderId', 'rating']) &&
        request.resource.data.rating is int &&
        request.resource.data.rating >= 1 &&
        request.resource.data.rating <= 5;
    }
    
    // ========================================================================
    // CONTACT MESSAGES
    // ========================================================================
    
    match /contacts/{contactId} {
      // Anyone can read contact messages (for admin view)
      allow read: if isAdmin() || true; // true for development
      
      // Anyone can create a contact message
      allow create: if true;
      
      // Only admins can update/delete contact messages
      allow update, delete: if isAdmin() || true; // true for development
      
      // Validate contact message
      allow create: if hasRequiredFields(['name', 'email', 'message']);
    }
    
    // ========================================================================
    // CATEGORIES COLLECTION
    // ========================================================================
    
    match /categories/{categoryId} {
      // Anyone can read categories (public catalog)
      allow read: if true;
      
      // Only admins can modify categories
      allow create, update, delete: if isAdmin() || true; // true for development
      
      // Validate category data
      allow create: if hasRequiredFields(['name']);
    }
    
    // ========================================================================
    // REVIEWS/RATINGS COLLECTION
    // ========================================================================
    
    match /reviews/{reviewId} {
      // Anyone can read reviews (public product reviews)
      allow read: if true;
      
      // Authenticated users can create reviews
      allow create: if isAuthenticated() || true; // true for development
      
      // Users can update their own reviews, admins can update any
      allow update: if isOwner(resource.data.userId) || isAdmin();
      
      // Users can delete their own reviews, admins can delete any
      allow delete: if isOwner(resource.data.userId) || isAdmin();
      
      // Validate review data
      allow create: if 
        hasRequiredFields(['productId', 'userId', 'rating', 'comment']) &&
        request.resource.data.rating is int &&
        request.resource.data.rating >= 1 &&
        request.resource.data.rating <= 5;
    }
    
    // ========================================================================
    // NOTIFICATIONS COLLECTION - NEW
    // ========================================================================
    
    match /notifications/{notificationId} {
      // Users can read their own notifications, admins can read all
      allow read: if isOwner(resource.data.userId) || isAdmin();
      
      // System can create notifications
      allow create: if true;
      
      // Users can update their own notifications (mark as read)
      allow update: if isOwner(resource.data.userId) || isAdmin();
      
      // Users can delete their own notifications, admins can delete any
      allow delete: if isOwner(resource.data.userId) || isAdmin();
    }
    
    // ========================================================================
    // ADMIN SETTINGS COLLECTION
    // ========================================================================
    
    match /settings/{settingId} {
      // Admins can read settings
      allow read: if isAdmin() || true; // true for development
      
      // Only admins can modify settings
      allow create, update, delete: if isAdmin() || true; // true for development
    }
    
    // ========================================================================
    // ANALYTICS COLLECTION - NEW
    // ========================================================================
    
    match /analytics/{analyticsId} {
      // Only admins can access analytics
      allow read, write: if isAdmin() || true; // true for development
    }
    
    // ========================================================================
    // CART COLLECTION (Optional - for persistent carts)
    // ========================================================================
    
    match /carts/{userId} {
      // Users can read and write their own cart
      allow read, write: if isOwner(userId);
      
      // Auto-delete after certain period (handled by client)
      allow delete: if isOwner(userId);
    }
    
    // ========================================================================
    // ADMIN LOGS COLLECTION - NEW
    // ========================================================================
    
    match /logs/{logId} {
      // Only admins can read logs
      allow read: if isAdmin() || true; // true for development
      
      // System can create logs
      allow create: if true;
      
      // Only admins can delete logs (for cleanup)
      allow delete: if isAdmin() || true; // true for development
    }
    
    // ========================================================================
    // CATCH-ALL (Deny by default for unknown collections)
    // ========================================================================
    
    match /{document=**} {
      // Development mode - allow all (REMOVE IN PRODUCTION!)
      allow read, write: if true;
      
      // Production mode - deny by default (UNCOMMENT IN PRODUCTION!)
      // allow read, write: if false;
    }
  }
}

// ============================================================================
// DEPLOYMENT INSTRUCTIONS
// ============================================================================
//
// DEVELOPMENT MODE (Current):
// - All collections have "|| true" for easier testing
// - Use "firebase deploy --only firestore:rules"
//
// PRODUCTION MODE:
// 1. Remove all "|| true" conditions
// 2. Set up Firebase Authentication properly
// 3. Add admin custom claims using Firebase Admin SDK:
//    
//    const admin = require('firebase-admin');
//    admin.auth().setCustomUserClaims(uid, { admin: true });
//
// 4. Add rider custom claims similarly:
//    
//    admin.auth().setCustomUserClaims(uid, { rider: true });
//
// 5. Test rules using Firebase Console's Rules Playground
// 6. Deploy with: firebase deploy --only firestore:rules
//
// ============================================================================
// SECURITY CHECKLIST FOR PRODUCTION
// ============================================================================
//
// ✓ Remove all "|| true" fallbacks
// ✓ Enable Firebase Authentication
// ✓ Set up custom claims for admins and riders
// ✓ Implement rate limiting for sensitive operations
// ✓ Add data validation rules
// ✓ Test all rules in Firebase Console
// ✓ Enable audit logging
// ✓ Set up monitoring and alerts
// ✓ Review rules regularly
// ✓ Document any custom logic
//
// ============================================================================
// CUSTOM CLAIMS SETUP (Admin SDK)
// ============================================================================
//
// // Set admin claim
// admin.auth().setCustomUserClaims(adminUserId, { 
//   admin: true 
// });
//
// // Set rider claim
// admin.auth().setCustomUserClaims(riderUserId, { 
//   rider: true,
//   riderId: 'rider_123'
// });
//
// // Remove claims
// admin.auth().setCustomUserClaims(userId, null);
//
// ============================================================================