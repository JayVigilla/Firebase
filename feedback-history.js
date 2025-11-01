// feedback-history.js - Display user's feedback history
import { db, collection, query, where, getDocs } from "./firebase-config.js"

let currentUser = null

// ============================================================================
// AUTHENTICATION
// ============================================================================
async function initAuth() {
  try {
    currentUser = JSON.parse(localStorage.getItem("currentUser"))
    
    if (!currentUser) {
      alert("Please login to view your feedback")
      window.location.href = "login.html"
      return false
    }
    
    console.log('✅ User authenticated:', currentUser.email)
    return true
  } catch (error) {
    console.error("❌ Auth error:", error)
    alert("Please login to view your feedback")
    window.location.href = "login.html"
    return false
  }
}

// ============================================================================
// LOAD FEEDBACK HISTORY
// ============================================================================
async function loadFeedbackHistory() {
  const feedbackList = document.getElementById("feedback-list")
  
  try {
    console.log('🔄 Loading feedback for user:', currentUser.uid || currentUser.email)
    
    // Query feedback collection - removed orderBy to avoid composite index requirement
    const feedbackQuery = query(
      collection(db, "feedback"),
      where("userId", "==", currentUser.uid || currentUser.id)
    )
    
    const feedbackSnapshot = await getDocs(feedbackQuery)
    
    if (feedbackSnapshot.empty) {
      showEmptyState()
      return
    }
    
    const feedbackData = []
    const orderIds = new Set()
    
    feedbackSnapshot.forEach(doc => {
      const feedback = { id: doc.id, ...doc.data() }
      feedbackData.push(feedback)
      if (feedback.orderId) {
        orderIds.add(feedback.orderId)
      }
    })
    
    // Sort in memory instead of in the query
    feedbackData.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0)
      const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0)
      return dateB - dateA // newest first
    })
    
    console.log(`✅ Found ${feedbackData.length} feedback entries`)
    
    // Load order details for each feedback
    const ordersMap = await loadOrderDetails(Array.from(orderIds))
    
    // Display feedback with order details
    displayFeedback(feedbackData, ordersMap)
    updateStats(feedbackData)
    
  } catch (error) {
    console.error("❌ Error loading feedback:", error)
    feedbackList.innerHTML = `
      <div class="empty-feedback">
        <div class="icon">⚠️</div>
        <h2>Error Loading Feedback</h2>
        <p>${escapeHtml(error.message)}</p>
        <button class="btn-primary" onclick="location.reload()">Retry</button>
      </div>
    `
  }
}

// ============================================================================
// LOAD ORDER DETAILS IN BATCHES
// ============================================================================
async function loadOrderDetails(orderIds) {
  const ordersMap = new Map()
  
  if (!orderIds || orderIds.length === 0) return ordersMap
  
  try {
    console.log(`🔄 Loading ${orderIds.length} order details...`)
    
    // Load orders in smaller batches
    const batchSize = 10
    for (let i = 0; i < orderIds.length; i += batchSize) {
      const batch = orderIds.slice(i, i + batchSize)
      
      for (const orderId of batch) {
        try {
          const orderQuery = query(
            collection(db, "orders"),
            where("__name__", "==", orderId)
          )
          
          const orderSnapshot = await getDocs(orderQuery)
          
          if (!orderSnapshot.empty) {
            const orderDoc = orderSnapshot.docs[0]
            ordersMap.set(orderId, { id: orderDoc.id, ...orderDoc.data() })
          } else {
            // Store placeholder for missing orders
            ordersMap.set(orderId, {
              id: orderId,
              items: [],
              total: 0,
              status: 'unknown'
            })
          }
        } catch (error) {
          console.error(`Error loading order ${orderId}:`, error)
          ordersMap.set(orderId, {
            id: orderId,
            items: [],
            total: 0,
            status: 'unknown'
          })
        }
      }
    }
    
    console.log(`✅ Loaded ${ordersMap.size} order details`)
  } catch (error) {
    console.error("❌ Error loading order details:", error)
  }
  
  return ordersMap
}

