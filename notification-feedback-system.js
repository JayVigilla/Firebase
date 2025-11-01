// notification-feedback-system.js - COMPLETE ENHANCED VERSION
// ============================================================================
// REAL-TIME NOTIFICATION & FEEDBACK SYSTEM
// ============================================================================

import { 
  db, 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query,
  where,
  getDocs,
  onSnapshot,
  Timestamp 
} from "./firebase-config.js"

// Global state
let userNotificationsListener = null
let adminNotificationsListener = null
let selectedRating = 0
let selectedOrderId = ''
let currentFeedbackModal = null

// ============================================================================
// 1. USER DELIVERY NOTIFICATIONS (For order-tracking.js)
// ============================================================================

export function setupUserDeliveryNotifications(userId) {
  if (!userId) {
    console.warn('⚠️ Cannot setup notifications - no user ID')
    return
  }
  
  // Clean up existing listener
  if (userNotificationsListener) {
    try {
      userNotificationsListener()
    } catch (e) {
      console.warn('Error cleaning up listener:', e)
    }
  }

  try {
    const ordersRef = collection(db, "orders")
    const q = query(ordersRef, where("userId", "==", userId))

    let firstLoad = true

    userNotificationsListener = onSnapshot(q, 
      (snapshot) => {
        if (firstLoad) {
          firstLoad = false
          return
        }

        snapshot.docChanges().forEach((change) => {
          if (change.type === "modified") {
            const order = { id: change.doc.id, ...change.doc.data() }
            
            // Check if order just became delivered
            if (order.status === "delivered" && !order.userNotified) {
              showUserDeliveryNotification(order)
              
              // Mark as notified
              updateDoc(doc(db, "orders", order.id), {
                userNotified: true,
                userNotifiedAt: Timestamp.now()
              }).catch(err => console.error("Failed to mark as notified:", err))
            }
          }
        })
      },
      (error) => {
        console.error("❌ User notifications listener error:", error)
      }
    )
    
    console.log("✅ User delivery notifications active")
  } catch (error) {
    console.error('❌ Failed to setup user notifications:', error)
  }
}

