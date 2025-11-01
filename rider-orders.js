// rider-orders.js - COMPLETE FIX - Copy and replace your entire file
import { 
  db, 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  getDoc,
  Timestamp,
  onSnapshot
} from "./firebase-config.js"

// ==========================================
// GLOBAL VARIABLES
// ==========================================
let currentRiderId = localStorage.getItem('currentRiderId')
let currentTab = 'pending'
let currentDeclineOrderId = null
let unsubscribeListeners = []
let orderCounts = { pending: 0, active: 0, completed: 0 }
let isOnline = navigator.onLine
let retryCount = 0
const MAX_RETRIES = 3

// ==========================================
// AUTHENTICATION CHECK
// ==========================================
if (!currentRiderId) {
  console.error('❌ No rider ID found in localStorage')
  document.getElementById('orders-container').innerHTML = `
    <div class="error-container">
      <h2>⚠️ Authentication Required</h2>
      <p>Please login as a rider to access this page</p>
      <button class="btn btn-update" onclick="window.location.href='rider-login.html'" style="margin-top: 15px;">
        Go to Login
      </button>
    </div>
  `
} else {
  console.log('✅ Rider ID found:', currentRiderId)
  initializePage()
}

// ==========================================
// NETWORK STATUS MONITORING
// ==========================================
window.addEventListener('online', () => {
  console.log('🌐 Network connection restored')
  isOnline = true
  showNotification('🌐 Connection restored!', 'success', 3000)
  retryCount = 0
  setupRealtimeOrderUpdates()
})

window.addEventListener('offline', () => {
  console.log('📡 Network connection lost')
  isOnline = false
  showNotification('📡 No internet connection. Will retry when back online.', 'warning', 5000)
})

// ==========================================
// INITIALIZE PAGE
// ==========================================
async function initializePage() {
  try {
    console.log('🚀 Initializing rider dashboard...')
    console.log('👤 Current Rider ID:', currentRiderId)
    
    // Check internet connection first
    if (!isOnline) {
      throw new Error('No internet connection. Please check your network.')
    }
    
    // Load rider info
    await loadRiderInfo()
    console.log('✓ Rider info loaded')
    
    // Setup real-time updates with fallback
    setupRealtimeOrderUpdates()
    console.log('✓ Real-time listener active')
    
    // Initial load of orders
    await displayOrders()
    console.log('✓ Initial orders displayed')
    
    // Start location tracking
    startLocationTracking()
    console.log('✓ Location tracking started')
    
    // Setup periodic backup polling (every 30 seconds)
    setInterval(async () => {
      if (isOnline) {
        console.log('🔄 Backup poll check...')
        try {
          await displayOrders()
        } catch (error) {
          console.warn('Backup poll failed:', error)
        }
      }
    }, 30000)
    
    console.log('✅ Rider dashboard initialized successfully')
  } catch (error) {
    console.error('❌ Initialization error:', error)
    showNotification('Failed to initialize: ' + error.message, 'error', 6000)
    document.getElementById('orders-container').innerHTML = `
      <div class="error-container">
        <h2>⚠️ Initialization Failed</h2>
        <p>${error.message}</p>
        <p style="font-size: 13px; color: #666; margin-top: 10px;">Rider ID: ${currentRiderId}</p>
        <button class="btn btn-update" onclick="location.reload()" style="margin-top: 15px;">
          🔄 Retry
        </button>
      </div>
    `
  }
}

// ==========================================
// LOAD RIDER INFORMATION
// ==========================================
async function loadRiderInfo() {
  try {
    console.log('📋 Loading rider info for:', currentRiderId)
    const riderDoc = await getDoc(doc(db, "riders", currentRiderId))
    
    if (riderDoc.exists()) {
      const rider = riderDoc.data()
      console.log('✅ Rider info loaded:', rider.name)
      
      document.getElementById('rider-name').textContent = rider.name
      document.getElementById('rider-vehicle').textContent = `${rider.vehicle || 'Vehicle'} • ${rider.phone}`
      
      const isOnline = rider.isOnline || rider.status === 'online'
      const indicator = document.getElementById('status-indicator')
      const statusText = document.getElementById('status-text')
      
      if (isOnline) {
        indicator.classList.remove('offline')
        statusText.textContent = 'Online'
        statusText.classList.remove('offline')
      } else {
        indicator.classList.add('offline')
        statusText.textContent = 'Offline'
        statusText.classList.add('offline')
      }
    } else {
      throw new Error('Rider not found in database. Please contact admin.')
    }
  } catch (error) {
    console.error('❌ Error loading rider info:', error)
    throw error
  }
}