// ============================================================================
// DISPLAY FEEDBACK
// ============================================================================
function displayFeedback(feedbackData, ordersMap) {
  const feedbackList = document.getElementById("feedback-list")
  
  feedbackList.innerHTML = feedbackData.map(feedback => {
    const order = ordersMap.get(feedback.orderId) || {
      items: [],
      total: 0,
      status: 'unknown'
    }
    
    let createdAt
    try {
      createdAt = feedback.createdAt?.toDate?.() || new Date(feedback.createdAt || Date.now())
    } catch (error) {
      createdAt = new Date()
    }
    
    const stars = '⭐'.repeat(feedback.rating || 0) + '☆'.repeat(5 - (feedback.rating || 0))
    
    const items = order.items || []
    const itemsHTML = items.length > 0 ? `
      <div class="feedback-items">
        ${items.map(item => `
          <span class="feedback-item-tag">
            ${escapeHtml(item.name || item.productName || 'Item')} (×${item.quantity || 1})
          </span>
        `).join('')}
      </div>
    ` : '<div style="color: #999; font-size: 14px; margin: 12px 0;">No items available</div>'
    
    const commentHTML = feedback.comment ? `
      <div class="feedback-comment">
        <p>${escapeHtml(feedback.comment)}</p>
      </div>
    ` : ''
    
    return `
      <div class="feedback-card">
        <div class="feedback-card-header">
          <div class="feedback-order-info">
            <h3>Order #${(feedback.orderId || '').substring(0, 8)}</h3>
            <div class="feedback-date">
              ${createdAt.toLocaleDateString()} at ${createdAt.toLocaleTimeString()}
            </div>
          </div>
          <div class="feedback-rating" title="${feedback.rating || 0} stars">
            ${stars}
          </div>
        </div>
        
        ${itemsHTML}
        
        <div style="display: flex; gap: 16px; margin-top: 12px; font-size: 14px; color: #666;">
          <div>
            <strong>Total:</strong> ₱${(order.total || 0).toFixed(2)}
          </div>
          <div>
            <strong>Status:</strong> ${getStatusLabel(order.status)}
          </div>
        </div>
        
        ${commentHTML}
      </div>
    `
  }).join('')
}

// ============================================================================
// UPDATE STATISTICS
// ============================================================================
function updateStats(feedbackData) {
  const totalFeedback = feedbackData.length
  const avgRating = totalFeedback > 0 
    ? (feedbackData.reduce((sum, f) => sum + (f.rating || 0), 0) / totalFeedback).toFixed(1)
    : '0.0'
  const fiveStarCount = feedbackData.filter(f => f.rating === 5).length
  
  document.getElementById("total-feedback").textContent = totalFeedback
  document.getElementById("avg-rating").textContent = avgRating
  document.getElementById("five-star-count").textContent = fiveStarCount
}

// ============================================================================
// SHOW EMPTY STATE
// ============================================================================
function showEmptyState() {
  const feedbackList = document.getElementById("feedback-list")
  feedbackList.innerHTML = `
    <div class="empty-feedback">
      <div class="icon">⭐</div>
      <h2>No feedback yet</h2>
      <p>You haven't submitted any reviews. Complete an order and share your experience!</p>
      <a href="shop.html" class="btn-primary">Start Shopping</a>
    </div>
  `
  
  // Reset stats
  document.getElementById("total-feedback").textContent = "0"
  document.getElementById("avg-rating").textContent = "0.0"
  document.getElementById("five-star-count").textContent = "0"
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
function getStatusLabel(status) {
  const labels = {
    'pending': '⏳ Pending',
    'processing': '🔄 Processing',
    'ready': '✅ Ready',
    'assigned': '🛵 Assigned',
    'picked_up': '📦 Picked Up',
    'in_transit': '🚚 In Transit',
    'delivered': '✅ Delivered',
    'done': '✅ Completed',
    'cancelled': '❌ Cancelled',
    'unknown': '❓ Unknown'
  }
  return labels[status] || (status ? escapeHtml(status) : '❓ Unknown')
}

function escapeHtml(text) {
  if (!text) return ''
  const div = document.createElement('div')
  div.textContent = String(text)
  return div.innerHTML
}

// ============================================================================
// INITIALIZATION
// ============================================================================
async function init() {
  console.log("🚀 Initializing Feedback History...")
  const authenticated = await initAuth()
  if (authenticated) {
    await loadFeedbackHistory()
  }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}

console.log("✅ Feedback History module loaded")