function showUserDeliveryNotification(order) {
  playNotificationSound()
  
  // Close any existing modal
  if (currentFeedbackModal) {
    try {
      currentFeedbackModal.remove()
      document.querySelector('.notification-backdrop')?.remove()
    } catch (e) {}
  }
  
  const notification = document.createElement('div')
  notification.className = 'user-delivery-notification'
  notification.id = `feedback-modal-${order.id}`
  currentFeedbackModal = notification
  
  notification.innerHTML = `
    <div style="text-align: center; max-height: 90vh; overflow-y: auto;">
      <div style="font-size: 64px; margin-bottom: 16px; animation: bounceIn 0.8s;">🎉</div>
      <h2 style="font-size: 28px; font-weight: 800; margin-bottom: 12px; 
                 background: linear-gradient(135deg, #4CAF50, #45a049); 
                 -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
        Order Delivered!
      </h2>
      <p style="font-size: 16px; margin-bottom: 8px; color: #333;">
        Your order <strong style="color: #667eea;">#${order.id.substring(0, 8)}</strong> has been delivered successfully!
      </p>
      <p style="font-size: 14px; color: #666; margin-bottom: 24px;">
        Delivered by: <strong style="color: #4CAF50;">${order.riderName || 'Your rider'}</strong>
      </p>
      
      <div style="background: linear-gradient(135deg, #f8f9fa, #e9ecef); padding: 20px; 
                  border-radius: 16px; margin-bottom: 24px; border: 2px solid #dee2e6;">
        <p style="font-size: 15px; color: #333; margin-bottom: 16px; font-weight: 600;">
          ⭐ How was your experience?
        </p>
        <div style="display: flex; gap: 8px; justify-content: center; margin-bottom: 16px; flex-wrap: wrap;">
          ${[5, 4, 3, 2, 1].map(rating => `
            <button onclick="window.setFeedbackRating(${rating}, '${order.id}')" 
                    class="rating-btn"
                    data-rating="${rating}"
                    data-order-id="${order.id}"
                    style="background: linear-gradient(135deg, #f8f9fa, #fff); 
                           border: 2px solid #dee2e6; font-size: 36px; cursor: pointer; 
                           transition: all 0.3s; padding: 12px; border-radius: 12px;
                           width: 60px; height: 60px; display: flex; align-items: center;
                           justify-content: center; filter: grayscale(1) opacity(0.4);">
              ⭐
            </button>
          `).join('')}
        </div>
        <div style="text-align: center; margin-bottom: 16px;">
          <span id="rating-text-${order.id}" style="font-size: 14px; color: #666; font-weight: 600;">
            Tap a star to rate
          </span>
        </div>
        <textarea id="feedback-text-${order.id}" 
                  placeholder="Share your thoughts about the products, delivery service, and overall experience... (optional)"
                  style="width: 100%; padding: 16px; border: 2px solid #e0e0e0; border-radius: 12px; 
                         font-family: inherit; font-size: 14px; resize: vertical; min-height: 100px;
                         margin-bottom: 16px; box-sizing: border-box; transition: border-color 0.3s;">
        </textarea>
        <button onclick="window.submitOrderFeedback('${order.id}')" 
                id="submit-feedback-${order.id}"
                class="btn-submit-feedback"
                style="width: 100%; padding: 16px 24px; 
                       background: linear-gradient(135deg, #667eea, #764ba2); 
                       color: white; border: none; border-radius: 12px; font-weight: 700; 
                       cursor: pointer; font-size: 16px; transition: all 0.3s;
                       box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
          <span style="font-size: 18px; margin-right: 8px;">✓</span>
          Submit Feedback
        </button>
      </div>
      
      <button onclick="window.closeFeedbackModal('${order.id}')" 
              style="padding: 12px 28px; background: #e0e0e0; color: #333; border: none; 
                     border-radius: 12px; cursor: pointer; font-weight: 600; font-size: 14px;
                     transition: all 0.3s;">
        Maybe Later
      </button>
      
      <p style="font-size: 12px; color: #999; margin-top: 16px;">
        You can always leave feedback from your order history
      </p>
    </div>
  `
  
  notification.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 40px;
    background: white;
    border-radius: 24px;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.3);
    z-index: 10002;
    max-width: 550px;
    width: 90%;
    animation: scaleIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  `
  
  const backdrop = document.createElement('div')
  backdrop.className = 'notification-backdrop'
  backdrop.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(6px);
    z-index: 10001;
    animation: fadeIn 0.3s;
  `
  backdrop.onclick = () => window.closeFeedbackModal(order.id)
  
  document.body.appendChild(backdrop)
  document.body.appendChild(notification)
  
  // Add focus to textarea for better UX
  setTimeout(() => {
    const ratingButtons = notification.querySelectorAll('.rating-btn')
    if (ratingButtons.length > 0) {
      ratingButtons[0].focus()
    }
  }, 500)
}

// ============================================================================
// 2. ADMIN DELIVERY NOTIFICATIONS (For admin-dashboard.js)
// ============================================================================

export function setupAdminDeliveryNotifications() {
  // Clean up existing listener
  if (adminNotificationsListener) {
    try {
      adminNotificationsListener()
    } catch (e) {
      console.warn('Error cleaning up admin listener:', e)
    }
  }

  try {
    let firstLoad = true

    adminNotificationsListener = onSnapshot(
      collection(db, "orders"),
      (snapshot) => {
        if (firstLoad) {
          firstLoad = false
          return
        }

        snapshot.docChanges().forEach((change) => {
          if (change.type === "modified") {
            const order = { id: change.doc.id, ...change.doc.data() }
            
            if (order.status === "delivered" && !order.adminNotified) {
              showAdminDeliveryNotification(order)
              
              // Mark as notified
              updateDoc(doc(db, "orders", order.id), {
                adminNotified: true,
                adminNotifiedAt: Timestamp.now()
              }).catch(err => console.error("Failed to mark admin as notified:", err))
            }
          }
        })
      },
      (error) => {
        console.error("❌ Admin notifications listener error:", error)
      }
    )
    
    console.log("✅ Admin delivery notifications active")
  } catch (error) {
    console.error('❌ Failed to setup admin notifications:', error)
  }
}