// ==========================================
// SETUP REAL-TIME ORDER UPDATES (FIXED WITH POLLING FALLBACK)
// ==========================================
function setupRealtimeOrderUpdates() {
  // Clean up existing listeners
  unsubscribeListeners.forEach(unsub => {
    try {
      unsub()
    } catch (e) {
      console.warn('Error unsubscribing:', e)
    }
  })
  unsubscribeListeners = []

  let firstLoad = true

  try {
    console.log('🔄 Setting up real-time listener...')
    console.log('👤 Rider ID:', currentRiderId)
    
    const ordersRef = collection(db, "orders")
    const q = query(ordersRef, where("riderId", "==", currentRiderId))

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        console.log(`✅ Real-time update: ${snapshot.size} orders found`)
        retryCount = 0 // Reset retry count on success
        
        // Log each order
        snapshot.docs.forEach(doc => {
          const orderData = doc.data()
          console.log(`   Order ${doc.id.substring(0, 8)}: ${orderData.status}`)
        })
        
        const previousCounts = { ...orderCounts }
        
        const orders = []
        snapshot.docs.forEach(doc => {
          const order = { id: doc.id, ...doc.data() }
          orders.push(order)
        })
        
        // Update counts
        orderCounts = {
          pending: orders.filter(o => o.status === 'assigned').length,
          active: orders.filter(o => ['picked_up', 'in_transit'].includes(o.status)).length,
          completed: orders.filter(o => ['delivered', 'done'].includes(o.status)).length
        }
        
        console.log('📊 Counts:', orderCounts)
        
        // Notify about new orders
        if (!firstLoad && orderCounts.pending > previousCounts.pending) {
          playNotificationSound()
          showNotification('🆕 New delivery request!', 'success', 6000)
        }
        
        firstLoad = false
        updateTabBadges()
        displayOrders()
      },
      (error) => {
        console.error("❌ Real-time listener error:", error.message)
        
        // Don't show too many error notifications
        if (retryCount < MAX_RETRIES) {
          retryCount++
          console.log(`🔄 Retry ${retryCount}/${MAX_RETRIES}...`)
          
          // Switch to polling mode
          console.log('📡 Switching to polling mode...')
          showNotification('Using backup mode...', 'warning', 3000)
          
          // Retry after delay
          setTimeout(() => {
            if (isOnline && retryCount < MAX_RETRIES) {
              setupRealtimeOrderUpdates()
            } else {
              // Use polling as fallback
              startPollingMode()
            }
          }, 5000 * retryCount)
        } else {
          startPollingMode()
        }
      }
    )

    unsubscribeListeners.push(unsubscribe)
    console.log('✅ Real-time listener active')
  } catch (error) {
    console.error('❌ Failed to setup listener:', error)
    startPollingMode()
  }
}

// ==========================================
// POLLING MODE FALLBACK
// ==========================================
function startPollingMode() {
  console.log('📡 Starting polling mode (every 15 seconds)')
  showNotification('📡 Using backup refresh mode', 'warning', 4000)
  
  const pollInterval = setInterval(async () => {
    if (!isOnline) return
    
    console.log('🔄 Polling for orders...')
    try {
      await displayOrders()
    } catch (error) {
      console.error('Poll error:', error)
    }
  }, 15000)
  
  unsubscribeListeners.push(() => clearInterval(pollInterval))
}

// ==========================================
// PLAY NOTIFICATION SOUND
// ==========================================
function playNotificationSound() {
  try {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBi1+zPDTfS8GJHzM8OeLNgkXbL3q7Kj/')
    audio.volume = 0.4
    audio.play().catch(() => {})
  } catch (e) {}
}

// ==========================================
// UPDATE TAB BADGES
// ==========================================
function updateTabBadges() {
  document.querySelectorAll('.tab').forEach(tab => {
    const text = tab.textContent
    if (text.includes('Pending')) {
      tab.innerHTML = `📋 Pending Requests ${orderCounts.pending > 0 ? `<span class="badge">${orderCounts.pending}</span>` : ''}`
    } else if (text.includes('Active')) {
      tab.innerHTML = `🚚 Active Deliveries ${orderCounts.active > 0 ? `<span class="badge">${orderCounts.active}</span>` : ''}`
    } else if (text.includes('Completed')) {
      tab.innerHTML = `✅ Completed ${orderCounts.completed > 0 ? `<span class="badge-subtle">${orderCounts.completed}</span>` : ''}`
    }
  })
}

