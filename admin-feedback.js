// admin-feedback.js - Manage and display customer feedback
import { db, collection, query, getDocs, orderBy, onSnapshot, where } from "./firebase-config.js"

// Check admin authentication
const adminUser = JSON.parse(localStorage.getItem("adminUser"))
if (!adminUser) {
  window.location.href = "admin-login.html"
}

// ============================================================================
// PROFILE MANAGEMENT
// ============================================================================
function loadAdminProfile() {
  const adminUser = JSON.parse(localStorage.getItem("adminUser"))
  if (adminUser) {
    // Set admin name in all locations
    const nameElements = [
      document.getElementById("admin-name"),
      document.getElementById("header-admin-name")
    ]
    
    nameElements.forEach(element => {
      if (element) {
        element.textContent = adminUser.name || "Admin User"
      }
    })
    
    // Load profile picture from localStorage
    const savedProfilePic = localStorage.getItem("adminProfilePic")
    const profilePic = document.getElementById("admin-profile-pic")
    const profilePlaceholder = document.getElementById("admin-profile-placeholder")
    
    if (savedProfilePic && profilePic && profilePlaceholder) {
      profilePic.src = savedProfilePic
      profilePic.style.display = "block"
      profilePlaceholder.style.display = "none"
      console.log("✅ Profile picture loaded")
    }
  }
}

// Handle profile picture upload
function setupProfileUpload() {
  const avatarInput = document.getElementById("admin-avatar-input")
  if (!avatarInput) return
  
  avatarInput.addEventListener("change", (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      showNotification("Please select an image file", "error")
      e.target.value = ""
      return
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showNotification("Image size should be less than 2MB", "error")
      e.target.value = ""
      return
    }
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const base64Image = event.target.result
      localStorage.setItem("adminProfilePic", base64Image)
      
      const profilePic = document.getElementById("admin-profile-pic")
      const profilePlaceholder = document.getElementById("admin-profile-placeholder")
      
      if (profilePic && profilePlaceholder) {
        profilePic.src = base64Image
        profilePic.style.display = "block"
        profilePlaceholder.style.display = "none"
      }
      
      showNotification("Profile picture updated successfully!", "success")
      console.log("✅ Profile picture saved")
    }
    reader.readAsDataURL(file)
  })
}

// Listen for profile updates from other tabs
window.addEventListener('storage', (e) => {
  if (e.key === 'adminProfilePic') {
    loadAdminProfile()
    console.log("✅ Profile synced from another tab")
  }
})

// Logout function
window.adminLogout = () => {
  localStorage.removeItem("adminUser")
  window.location.href = "admin-login.html"
}