function showAdminDeliveryNotification(order) {
  playNotificationSound()
  
  const notification = document.createElement('div')
  notification.className = 'admin-delivery-notification'
  notification.innerHTML = `
    <div style="display: flex; align-items: start; gap: 20px;">
      <div style="font-size: 56px; animation: bounceIn 0.8s; line-height: 1;">📦</div>
      <div style="flex: 1;">
        <div style="font-size: 20px; font-weight: 800; margin-bottom: 10px; color: white;
                    text-shadow: 0 2px 8px rgba(0,0,0,0.2);">
          ✅ Order Delivered Successfully!
        </div>
        <div style="font-size: 15px; margin-bottom: 6px; color: rgba(255,255,255,0.95);">
          <strong>Order:</strong> #${order.id.substring(0, 8)}
        </div>
        <div style="font-size: 14px; color: rgba(255,255,255,0.9); margin-bottom: 5px;">
          <strong>Customer:</strong> ${order.fullName || 'Unknown'}
        </div>
        <div style="font-size: 14px; color: rgba(255,255,255,0.9); margin-bottom: 5px;">
          <strong>Rider:</strong> ${order.riderName || 'Unknown'}
        </div>
        <div style="font-size: 14px; color: rgba(255,255,255,0.9); margin-bottom: 5px;">
          <strong>Phone:</strong> ${order.phone || 'N/A'}
        </div>
        <div style="font-size: 15px; color: white; font-weight: 700; margin-top: 8px;">
          💰 Total: ₱${(order.total || 0).toFixed(2)}
        </div>
        <div style="margin-top: 16px; display: flex; gap: 10px; flex-wrap: wrap;">
          <button onclick="window.location.href='admin-orders.html'" 
                  style="padding: 10px 20px; background: rgba(255,255,255,0.25); 
                         border: 1px solid rgba(255,255,255,0.4); color: white; border-radius: 8px; 
                         cursor: pointer; font-weight: 700; font-size: 13px; transition: all 0.3s;
                         backdrop-filter: blur(10px);">
            📋 View All Orders
          </button>
          <button onclick="this.closest('.admin-delivery-notification').remove();" 
                  style="padding: 10px 20px; background: rgba(255,255,255,0.15); 
                         border: 1px solid rgba(255,255,255,0.3); color: white; border-radius: 8px; 
                         cursor: pointer; font-weight: 600; font-size: 13px; transition: all 0.3s;">
            ✓ Dismiss
          </button>
        </div>
      </div>
      <button onclick="this.closest('.admin-delivery-notification').remove();" 
              style="background: none; border: none; color: white; font-size: 28px; 
                     cursor: pointer; opacity: 0.8; padding: 0; line-height: 1; 
                     transition: opacity 0.3s; width: 32px; height: 32px;">
        ×
      </button>
    </div>
  `
  
  notification.style.cssText = `
    position: fixed;
    top: 24px;
    right: 24px;
    padding: 28px;
    background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
    color: white;
    border-radius: 20px;
    box-shadow: 0 16px 48px rgba(76, 175, 80, 0.5);
    z-index: 10003;
    animation: slideInRight 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    max-width: 450px;
    border: 2px solid rgba(255,255,255,0.3);
  `
  
  document.body.appendChild(notification)
  
  // Auto-remove after 20 seconds
  setTimeout(() => {
    if (document.body.contains(notification)) {
      notification.style.animation = 'slideOutRight 0.4s ease-out'
      setTimeout(() => {
        if (document.body.contains(notification)) {
          notification.remove()
        }
      }, 400)
    }
  }, 20000)
}

// ============================================================================
// 3. FEEDBACK FUNCTIONS
// ============================================================================

window.setFeedbackRating = function(rating, orderId) {
  selectedRating = rating
  selectedOrderId = orderId
  
  console.log(`Rating selected: ${rating} for order ${orderId}`)
  
  const buttons = document.querySelectorAll(`.rating-btn[data-order-id="${orderId}"]`)
  const ratingText = document.getElementById(`rating-text-${orderId}`)
  
  const ratingLabels = {
    5: "Excellent! ⭐⭐⭐⭐⭐",
    4: "Great! ⭐⭐⭐⭐",
    3: "Good ⭐⭐⭐",
    2: "Fair ⭐⭐",
    1: "Poor ⭐"
  }
  
  if (ratingText) {
    ratingText.textContent = ratingLabels[rating] || "Rate your experience"
    ratingText.style.color = rating >= 4 ? "#4CAF50" : rating === 3 ? "#FFA500" : "#f44336"
    ratingText.style.fontSize = "16px"
  }
  
  buttons.forEach((btn, index) => {
    const btnRating = 5 - index
    if (btnRating <= rating) {
      btn.style.transform = 'scale(1.15)'
      btn.style.filter = 'none'
      btn.style.borderColor = '#FFD700'
      btn.style.background = 'linear-gradient(135deg, #FFF8DC, #FFFACD)'
      btn.style.boxShadow = '0 4px 12px rgba(255, 215, 0, 0.4)'
    } else {
      btn.style.transform = 'scale(1)'
      btn.style.filter = 'grayscale(1) opacity(0.4)'
      btn.style.borderColor = '#dee2e6'
      btn.style.background = 'linear-gradient(135deg, #f8f9fa, #fff)'
      btn.style.boxShadow = 'none'
    }
  })
  
  // Enable submit button
  const submitBtn = document.getElementById(`submit-feedback-${orderId}`)
  if (submitBtn) {
    submitBtn.disabled = false
    submitBtn.style.opacity = '1'
  }
}