// ==========================================
// FETCH ORDERS BY STATUS
// ==========================================
async function fetchOrdersByStatus(status) {
  try {
    console.log(`🔍 Fetching ${status} orders...`)
    const ordersRef = collection(db, "orders")
    const q = query(ordersRef, where("riderId", "==", currentRiderId))
    const querySnapshot = await getDocs(q)
    
    let allOrders = []
    querySnapshot.forEach((doc) => {
      allOrders.push({ id: doc.id, ...doc.data() })
    })

    console.log(`📦 Total orders: ${allOrders.length}`)

    let filtered = []
    if (status === 'pending') {
      filtered = allOrders.filter(o => o.status === 'assigned')
    } else if (status === 'active') {
      filtered = allOrders.filter(o => ['picked_up', 'in_transit'].includes(o.status))
    } else if (status === 'completed') {
      filtered = allOrders.filter(o => ['delivered', 'done'].includes(o.status))
    }

    console.log(`✅ ${status}: ${filtered.length}`)

    filtered.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt)
      const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt)
      return dateB - dateA
    })

    return filtered
  } catch (error) {
    console.error('❌ Fetch error:', error)
    showNotification('Error loading orders: ' + error.message, 'error', 4000)
    return []
  }
}

// ==========================================
// DISPLAY ORDERS
// ==========================================
async function displayOrders() {
  const container = document.getElementById('orders-container')
  container.innerHTML = '<div class="loading">Loading orders...</div>'

  const orders = await fetchOrdersByStatus(currentTab)

  if (orders.length === 0) {
    const emptyMessages = {
      pending: ['🎯 No pending requests', 'You\'re all caught up!', '📋'],
      active: ['🚚 No active deliveries', 'Ready for your next order!', '🚚'],
      completed: ['📦 No completed deliveries yet', 'Start accepting orders!', '✅']
    }
    
    const [title, subtitle, icon] = emptyMessages[currentTab]
    
    container.innerHTML = `
      <div class="empty-state">
        <div style="font-size: 64px; margin-bottom: 20px;">${icon}</div>
        <h2>${title}</h2>
        <p>${subtitle}</p>
        <div style="margin-top: 20px; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <button class="btn btn-update" onclick="location.reload()" style="width: auto; padding: 12px 24px;">
            🔄 Refresh
          </button>
          <button class="btn" style="width: auto; padding: 12px 24px; background: #667eea; color: white;" onclick="runDiagnostics()">
            🔍 Check Connection
          </button>
        </div>
        <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 10px; font-size: 13px; text-align: left;">
          <strong>Status:</strong><br>
          Rider ID: <code>${currentRiderId}</code><br>
          Network: ${isOnline ? '🟢 Online' : '🔴 Offline'}<br>
          Last Check: ${new Date().toLocaleTimeString()}
        </div>
      </div>
    `
    return
  }

  container.innerHTML = orders.map(order => createOrderCard(order)).join('')
  console.log(`✅ Displayed ${orders.length} orders`)
}