// ============================================================================
// NOTIFICATION SYSTEM
// ============================================================================
function showNotification(message, type = "success") {
  const notification = document.createElement('div')
  notification.textContent = message
  
  const bgColors = {
    success: 'linear-gradient(135deg, #4CAF50, #45a049)',
    error: 'linear-gradient(135deg, #f44336, #d32f2f)',
    info: 'linear-gradient(135deg, #2196F3, #1976D2)',
    warning: 'linear-gradient(135deg, #FF9800, #F57C00)'
  }
  
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 24px;
    background: ${bgColors[type] || bgColors.success};
    color: white;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
    font-weight: 600;
    max-width: 400px;
  `
  
  document.body.appendChild(notification)
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out'
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification)
      }
    }, 300)
  }, 3000)
}

// Mark feedback as read when viewing this page
try {
  const unreadCount = parseInt(localStorage.getItem('unreadFeedbackCount') || '0')
  if (unreadCount > 0) {
    localStorage.setItem('unreadFeedbackCount', '0')
    localStorage.setItem('lastFeedbackCheck', Date.now().toString())
    console.log('✅ Marked feedback as read')
  }
} catch (error) {
  console.error('Error marking feedback as read:', error)
}

let allFeedback = []
let allOrders = new Map()
let feedbackListener = null

// ============================================================================
// LOAD ALL FEEDBACK WITH REAL-TIME UPDATES
// ============================================================================
async function setupRealtimeFeedback() {
  const feedbackList = document.getElementById("feedback-list")
  
  try {
    console.log('🔄 Setting up real-time feedback listener...')
    
    // Clean up existing listener
    if (feedbackListener) {
      feedbackListener()
    }
    
    const feedbackRef = collection(db, "feedback")
    const feedbackQuery = query(feedbackRef, orderBy("createdAt", "desc"))
    
    feedbackListener = onSnapshot(feedbackQuery, async (snapshot) => {
      console.log(`📊 Received ${snapshot.size} feedback entries`)
      
      allFeedback = []
      const orderIds = new Set()
      
      snapshot.forEach(doc => {
        const feedback = { id: doc.id, ...doc.data() }
        allFeedback.push(feedback)
        if (feedback.orderId) {
          orderIds.add(feedback.orderId)
        }
      })
      
      // Load order details if there are any
      if (orderIds.size > 0) {
        await loadOrderDetails(Array.from(orderIds))
      }
      
      // Display feedback
      displayFeedback(allFeedback)
      updateStats(allFeedback)
      
      console.log('✅ Feedback updated in real-time')
    }, (error) => {
      console.error("❌ Real-time feedback error:", error)
      loadFeedbackOnce()
    })
    
  } catch (error) {
    console.error("❌ Error setting up real-time feedback:", error)
    loadFeedbackOnce()
  }
}

// ============================================================================
// FALLBACK: LOAD FEEDBACK ONCE
// ============================================================================
async function loadFeedbackOnce() {
  const feedbackList = document.getElementById("feedback-list")
  
  try {
    console.log('🔄 Loading feedback (fallback mode)...')
    
    const feedbackRef = collection(db, "feedback")
    const feedbackQuery = query(feedbackRef, orderBy("createdAt", "desc"))
    const feedbackSnapshot = await getDocs(feedbackQuery)
    
    allFeedback = []
    const orderIds = new Set()
    
    feedbackSnapshot.forEach(doc => {
      const feedback = { id: doc.id, ...doc.data() }
      allFeedback.push(feedback)
      if (feedback.orderId) {
        orderIds.add(feedback.orderId)
      }
    })
    
    if (orderIds.size > 0) {
      await loadOrderDetails(Array.from(orderIds))
    }
    
    displayFeedback(allFeedback)
    updateStats(allFeedback)
    
    console.log(`✅ Loaded ${allFeedback.length} feedback entries`)
    
  } catch (error) {
    console.error("❌ Error loading feedback:", error)
    feedbackList.innerHTML = `
      <div class="empty-state">
        <div class="icon">⚠️</div>
        <h2>Error Loading Feedback</h2>
        <p>${escapeHtml(error.message)}</p>
      </div>
    `
  }
}

// ============================================================================
// LOAD ORDER DETAILS IN BATCHES
// ============================================================================
async function loadOrderDetails(orderIds) {
  if (!orderIds || orderIds.length === 0) return
  
  try {
    console.log(`🔄 Loading details for ${orderIds.length} orders...`)
    
    // Load orders in smaller batches to avoid query limits
    const batchSize = 10
    for (let i = 0; i < orderIds.length; i += batchSize) {
      const batch = orderIds.slice(i, i + batchSize)
      
      for (const orderId of batch) {
        if (allOrders.has(orderId)) continue
        
        try {
          const orderRef = collection(db, "orders")
          const orderQuery = query(orderRef, where("__name__", "==", orderId))
          const orderSnapshot = await getDocs(orderQuery)
          
          if (!orderSnapshot.empty) {
            const orderDoc = orderSnapshot.docs[0]
            allOrders.set(orderId, { id: orderDoc.id, ...orderDoc.data() })
          } else {
            // Store a placeholder for missing orders
            allOrders.set(orderId, { 
              id: orderId, 
              fullName: 'Unknown Customer',
              status: 'unknown',
              items: []
            })
          }
        } catch (error) {
          console.error(`Error loading order ${orderId}:`, error)
          allOrders.set(orderId, { 
            id: orderId, 
            fullName: 'Unknown Customer',
            status: 'unknown',
            items: []
          })
        }
      }
    }
    
    console.log(`✅ Loaded ${allOrders.size} order details`)
  } catch (error) {
    console.error("❌ Error loading order details:", error)
  }
}

// ============================================================================
// DISPLAY FEEDBACK
// ============================================================================
function displayFeedback(feedbackData) {
  const feedbackList = document.getElementById("feedback-list")
  
  if (feedbackData.length === 0) {
    feedbackList.innerHTML = `
      <div class="empty-state">
        <div class="icon">⭐</div>
        <h2>No feedback yet</h2>
        <p>Customer reviews will appear here once they submit feedback</p>
      </div>
    `
    return
  }
  
  feedbackList.innerHTML = feedbackData.map(feedback => {
    const order = allOrders.get(feedback.orderId) || {
      fullName: 'Customer',
      status: 'unknown',
      items: [],
      total: 0
    }
    
    // Handle timestamp conversion safely
    let createdAt
    try {
      if (feedback.createdAt?.toDate) {
        createdAt = feedback.createdAt.toDate()
      } else if (feedback.createdAt) {
        createdAt = new Date(feedback.createdAt)
      } else {
        createdAt = new Date()
      }
    } catch (error) {
      console.error('Error parsing date:', error)
      createdAt = new Date()
    }
    
    const stars = '⭐'.repeat(feedback.rating || 0) + '☆'.repeat(5 - (feedback.rating || 0))
    
    const items = order.items || []
    const itemsHTML = items.length > 0 ? `
      <div class="order-items">
        ${items.map(item => `
          <span class="order-item-tag">
            ${escapeHtml(item.name || item.productName || 'Item')} (×${item.quantity || 1})
          </span>
        `).join('')}
      </div>
    ` : '<p style="color: #DEB887; font-size: 14px; margin-top: 8px;">No items available</p>'
    
    const commentHTML = feedback.comment ? `
      <div class="feedback-comment">
        <p>${escapeHtml(feedback.comment)}</p>
      </div>
    ` : ''
    
    return `
      <div class="feedback-card">
        <div class="feedback-header">
          <div class="feedback-user-info">
            <h3>${escapeHtml(order.fullName || 'Customer')}</h3>
            <div class="feedback-meta">
              <span>📧 ${escapeHtml(feedback.userEmail || 'No email')}</span>
              <span>🆔 Order #${(feedback.orderId || '').substring(0, 8)}</span>
              <span>📅 ${createdAt.toLocaleDateString()} at ${createdAt.toLocaleTimeString()}</span>
            </div>
          </div>
          <div class="feedback-rating">
            <div>${stars}</div>
            <div class="rating-value">${feedback.rating || 0}/5</div>
          </div>
        </div>
        
        <div class="feedback-order-details">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <strong style="color: #f5deb3;">Order Details</strong>
            <span style="color: #FFD700; font-weight: 700;">₱${(order.total || 0).toFixed(2)}</span>
          </div>
          ${itemsHTML}
          <div style="margin-top: 12px; font-size: 14px; color: #DEB887;">
            <strong>Status:</strong> ${getStatusLabel(order.status)} • 
            <strong>Phone:</strong> ${escapeHtml(order.phone || 'N/A')} • 
            <strong>Address:</strong> ${escapeHtml(order.address || 'N/A')}
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
  const commentCount = feedbackData.filter(f => f.comment && f.comment.trim()).length
  
  document.getElementById("total-feedback").textContent = totalFeedback
  document.getElementById("avg-rating").textContent = avgRating
  document.getElementById("five-star-count").textContent = fiveStarCount
  document.getElementById("comment-count").textContent = commentCount
}