window.submitOrderFeedback = async function(orderId) {
  const feedbackText = document.getElementById(`feedback-text-${orderId}`)?.value || ''
  const submitBtn = document.getElementById(`submit-feedback-${orderId}`)
  
  if (selectedRating === 0) {
    alert('⭐ Please select a rating first!')
    return
  }
  
  if (submitBtn) {
    submitBtn.disabled = true
    submitBtn.innerHTML = '<span style="font-size: 18px;">⏳</span> Submitting...'
    submitBtn.style.opacity = '0.7'
  }
  
  try {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"))
    
    // Save feedback to Firestore
    const feedbackData = {
      orderId: orderId,
      rating: selectedRating,
      comment: feedbackText,
      createdAt: Timestamp.now(),
      userId: currentUser?.uid || currentUser?.id || null,
      userEmail: currentUser?.email || null
    }
    
    await addDoc(collection(db, "feedback"), feedbackData)
    console.log('✓ Feedback saved to Firestore')
    
    // Update order with feedback
    await updateDoc(doc(db, "orders", orderId), {
      hasFeedback: true,
      rating: selectedRating,
      feedbackComment: feedbackText,
      feedbackAt: Timestamp.now()
    })
    console.log('✓ Order updated with feedback')
    
    // Update localStorage for immediate UI update
    try {
      const localOrders = JSON.parse(localStorage.getItem("orders") || "[]")
      const updatedOrders = localOrders.map(order => 
        order.id === orderId 
          ? { ...order, hasFeedback: true, rating: selectedRating, feedbackComment: feedbackText }
          : order
      )
      localStorage.setItem("orders", JSON.stringify(updatedOrders))
      console.log('✓ localStorage updated')
    } catch (e) {
      console.warn('Could not update localStorage:', e)
    }
    
    // Show success message
    const notification = document.querySelector('.user-delivery-notification')
    if (notification) {
      notification.innerHTML = `
        <div style="text-align: center; padding: 20px;">
          <div style="font-size: 80px; margin-bottom: 20px; animation: bounceIn 0.8s;">✅</div>
          <h2 style="font-size: 28px; font-weight: 800; margin-bottom: 12px; 
                     background: linear-gradient(135deg, #4CAF50, #45a049); 
                     -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
            Thank You!
          </h2>
          <p style="font-size: 16px; margin-bottom: 24px; color: #666; line-height: 1.6;">
            Your feedback helps us improve our service and deliver better experiences.
          </p>
          <div style="background: linear-gradient(135deg, #e8f5e9, #c3e6cb); 
                      padding: 16px; border-radius: 12px; margin-bottom: 20px;">
            <p style="margin: 0; color: #2e7d32; font-weight: 600;">
              ⭐ Your rating: ${'★'.repeat(selectedRating)}${'☆'.repeat(5 - selectedRating)}
            </p>
          </div>
          <button onclick="window.closeFeedbackModal('${orderId}')" 
                  style="padding: 14px 36px; background: linear-gradient(135deg, #667eea, #764ba2); 
                         color: white; border: none; border-radius: 12px; cursor: pointer; 
                         font-weight: 700; font-size: 16px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                         transition: all 0.3s;">
            Close
          </button>
        </div>
      `
    }
    
    // Auto-close and reload after 3 seconds
    setTimeout(() => {
      window.closeFeedbackModal(orderId)
      // Reload orders if on order tracking page
      if (typeof window.location.href.includes('order-tracking') && window.location.reload) {
        window.location.reload()
      }
    }, 3000)
    
    selectedRating = 0
    selectedOrderId = ''
    
  } catch (error) {
    console.error('❌ Error submitting feedback:', error)
    alert('Failed to submit feedback. Please try again.\n\nError: ' + error.message)
    if (submitBtn) {
      submitBtn.disabled = false
      submitBtn.innerHTML = '<span style="font-size: 18px;">✓</span> Submit Feedback'
      submitBtn.style.opacity = '1'
    }
  }
}