// ==========================================
// CREATE ORDER CARD HTML
// ==========================================
function createOrderCard(order) {
  const totalItems = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0
  const createdAt = order.createdAt?.toDate?.() || new Date(order.createdAt)
  
  let timeInfo = ''
  if (order.assignedAt && order.status === 'assigned') {
    const assignedTime = order.assignedAt.toDate ? order.assignedAt.toDate() : new Date(order.assignedAt)
    const minutesAgo = Math.floor((new Date() - assignedTime) / 60000)
    if (minutesAgo < 60) {
      timeInfo = `<div style="text-align: center; margin-top: 12px; font-size: 13px;"><span style="color: #ff9800; font-weight: 600;">⏱️ Assigned ${minutesAgo}m ago</span></div>`
    }
  }
  
  let actions = ''
  
  if (order.status === 'assigned') {
    actions = `
      <div class="action-buttons">
        <button class="btn btn-accept" onclick="acceptOrder('${order.id}')">
          <span style="font-size: 20px;">✓</span>
          <span>Accept Order</span>
        </button>
        <button class="btn btn-decline" onclick="openDeclineModal('${order.id}')">
          <span style="font-size: 20px;">✗</span>
          <span>Decline</span>
        </button>
      </div>
      ${timeInfo}
    `
  } else if (order.status === 'picked_up') {
    actions = `
      <div class="action-buttons">
        <button class="btn btn-update" onclick="updateOrderStatus('${order.id}', 'in_transit')">
          <span style="font-size: 20px;">🚚</span>
          <span>Start Delivery</span>
        </button>
      </div>
    `
  } else if (order.status === 'in_transit') {
    actions = `
      <div class="action-buttons">
        <button class="btn btn-update" onclick="updateOrderStatus('${order.id}', 'delivered')" style="background: linear-gradient(135deg, #4caf50, #45a049);">
          <span style="font-size: 20px;">✓</span>
          <span>Mark Delivered</span>
        </button>
      </div>
    `
  }

  const lat = order.deliveryLat || order.latitude || 10.3157
  const lng = order.deliveryLng || order.longitude || 123.8854

  let statusBadge = ''
  if (order.status === 'assigned') {
    statusBadge = '<span class="status-badge status-assigned">⏳ Awaiting Response</span>'
  } else if (order.status === 'picked_up') {
    statusBadge = '<span class="status-badge status-picked_up">📦 Picked Up</span>'
  } else if (order.status === 'in_transit') {
    statusBadge = '<span class="status-badge status-in_transit">🚚 Out for Delivery</span>'
  } else if (order.status === 'delivered') {
    statusBadge = '<span class="status-badge status-delivered">✅ Delivered</span>'
  }

  return `
    <div class="order-card">
      <div class="order-header">
        <div>
          <div class="order-id">Order #${order.id.substring(0, 8)}</div>
          <p style="color: #999; font-size: 13px; margin-top: 4px;">${createdAt.toLocaleString()}</p>
        </div>
        ${statusBadge}
      </div>

      <div class="customer-info">
        <h4 style="margin-bottom: 12px; color: #333;">
          <span style="font-size: 20px;">👤</span> Customer Information
        </h4>
        <p><strong>Name:</strong> ${order.fullName || 'N/A'}</p>
        <p><strong>📱 Phone:</strong> <a href="tel:${order.phone}" style="color: #667eea; text-decoration: none; font-weight: 600;">${order.phone}</a></p>
        <p><strong>📍 Address:</strong> ${order.address}, ${order.city || 'Lapu-Lapu City'}</p>
        <a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" class="map-link">
          <span style="font-size: 18px;">🗺️</span>
          <span>Open in Google Maps</span>
        </a>
      </div>

      <div class="items-list">
        <h4 style="margin-bottom: 12px;">
          <span style="font-size: 20px;">📦</span> 
          Order Items (${totalItems} item${totalItems !== 1 ? 's' : ''})
        </h4>
        ${(order.items || []).map(item => `
          <div class="item">
            <div>
              <div style="font-weight: 600; margin-bottom: 4px;">${item.name || item.productName}</div>
              <div style="font-size: 13px; color: #666;">Quantity: ${item.quantity}</div>
            </div>
            <div style="font-weight: 700; font-size: 16px; color: #667eea;">₱${((item.price * item.quantity) || 0).toFixed(2)}</div>
          </div>
        `).join('')}
      </div>

      <div class="order-total">
        <span>Total Amount:</span>
        <span>₱${(order.total || 0).toFixed(2)}</span>
      </div>

      ${order.notes ? `
        <div style="margin: 16px 0; padding: 12px; background: #fff3cd; border-radius: 10px; border-left: 4px solid #ffc107;">
          <strong style="color: #856404;">📝 Special Instructions:</strong>
          <p style="margin: 6px 0 0 0; color: #856404;">${order.notes}</p>
        </div>
      ` : ''}

      ${order.deliveredAt ? `
        <div style="text-align: center; padding: 16px; background: linear-gradient(135deg, #d4edda, #c3e6cb); border-radius: 12px; margin-top: 16px;">
          <p style="color: #155724; font-weight: 700; margin: 0; font-size: 15px;">
            ✅ Completed on ${new Date(order.deliveredAt.toDate ? order.deliveredAt.toDate() : order.deliveredAt).toLocaleString()}
          </p>
        </div>
      ` : actions}
    </div>
  `
}