// ============================================================================
// FILTER & SORT
// ============================================================================
function applyFilters() {
  const ratingFilter = document.getElementById("rating-filter").value
  const sortFilter = document.getElementById("sort-filter").value
  
  let filteredFeedback = [...allFeedback]
  
  // Apply rating filter
  if (ratingFilter !== 'all') {
    const targetRating = parseInt(ratingFilter)
    filteredFeedback = filteredFeedback.filter(f => f.rating === targetRating)
  }
  
  // Apply sort
  filteredFeedback.sort((a, b) => {
    let dateA, dateB
    
    try {
      dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0)
      dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0)
    } catch (error) {
      dateA = new Date(0)
      dateB = new Date(0)
    }
    
    switch(sortFilter) {
      case 'newest':
        return dateB - dateA
      case 'oldest':
        return dateA - dateB
      case 'highest':
        return (b.rating || 0) - (a.rating || 0)
      case 'lowest':
        return (a.rating || 0) - (b.rating || 0)
      default:
        return dateB - dateA
    }
  })
  
  displayFeedback(filteredFeedback)
  console.log(`✓ Filtered to ${filteredFeedback.length} feedback entries`)
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
// EVENT LISTENERS
// ============================================================================
document.getElementById("rating-filter")?.addEventListener('change', applyFilters)
document.getElementById("sort-filter")?.addEventListener('change', applyFilters)

// ============================================================================
// CLEANUP
// ============================================================================
window.addEventListener('beforeunload', () => {
  if (feedbackListener) {
    feedbackListener()
    console.log("✅ Feedback listener cleaned up")
  }
})

// ============================================================================
// INITIALIZATION
// ============================================================================
console.log("🚀 Initializing Admin Feedback Panel...")

// Load profile first
loadAdminProfile()
setupProfileUpload()

// Then load feedback
try {
  setupRealtimeFeedback()
  console.log("✅ Admin Feedback Panel Ready - Real-time Updates Active")
} catch (error) {
  console.error("❌ Failed to setup real-time updates:", error)
  loadFeedbackOnce()
}

// Add animation styles
const style = document.createElement('style')
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(400px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }

  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(400px); opacity: 0; }
  }
`
document.head.appendChild(style)

console.log("✅ Admin Feedback module loaded")