window.closeFeedbackModal = function(orderId) {
  const notification = document.getElementById(`feedback-modal-${orderId}`) || 
                       document.querySelector('.user-delivery-notification')
  const backdrop = document.querySelector('.notification-backdrop')
  
  if (notification) {
    notification.style.animation = 'scaleOut 0.3s ease-out'
    setTimeout(() => notification.remove(), 300)
  }
  
  if (backdrop) {
    backdrop.style.animation = 'fadeOut 0.3s'
    setTimeout(() => backdrop.remove(), 300)
  }
  
  selectedRating = 0
  selectedOrderId = ''
  currentFeedbackModal = null
}

// ============================================================================
// 4. NOTIFICATION SOUND
// ============================================================================

function playNotificationSound() {
  try {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBi1+zPDTfS8GJHzM8OeLNgkXbL3q7Kj/')
    audio.volume = 0.5
    audio.play().catch(() => {})
  } catch (e) {
    console.warn('Could not play notification sound:', e)
  }
}

// ============================================================================
// 5. LOAD FEEDBACK FOR DISPLAY (For admin views)
// ============================================================================

export async function loadOrderFeedback(orderId) {
  try {
    const feedbackQuery = query(
      collection(db, "feedback"),
      where("orderId", "==", orderId)
    )
    
    const feedbackSnapshot = await getDocs(feedbackQuery)
    
    if (feedbackSnapshot.empty) {
      return null
    }
    
    const feedbackList = []
    feedbackSnapshot.forEach(doc => {
      feedbackList.push({ id: doc.id, ...doc.data() })
    })
    
    return feedbackList[0] // Return most recent feedback
  } catch (error) {
    console.error('Error loading feedback:', error)
    return null
  }
}

// ============================================================================
// 6. CLEANUP FUNCTIONS
// ============================================================================

export function cleanupNotificationListeners() {
  if (userNotificationsListener) {
    try {
      userNotificationsListener()
      console.log('✓ User notifications listener cleaned up')
    } catch (e) {
      console.warn('Error cleaning up user listener:', e)
    }
  }
  
  if (adminNotificationsListener) {
    try {
      adminNotificationsListener()
      console.log('✓ Admin notifications listener cleaned up')
    } catch (e) {
      console.warn('Error cleaning up admin listener:', e)
    }
  }
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanupNotificationListeners)
}

// ============================================================================
// 7. CSS ANIMATIONS
// ============================================================================

const notificationStyles = document.createElement('style')
notificationStyles.textContent = `
  @keyframes slideInRight {
    0% {
      transform: translateX(500px);
      opacity: 0;
    }
    60% {
      transform: translateX(-20px);
      opacity: 1;
    }
    80% {
      transform: translateX(10px);
    }
    100% {
      transform: translateX(0);
    }
  }

  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(500px);
      opacity: 0;
    }
  }

  @keyframes bounceIn {
    0% {
      transform: scale(0);
      opacity: 0;
    }
    50% {
      transform: scale(1.2);
    }
    70% {
      transform: scale(0.9);
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }

  @keyframes scaleIn {
    0% {
      transform: translate(-50%, -50%) scale(0.7);
      opacity: 0;
    }
    50% {
      transform: translate(-50%, -50%) scale(1.05);
    }
    100% {
      transform: translate(-50%, -50%) scale(1);
      opacity: 1;
    }
  }

  @keyframes scaleOut {
    from {
      transform: translate(-50%, -50%) scale(1);
      opacity: 1;
    }
    to {
      transform: translate(-50%, -50%) scale(0.8);
      opacity: 0;
    }
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }

  .rating-btn:hover {
    transform: scale(1.2) !important;
    border-color: #FFD700 !important;
  }

  .rating-btn:active {
    transform: scale(1.1) !important;
  }

  .btn-submit-feedback:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(102, 126, 234, 0.5) !important;
  }

  .btn-submit-feedback:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
  }

  .admin-delivery-notification button:hover {
    background: rgba(255,255,255,0.35) !important;
    transform: translateY(-2px);
  }

  #feedback-text-${selectedOrderId}:focus {
    outline: none;
    border-color: #667eea !important;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
`
document.head.appendChild(notificationStyles)

console.log('✅ Notification & Feedback System loaded')

// Export all functions
export {
  setupUserDeliveryNotifications,
  setupAdminDeliveryNotifications,
  loadOrderFeedback,
  cleanupNotificationListeners
}