// ==========================================
// ACCEPT ORDER
// ==========================================
window.acceptOrder = async function(orderId) {
  if (!confirm('✅ Accept this delivery order?')) return

  const btn = event.target.closest('button')
  const originalHTML = btn.innerHTML
  btn.disabled = true
  btn.innerHTML = '<span style="font-size: 20px;">⏳</span><span>Accepting...</span>'

  try {
    await updateDoc(doc(db, "orders", orderId), {
      status: "picked_up",
      acceptedAt: Timestamp.now(),
      acceptedBy: currentRiderId,
      pickedUpAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    })

    await updateDoc(doc(db, "riders", currentRiderId), {
      isTracking: true,
      trackingStarted: Timestamp.now(),
      lastActive: Timestamp.now()
    })

    showNotification('✅ Order accepted!', 'success')
    setTimeout(() => switchTab('active'), 1500)
  } catch (error) {
    console.error('❌ Accept error:', error)
    showNotification('❌ Failed to accept', 'error')
    btn.disabled = false
    btn.innerHTML = originalHTML
  }
}

// ==========================================
// OPEN DECLINE MODAL
// ==========================================
window.openDeclineModal = function(orderId) {
  currentDeclineOrderId = orderId
  document.getElementById('decline-modal').classList.add('active')
  document.getElementById('decline-reason').value = ''
  document.getElementById('decline-reason').focus()
}

// ==========================================
// CLOSE DECLINE MODAL
// ==========================================
window.closeDeclineModal = function() {
  document.getElementById('decline-modal').classList.remove('active')
  currentDeclineOrderId = null
}

// ==========================================
// CONFIRM DECLINE
// ==========================================
window.confirmDecline = async function() {
  const reason = document.getElementById('decline-reason').value.trim()
  
  if (!reason) {
    alert('⚠️ Please provide a reason')
    document.getElementById('decline-reason').focus()
    return
  }

  if (!currentDeclineOrderId) return

  const btn = event.target
  btn.disabled = true
  btn.textContent = 'Declining...'

  try {
    await updateDoc(doc(db, "orders", currentDeclineOrderId), {
      status: "ready",
      riderId: null,
      riderName: null,
      declinedBy: currentRiderId,
      declineReason: reason,
      declinedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    })

    showNotification('Order declined', 'success')
    closeDeclineModal()
    displayOrders()
  } catch (error) {
    console.error('❌ Decline error:', error)
    showNotification('Failed to decline', 'error')
    btn.disabled = false
    btn.textContent = 'Confirm Decline'
  }
}

// ==========================================
// UPDATE ORDER STATUS
// ==========================================
window.updateOrderStatus = async function(orderId, newStatus) {
  const confirmMessages = {
    'in_transit': '🚚 Start delivery?',
    'delivered': '✅ Mark as delivered?'
  }
  
  if (!confirm(confirmMessages[newStatus])) return

  const btn = event.target.closest('button')
  const originalHTML = btn.innerHTML
  btn.disabled = true

  try {
    const updateData = {
      status: newStatus,
      updatedAt: Timestamp.now()
    }

    if (newStatus === 'in_transit') {
      updateData.inTransitAt = Timestamp.now()
      btn.innerHTML = '<span style="font-size: 20px;">⏳</span><span>Updating...</span>'
    } else if (newStatus === 'delivered') {
      updateData.deliveredAt = Timestamp.now()
      btn.innerHTML = '<span style="font-size: 20px;">⏳</span><span>Completing...</span>'
      
      await updateDoc(doc(db, "riders", currentRiderId), {
        isTracking: false,
        trackingStopped: Timestamp.now(),
        lastActive: Timestamp.now()
      })
    }

    await updateDoc(doc(db, "orders", orderId), updateData)

    const successMessages = {
      'in_transit': '🚚 Delivery started!',
      'delivered': '✅ Order completed!'
    }
    
    showNotification(successMessages[newStatus], 'success')
    
    if (newStatus === 'delivered') {
      setTimeout(() => switchTab('completed'), 1500)
    }
    
    displayOrders()
  } catch (error) {
    console.error('❌ Update error:', error)
    showNotification('Failed to update', 'error')
    btn.disabled = false
    btn.innerHTML = originalHTML
  }
}

// ==========================================
// SWITCH TAB
// ==========================================
window.switchTab = function(tab) {
  currentTab = tab
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
  event.target.classList.add('active')
  displayOrders()
}

// ==========================================
// TOGGLE ONLINE STATUS
// ==========================================
window.toggleOnlineStatus = async function() {
  try {
    const riderDoc = await getDoc(doc(db, "riders", currentRiderId))
    const rider = riderDoc.data()
    const newStatus = !(rider.isOnline || rider.status === 'online')
    
    await updateDoc(doc(db, "riders", currentRiderId), {
      isOnline: newStatus,
      status: newStatus ? 'online' : 'offline',
      lastActive: Timestamp.now()
    })
    
    showNotification(newStatus ? '🟢 Online' : '🔴 Offline', 'success')
    await loadRiderInfo()
  } catch (error) {
    console.error('❌ Status error:', error)
    showNotification('Failed to update status', 'error')
  }
}

// ==========================================
// SHOW NOTIFICATION
// ==========================================
function showNotification(message, type = 'info', duration = 4000) {
  const notification = document.createElement('div')
  notification.className = `notification ${type}`
  notification.innerHTML = `
    <div style="display: flex; align-items: start; gap: 12px;">
      <span style="font-size: 24px;">
        ${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}
      </span>
      <span style="flex: 1;">${message}</span>
    </div>
  `
  document.body.appendChild(notification)
  
  setTimeout(() => {
    notification.style.animation = 'slideInRight 0.3s ease reverse'
    setTimeout(() => {
      if (document.body.contains(notification)) {
        notification.remove()
      }
    }, 300)
  }, duration)
}

// ==========================================
// START LOCATION TRACKING
// ==========================================
function startLocationTracking() {
  if (!navigator.geolocation) return

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const watchId = navigator.geolocation.watchPosition(
        async (position) => {
          try {
            await updateDoc(doc(db, "riders", currentRiderId), {
              location: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                updatedAt: Timestamp.now()
              },
              lastActive: Timestamp.now()
            })
          } catch (error) {
            console.warn('⚠️ Location update failed:', error)
          }
        },
        (error) => console.warn('⚠️ Location error:', error),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      )
      
      window.geolocationWatchId = watchId
    },
    (error) => console.warn('⚠️ Location denied:', error)
  )
}

// ==========================================
// DIAGNOSTICS
// ==========================================
window.runDiagnostics = async function() {
  console.log('🔍 Running diagnostics...')
  
  const results = []
  
  try {
    // Test 1: Network
    results.push('Network: ' + (isOnline ? '🟢 Online' : '🔴 Offline'))
    
    // Test 2: Firestore connection
    results.push('Testing Firestore...')
    const ordersRef = collection(db, "orders")
    const q = query(ordersRef, where("riderId", "==", currentRiderId))
    const snapshot = await getDocs(q)
    results.push(`✓ Connected: ${snapshot.size} orders found`)
    
    // Test 3: List orders
    const orders = []
    snapshot.forEach(doc => {
      const order = doc.data()
      orders.push({
        id: doc.id.substring(0, 8),
        status: order.status,
        customer: order.fullName,
        total: order.total
      })
    })
    
    if (orders.length > 0) {
      results.push('\nOrders:')
      orders.forEach(o => {
        results.push(`  #${o.id}: ${o.status} | ${o.customer} | ₱${o.total}`)
      })
    } else {
      results.push('⚠️ No orders assigned yet')
    }
    
    // Test 4: Rider info
    const riderDoc = await getDoc(doc(db, "riders", currentRiderId))
    if (riderDoc.exists()) {
      const rider = riderDoc.data()
      results.push(`\n✓ Rider: ${rider.name}`)
      results.push(`Status: ${rider.status || (rider.isOnline ? 'online' : 'offline')}`)
    } else {
      results.push('❌ Rider not found')
    }
    
  } catch (error) {
    results.push(`\n❌ Error: ${error.message}`)
  }
  
  alert('🔍 DIAGNOSTICS\n\n' + results.join('\n'))
  console.log('Diagnostics:', results)
  showNotification('Diagnostics complete', 'success', 3000)
}

// ==========================================
// CLEANUP
// ==========================================
window.addEventListener('beforeunload', () => {
  console.log('🧹 Cleaning up...')
  unsubscribeListeners.forEach(unsub => {
    try {
      unsub()
    } catch (e) {}
  })
  if (window.geolocationWatchId) {
    navigator.geolocation.clearWatch(window.geolocationWatchId)
  }
})

console.log('✅ rider-orders.js loaded')
console.log('🛵 Rider:', currentRiderId)
console.log('🌐 Network:', isOnline ? 'Online' : 'Offline')