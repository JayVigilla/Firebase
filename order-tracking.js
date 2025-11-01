// order-tracking.js - FIXED & IMPROVED VERSION
// ============================================================================
// ORDER TRACKING SYSTEM WITH FIREBASE & LOCALSTORAGE FALLBACK
// ============================================================================

// Global variables
let currentUser = null
let refreshInterval = null
let riderMaps = {}
let mapUpdateIntervals = {}
let riderMarkers = {}
let deliveryNotificationsListener = null
let ordersCache = []
let selectedRating = 0
let selectedOrderId = ''
let isInitialized = false

// Firebase references
let db, collection, query, where, getDocs, orderBy, doc, getDoc, Timestamp, auth, onAuthStateChanged, addDoc, updateDoc, onSnapshot

// ============================================================================
// FIREBASE INITIALIZATION
// ============================================================================

function initializeFirebaseReferences(firebaseConfig) {
  db = firebaseConfig.db
  collection = firebaseConfig.collection
  query = firebaseConfig.query
  where = firebaseConfig.where
  getDocs = firebaseConfig.getDocs
  orderBy = firebaseConfig.orderBy
  doc = firebaseConfig.doc
  getDoc = firebaseConfig.getDoc
  Timestamp = firebaseConfig.Timestamp
  auth = firebaseConfig.auth
  onAuthStateChanged = firebaseConfig.onAuthStateChanged
  addDoc = firebaseConfig.addDoc
  updateDoc = firebaseConfig.updateDoc
  onSnapshot = firebaseConfig.onSnapshot
  
  isInitialized = true
  console.log('✅ Firebase references initialized for order tracking')
}

// Make globally accessible
window.initializeOrderTracking = initializeFirebaseReferences

// Auto-initialize if firebaseConfig is already available
if (window.firebaseConfig && !isInitialized) {
  initializeFirebaseReferences(window.firebaseConfig)
}

// ============================================================================
// ORDER CACHE MANAGEMENT
// ============================================================================

function cacheOrders(orders) {
  ordersCache = orders
  try {
    const cacheData = {
      orders: orders,
      timestamp: Date.now(),
      userId: currentUser?.uid
    }
    sessionStorage.setItem('ordersCache', JSON.stringify(cacheData))
    console.log(`✓ Cached ${orders.length} orders`)
  } catch (e) {
    console.warn('Failed to cache orders:', e)
  }
}

function getCachedOrders() {
  try {
    const cacheData = JSON.parse(sessionStorage.getItem('ordersCache') || '{}')
    
    if (cacheData.userId === currentUser?.uid && 
        cacheData.timestamp && 
        (Date.now() - cacheData.timestamp < 300000)) {
      console.log(`✓ Using cached orders (${cacheData.orders?.length || 0})`)
      return cacheData.orders || []
    }
  } catch (e) {
    console.warn('Failed to load cache:', e)
  }
  return []
}

function mergeOrders(cachedOrders, newOrders) {
  const orderMap = new Map()
  
  cachedOrders.forEach(order => orderMap.set(order.id, order))
  newOrders.forEach(order => orderMap.set(order.id, order))
  
  return Array.from(orderMap.values())
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

async function initializeAuth() {
  try {
    const localUser = JSON.parse(localStorage.getItem("currentUser") || "null")
    
    if (auth && onAuthStateChanged) {
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.warn('⚠️ Firebase auth timeout, using localStorage')
          currentUser = localUser
          resolve(localUser)
        }, 3000)

        onAuthStateChanged(auth, (firebaseUser) => {
          clearTimeout(timeout)
          
          if (firebaseUser) {
            currentUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName
            }
            localStorage.setItem("currentUser", JSON.stringify(currentUser))
            console.log('✓ User authenticated via Firebase:', currentUser.email)
            resolve(currentUser)
          } else if (localUser) {
            currentUser = localUser
            console.log('✓ Using localStorage user:', localUser.email)
            resolve(localUser)
          } else {
            console.warn('⚠️ No user found')
            alert("Please login to track orders")
            window.location.href = "login.html"
            resolve(null)
          }
        })
      })
    } else {
      if (!localUser) {
        alert("Please login to track orders")
        window.location.href = "login.html"
        return null
      }
      
      currentUser = localUser
      console.log('✓ Using localStorage user (Firebase unavailable):', localUser.email)
      return localUser
    }
  } catch (error) {
    console.error("❌ Auth error:", error)
    
    const localUser = JSON.parse(localStorage.getItem("currentUser") || "null")
    if (!localUser) {
      alert("Please login to track orders")
      window.location.href = "login.html"
      return null
    }
    
    currentUser = localUser
    return localUser
  }
}

// ============================================================================
// LOAD ORDERS
// ============================================================================

async function loadOrders() {
  if (!currentUser) {
    console.error("❌ No user authenticated")
    showError("Please login to view orders")
    return
  }
  
  const ordersContainer = document.getElementById("orders-container")
  
  const cached = getCachedOrders()
  if (cached.length > 0) {
    displayOrders(cached)
    console.log("📦 Displaying cached orders...")
  } else {
    ordersContainer.innerHTML = `
      <div class="empty-orders">
        <div class="spinner"></div>
        <p style="margin-top: 20px;">Loading your orders...</p>
      </div>
    `
  }

  let allOrders = []

  if (db && getDocs && collection) {
    try {
      console.log('🔄 Fetching orders from Firestore...')
      const ordersRef = collection(db, "orders")
      const q = query(
        ordersRef, 
        where("userId", "==", currentUser.uid), 
        orderBy("createdAt", "desc")
      )
      const querySnapshot = await getDocs(q)

      querySnapshot.forEach((docSnap) => {
        allOrders.push({ id: docSnap.id, ...docSnap.data() })
      })
      console.log(`✓ Loaded ${allOrders.length} orders from Firestore`)
    } catch (firestoreError) {
      console.error("❌ Firestore error:", firestoreError)
      console.log("⚠️ Falling back to localStorage...")
    }
  } else {
    console.warn('⚠️ Firebase not initialized, using localStorage')
  }

  if (allOrders.length === 0) {
    try {
      const localOrders = JSON.parse(localStorage.getItem("orders") || "[]")
      allOrders = localOrders.filter((order) => 
        order.userId === (currentUser.uid || currentUser.id || currentUser.email)
      )
      console.log(`✓ Loaded ${allOrders.length} orders from localStorage`)
    } catch (e) {
      console.error('❌ localStorage error:', e)
    }
  }

  const mergedOrders = mergeOrders(cached, allOrders)
  const uniqueOrders = Array.from(new Map(mergedOrders.map((item) => [item.id, item])).values())
  
  uniqueOrders.sort((a, b) => {
    const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt)
    const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt)
    return dateB - dateA
  })

  cacheOrders(uniqueOrders)
  displayOrders(uniqueOrders)
  
  uniqueOrders.forEach(order => {
    if (order.riderId) {
      loadRiderInfo(order.id, order.riderId)
    }
  })
  
  console.log(`✅ Displayed ${uniqueOrders.length} total orders`)
}

async function loadOrdersQuietly() {
  if (!currentUser) return
  
  try {
    let orders = []
    
    if (db && getDocs && collection) {
      const ordersRef = collection(db, "orders")
      const q = query(ordersRef, where("userId", "==", currentUser.uid), orderBy("createdAt", "desc"))
      const querySnapshot = await getDocs(q)
      querySnapshot.forEach((docSnap) => {
        orders.push({ id: docSnap.id, ...docSnap.data() })
      })
    }

    if (orders.length > 0) {
      const mergedOrders = mergeOrders(ordersCache, orders)
      cacheOrders(mergedOrders)
      displayOrders(mergedOrders)
      
      for (const order of mergedOrders) {
        if (order.riderId) {
          await updateRiderLocationQuietly(order.id, order.riderId)
        }
      }
    }
  } catch (error) {
    console.error("Error refreshing orders:", error)
    if (ordersCache.length > 0) {
      displayOrders(ordersCache)
    }
  }
}

function displayOrders(orders) {
  const ordersContainer = document.getElementById("orders-container")

  if (orders.length === 0) {
    ordersContainer.innerHTML = `
      <div class="empty-orders">
        <h2>📦 No orders yet</h2>
        <p>Start shopping to place your first order!</p>
        <a href="shop.html" class="btn-primary" style="display: inline-block; margin-top: 15px; padding: 12px 30px; text-decoration: none; border-radius: 8px; background: #667eea; color: white;">
          Go to Shop
        </a>
      </div>
    `
    return
  }

  ordersContainer.innerHTML = ""
  orders.forEach((order) => {
    ordersContainer.innerHTML += createOrderCard(order)
  })
}

function showError(message) {
  const ordersContainer = document.getElementById("orders-container")
  ordersContainer.innerHTML = `
    <div class="empty-orders">
      <h2>⚠️ Error</h2>
      <p>${message}</p>
      <button class="btn-primary" onclick="location.reload()" style="margin-top: 15px; padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; background: #667eea; color: white;">
        Refresh Page
      </button>
    </div>
  `
}

// ============================================================================
// CREATE ORDER CARD
// ============================================================================

function createOrderCard(order) {
  const statusClass = (order.status || "pending").toLowerCase()
  const statusText = getStatusLabel(order.status || "pending")
  const orderDate = order.createdAt?.toDate?.() || new Date(order.createdAt)
  
  let pricingHTML = ''
  
  if (order.subtotal) {
    pricingHTML += `
      <div class="order-item-row" style="color: #666;">
        <span>Subtotal:</span>
        <span>₱${order.subtotal.toFixed(2)}</span>
      </div>
    `
  }
  
  if (order.discount && order.discount > 0) {
    const discountTiers = Math.floor(order.subtotal / 1000)
    pricingHTML += `
      <div class="order-item-row" style="color: #4caf50; font-weight: 600;">
        <span>Discount (${discountTiers} × 20%):</span>
        <span>-₱${order.discount.toFixed(2)}</span>
      </div>
      <div class="order-item-row" style="color: #666;">
        <span>After Discount:</span>
        <span>₱${order.subtotalAfterDiscount.toFixed(2)}</span>
      </div>
    `
  }
  
  if (order.tax && order.tax > 0) {
    pricingHTML += `
      <div class="order-item-row" style="color: #666;">
        <span>Tax (12%):</span>
        <span>₱${order.tax.toFixed(2)}</span>
      </div>
    `
  }
  
  if (order.deliveryFee) {
    pricingHTML += `
      <div class="order-item-row" style="color: #666;">
        <span>Delivery Fee:</span>
        <span>₱${order.deliveryFee.toFixed(2)}</span>
      </div>
    `
  }
  
  let feedbackHTML = ''
  if (order.hasFeedback && order.rating) {
    const stars = '⭐'.repeat(order.rating) + '☆'.repeat(5 - order.rating)
    feedbackHTML = `
      <div style="margin-top: 12px; padding: 14px; background: linear-gradient(135deg, #e8f5e9, #c3e6cb); border-radius: 10px; border-left: 4px solid #4caf50;">
        <div style="font-size: 13px; color: #155724; font-weight: 600; margin-bottom: 6px;">
          ✅ Your Feedback
        </div>
        <div style="font-size: 20px; margin-bottom: 6px;">${stars}</div>
        ${order.feedbackComment ? `<p style="font-size: 13px; color: #2e7d32; font-style: italic; margin: 0;">"${order.feedbackComment}"</p>` : ''}
      </div>
    `
  }

  return `
    <div class="order-card" data-order-id="${order.id}" ${order.riderId ? `data-rider-id="${order.riderId}"` : ''}>
      <div class="order-header">
        <div>
          <div class="order-id">Order #${order.id.substring(0, 8)}</div>
          <div class="order-date">${orderDate.toLocaleDateString()} at ${orderDate.toLocaleTimeString()}</div>
        </div>
        <span class="order-status ${statusClass}">${statusText}</span>
      </div>
      
      <div class="order-items">
        <h4 style="margin-bottom: 12px; color: #333; font-size: 15px;">📦 Order Items</h4>
        ${(order.items || [])
          .map(
            (item) => `
          <div class="order-item-row">
            <span>${item.name || item.productName} (×${item.quantity})</span>
            <span>₱${((item.price * item.quantity) || 0).toFixed(2)}</span>
          </div>
        `,
          )
          .join("")}
        
        ${pricingHTML}
      </div>
      
      <div class="order-total">
        <span>Total:</span>
        <span>₱${(order.total || 0).toFixed(2)}</span>
      </div>
      
      ${order.discount && order.discount > 0 ? `
        <div style="background: linear-gradient(135deg, #4caf50, #45a049); color: white; padding: 10px 16px; border-radius: 8px; text-align: center; font-weight: 600; font-size: 14px; margin-top: 12px;">
          🎉 You saved ₱${order.discount.toFixed(2)} on this order!
        </div>
      ` : ''}
      
      ${feedbackHTML}
      
      ${order.riderId ? `
        <div class="rider-info-box">
          <h4>🚴 Delivery Rider</h4>
          <div id="rider-${order.id}">
            <div class="loading-rider">
              <div class="spinner-small"></div>
              <p>Loading rider info...</p>
            </div>
          </div>
        </div>
      ` : ''}
      
      <div class="tracking-timeline">
        <h3>📍 Order Status</h3>
        ${createTimeline(order.status || "pending", order)}
      </div>
      
      ${getOrderActions(order)}
    </div>
  `
}

function getStatusLabel(status) {
  const labels = {
    'pending': '⏳ Pending',
    'processing': '🔄 Processing',
    'ready': '✅ Ready for Pickup',
    'assigned': '🛵 Rider Assigned',
    'picked_up': '📦 Picked Up',
    'in_transit': '🚚 Delivery is on the way',
    'delivery': '✅ Delivered',
    'delivered': '✅ Delivered',
    'done': '✅ Completed',
    'completed': '✅ Completed',
    'cancelled': '❌ Cancelled'
  }
  return labels[status] || status.toUpperCase()
}

function getOrderActions(order) {
  const status = order.status || 'pending'
  
  if (status === 'in_transit' || status === 'picked_up') {
    return `
      <div class="order-actions">
        <button class="btn-primary" onclick="trackLiveLocation('${order.id}')">
          🗺️ Track Live Location
        </button>
      </div>
    `
  }
  
  if (status === 'delivery' || status === 'delivered' || status === 'done' || status === 'completed') {
    return `
      <div class="order-actions">
        <button class="btn-secondary" onclick="downloadReceipt('${order.id}')">
          📄 Download Receipt
        </button>
      </div>
    `
  }
  
  return ''
}

function createTimeline(status, order) {
  const stages = [
    { key: "pending", label: "Order Placed", desc: "Your order has been received", time: order.createdAt },
    { key: "processing", label: "Processing", desc: "We're preparing your order", time: order.updatedAt },
    { key: "ready", label: "Ready for Pickup", desc: "Order is ready", time: null },
    { key: "assigned", label: "Rider Assigned", desc: "Delivery rider assigned", time: order.assignedAt },
    { key: "picked_up", label: "Picked Up", desc: "Rider has picked up your order", time: order.pickedUpAt || order.acceptedAt },
    { key: "in_transit", label: "Delivery is on the way", desc: "Your order is on the way", time: null },
    { key: "delivered", label: "Delivered", desc: "Order completed successfully", time: order.deliveredAt }
  ]

  const normalizedStatus = status.toLowerCase()
  let statusKey = normalizedStatus
  if (normalizedStatus === 'delivery' || normalizedStatus === 'done' || normalizedStatus === 'completed') {
    statusKey = 'delivered'
  }

  const statusIndex = stages.findIndex((s) => s.key === statusKey)

  return stages
    .map((stage, index) => {
      let itemClass = ""
      if (index < statusIndex) itemClass = "completed"
      else if (index === statusIndex) itemClass = "active"

      let timeText = ''
      if (stage.time) {
        const timeDate = stage.time?.toDate?.() || new Date(stage.time)
        timeText = timeDate.toLocaleString()
      } else if (itemClass === 'active') {
        timeText = 'Now'
      } else if (itemClass === '') {
        timeText = 'Pending'
      }

      return `
      <div class="timeline-item ${itemClass}">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <h4>${stage.label}</h4>
          <p>${stage.desc}</p>
          ${timeText ? `<small class="timeline-time">${timeText}</small>` : ''}
        </div>
      </div>
    `
    })
    .join("")
}

// ============================================================================
// RIDER INFO & LOCATION TRACKING
// ============================================================================

async function loadRiderInfo(orderId, riderId) {
  if (!db || !getDoc || !doc) {
    console.warn('⚠️ Cannot load rider info - Firebase not initialized')
    return
  }

  try {
    const riderDoc = await getDoc(doc(db, "riders", riderId))
    const riderElement = document.getElementById(`rider-${orderId}`)
    
    if (riderDoc.exists() && riderElement) {
      const rider = riderDoc.data()
      
      let hasLocation = rider.location && rider.location.latitude && rider.location.longitude
      
      let locationInfo = ''
      if (hasLocation) {
        const lastUpdate = rider.location.updatedAt?.toDate?.() || new Date()
        const timeSince = getTimeSince(lastUpdate)
        const locationDisplay = `${rider.location.latitude.toFixed(5)}, ${rider.location.longitude.toFixed(5)}`
        
        locationInfo = `
          <div style="
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 16px;
            background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
            border-radius: 24px;
            font-size: 14px;
            color: #155724;
            font-weight: 700;
            margin: 16px 0;
            border: 2px solid #28a745;
            box-shadow: 0 0 15px rgba(40, 167, 69, 0.3);
          ">
            <div style="
              width: 12px;
              height: 12px;
              background: #28a745;
              border-radius: 50%;
              animation: pulse-dot 1.5s ease-in-out infinite;
            "></div>
            <div style="flex: 1;">
              <div style="font-size: 15px;">📍 <span id="location-coords-${orderId}">${locationDisplay}</span></div>
              <div style="font-size: 12px; color: #28a745; margin-top: 2px;">Updated <span id="location-update-time-${orderId}">${timeSince}</span> • Auto-refresh every 5s</div>
            </div>
          </div>
          <button class="btn-live-map" onclick="showRiderMap('${orderId}', ${rider.location.latitude}, ${rider.location.longitude}, '${rider.name.replace(/'/g, "\\'")}')">
            <span style="font-size: 20px;">🗺️</span>
            <span>View Live Location on Map</span>
          </button>
        `
      } else {
        locationInfo = `
          <div style="margin-top: 12px; padding: 14px 16px; background: #fff3cd; border-radius: 10px; border-left: 4px solid #ffc107;">
            <p style="margin: 0; font-size: 14px; color: #856404;">
              ⚠️ Location not available yet
            </p>
          </div>
        `
      }
      
      riderElement.innerHTML = `
        <div style="display: grid; gap: 10px; margin-bottom: 12px;">
          <p style="margin: 0;"><strong>👤 Name:</strong> ${rider.name}</p>
          <p style="margin: 0;"><strong>📱 Phone:</strong> <a href="tel:${rider.phone}" style="color: #667eea; text-decoration: none; font-weight: 600;">${rider.phone}</a></p>
          <p style="margin: 0;"><strong>🛵 Vehicle:</strong> ${rider.vehicle}</p>
        </div>
        ${locationInfo}
        <div id="map-${orderId}" class="map-container"></div>
      `
    } else if (riderElement) {
      riderElement.innerHTML = '<p style="color: #999;">Rider information unavailable</p>'
    }
  } catch (error) {
    console.error('❌ Error loading rider info:', error)
    const riderElement = document.getElementById(`rider-${orderId}`)
    if (riderElement) {
      riderElement.innerHTML = '<p style="color: #dc3545;">⚠️ Unable to load rider information</p>'
    }
  }
}

async function updateRiderLocationQuietly(orderId, riderId) {
  if (!db || !getDoc || !doc) return

  try {
    const riderDoc = await getDoc(doc(db, "riders", riderId))
    
    if (riderDoc.exists()) {
      const rider = riderDoc.data()
      
      if (rider.location && rider.location.latitude && rider.location.longitude) {
        const locationCoordsElement = document.getElementById(`location-coords-${orderId}`)
        if (locationCoordsElement) {
          const locationDisplay = `${rider.location.latitude.toFixed(5)}, ${rider.location.longitude.toFixed(5)}`
          locationCoordsElement.style.opacity = '0.5'
          setTimeout(() => {
            locationCoordsElement.textContent = locationDisplay
            locationCoordsElement.style.opacity = '1'
          }, 150)
        }
        
        const lastUpdate = rider.location.updatedAt?.toDate?.() || new Date()
        const timeElement = document.getElementById(`location-update-time-${orderId}`)
        if (timeElement) {
          timeElement.textContent = getTimeSince(lastUpdate)
        }
        
        if (riderMaps[orderId]) {
          updateMapLocation(orderId, rider.location.latitude, rider.location.longitude)
        }
      }
    }
  } catch (error) {
    console.error('Error updating rider location:', error)
  }
}

function getTimeSince(date) {
  const seconds = Math.floor((new Date() - date) / 1000)
  
  if (seconds < 10) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 120) return '1 minute ago'
  if (seconds < 3600) return Math.floor(seconds / 60) + ' minutes ago'
  if (seconds < 7200) return '1 hour ago'
  if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours ago'
  return date.toLocaleDateString()
}

// ============================================================================
// MAP FUNCTIONS
// ============================================================================

window.showRiderMap = function(orderId, lat, lng, riderName) {
  const mapContainer = document.getElementById(`map-${orderId}`)
  const orderCard = document.querySelector(`[data-order-id="${orderId}"]`)
  
  if (!mapContainer) {
    console.error('Map container not found')
    return
  }
  
  if (typeof L === 'undefined') {
    console.error('Leaflet library not loaded')
    alert('Map library not loaded. Please refresh the page.')
    return
  }
  
  if (!mapContainer.classList.contains('active')) {
    mapContainer.classList.add('active')
    mapContainer.style.height = '400px'
    mapContainer.style.display = 'block'
    
    if (!riderMaps[orderId]) {
      initializeMap(orderId, lat, lng, riderName)
      if (orderCard) {
        startRealtimeTracking(orderId, orderCard)
      }
    } else {
      updateMapLocation(orderId, lat, lng)
      if (orderCard) {
        startRealtimeTracking(orderId, orderCard)
      }
    }
  } else {
    mapContainer.classList.remove('active')
    mapContainer.style.height = '0'
    mapContainer.style.display = 'none'
    stopRealtimeTracking(orderId)
  }
}

function initializeMap(orderId, lat, lng, riderName) {
  setTimeout(() => {
    const mapContainer = document.getElementById(`map-${orderId}`)
    if (!mapContainer || !mapContainer.classList.contains('active')) return
    
    try {
      const map = L.map(`map-${orderId}`).setView([lat, lng], 16)
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map)
      
      const riderIcon = L.divIcon({
        html: `
          <div style="position: relative;">
            <div style="
              width: 40px;
              height: 40px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              border: 3px solid white;
            ">
              <span style="font-size: 20px;">🛵</span>
            </div>
            <div style="
              position: absolute;
              top: -5px;
              right: -5px;
              width: 14px;
              height: 14px;
              background: #4caf50;
              border-radius: 50%;
              border: 2px solid white;
              animation: pulse-indicator 2s infinite;
            "></div>
          </div>
        `,
        className: 'rider-marker',
        iconSize: [40, 40],
        iconAnchor: [20, 40]
      })
      
      const marker = L.marker([lat, lng], { icon: riderIcon })
        .addTo(map)
        .bindPopup(`
          <div style="text-align: center; padding: 8px;">
            <strong style="font-size: 14px;">🛵 ${riderName}</strong><br>
            <span style="font-size: 12px; color: #4caf50;">● Live Location</span>
          </div>
        `)
      
      riderMaps[orderId] = { map, marker }
      riderMarkers[orderId] = marker
      
      setTimeout(() => {
        map.invalidateSize()
        console.log(`✓ Map initialized for order ${orderId}`)
      }, 300)
      
    } catch (error) {
      console.error('Error initializing map:', error)
      mapContainer.innerHTML = `<p style="padding: 20px; text-align: center; color: #dc3545;">Failed to load map: ${error.message}</p>`
    }
  }, 500)
}

function updateMapLocation(orderId, lat, lng) {
  if (!riderMaps[orderId] || !riderMarkers[orderId]) return
  
  try {
    const { map, marker } = riderMaps[orderId]
    const newLatLng = L.latLng(lat, lng)
    
    const currentLatLng = marker.getLatLng()
    animateMarker(marker, currentLatLng, newLatLng, 1000)
    
    map.panTo(newLatLng, { animate: true, duration: 1, easeLinearity: 0.25 })
    
    console.log(`📍 Map updated for order ${orderId}`)
  } catch (error) {
    console.error('Error updating map:', error)
  }
}

function animateMarker(marker, startLatLng, endLatLng, duration) {
  const startTime = Date.now()
  
  function update() {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3)
    
    const lat = startLatLng.lat + (endLatLng.lat - startLatLng.lat) * eased
    const lng = startLatLng.lng + (endLatLng.lng - startLatLng.lng) * eased
    
    marker.setLatLng([lat, lng])
    
    if (progress < 1) {
      requestAnimationFrame(update)
    }
  }
  
  update()
}

function startRealtimeTracking(orderId, orderElement) {
  if (!orderElement) return
  
  if (mapUpdateIntervals[orderId]) {
    clearInterval(mapUpdateIntervals[orderId])
  }
  
  mapUpdateIntervals[orderId] = setInterval(async () => {
    try {
      const riderId = orderElement.getAttribute('data-rider-id')
      if (!riderId || !db || !getDoc || !doc) return
      
      const riderDoc = await getDoc(doc(db, "riders", riderId))
      if (riderDoc.exists()) {
        const rider = riderDoc.data()
        if (rider.location && rider.location.latitude && rider.location.longitude) {
          updateMapLocation(orderId, rider.location.latitude, rider.location.longitude)
          
          const lastUpdate = rider.location.updatedAt?.toDate?.() || new Date()
          const timeElement = document.getElementById(`location-update-time-${orderId}`)
          if (timeElement) {
            timeElement.textContent = getTimeSince(lastUpdate)
          }
          
          const locationDisplay = `${rider.location.latitude.toFixed(5)}, ${rider.location.longitude.toFixed(5)}`
          const locationCoordsElement = document.getElementById(`location-coords-${orderId}`)
          if (locationCoordsElement) {
            locationCoordsElement.style.opacity = '0.5'
            setTimeout(() => {
              locationCoordsElement.textContent = locationDisplay
              locationCoordsElement.style.opacity = '1'
            }, 150)
          }
        }
      }
    } catch (error) {
      console.error('Error updating rider location:', error)
    }
  }, 5000)
  
  console.log(`🔄 Started real-time tracking for order ${orderId}`)
}

function stopRealtimeTracking(orderId) {
  if (mapUpdateIntervals[orderId]) {
    clearInterval(mapUpdateIntervals[orderId])
    delete mapUpdateIntervals[orderId]
    console.log(`⏹️ Stopped tracking for order ${orderId}`)
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

window.trackLiveLocation = function(orderId) {
  const trackingUrl = `rider-tracking.html?orderId=${orderId}`
  const trackingWindow = window.open(trackingUrl, 'tracking', 'width=1200,height=800,scrollbars=yes')
  
  if (!trackingWindow) {
    alert('Please disable your popup blocker to view live tracking')
  } else {
    trackingWindow.focus()
  }
}

window.downloadReceipt = async function(orderId) {
  try {
    let order = null
    
    if (db && getDoc && doc) {
      const orderDoc = await getDoc(doc(db, "orders", orderId))
      if (orderDoc.exists()) {
        order = { id: orderDoc.id, ...orderDoc.data() }
      }
    }
    
    if (!order) {
      const localOrders = JSON.parse(localStorage.getItem("orders") || "[]")
      order = localOrders.find(o => o.id === orderId)
    }
    
    if (!order) {
      alert('Order not found!')
      return
    }
    
    const orderDate = order.createdAt?.toDate?.() || new Date(order.createdAt)
    
    let pricingRows = `
      <tr><td>Subtotal</td><td></td><td>₱${(order.subtotal || 0).toFixed(2)}</td></tr>
    `
    
    if (order.discount && order.discount > 0) {
      const discountTiers = Math.floor(order.subtotal / 1000)
      pricingRows += `
        <tr style="color: #4caf50; font-weight: 600;">
          <td>Discount (${discountTiers} × 20%)</td>
          <td></td>
          <td>-₱${order.discount.toFixed(2)}</td>
        </tr>
        <tr>
          <td>After Discount</td>
          <td></td>
          <td>₱${(order.subtotalAfterDiscount || 0).toFixed(2)}</td>
        </tr>
      `
    }
    
    if (order.tax && order.tax > 0) {
      pricingRows += `
        <tr><td>Tax (12%)</td><td></td><td>₱${order.tax.toFixed(2)}</td></tr>
      `
    }
    
    pricingRows += `
      <tr><td>Delivery Fee</td><td></td><td>₱${(order.deliveryFee || 0).toFixed(2)}</td></tr>
    `
    
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - Order #${order.id.substring(0, 8)}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; padding: 40px; background: #f5f5f5; }
          .receipt { max-width: 600px; margin: 0 auto; background: white; padding: 40px; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
          .header { text-align: center; border-bottom: 2px dashed #333; padding-bottom: 20px; margin-bottom: 20px; }
          .header h1 { font-size: 28px; margin-bottom: 5px; }
          .info { margin: 20px 0; }
          .info p { margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px dotted #ccc; }
          th { background: #f5f5f5; }
          .total-row { border-top: 2px solid #333; font-size: 18px; font-weight: bold; }
          .savings { margin-top: 15px; padding: 15px; background: #d4edda; border-radius: 8px; text-align: center; color: #155724; font-weight: bold; }
          .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; border-top: 2px dashed #333; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <h1>🌹 Florist & Cake Shop</h1>
            <p>Thank you for your order!</p>
          </div>
          
          <div class="info">
            <p><strong>Order ID:</strong> #${order.id.substring(0, 8)}</p>
            <p><strong>Date:</strong> ${orderDate.toLocaleDateString()} ${orderDate.toLocaleTimeString()}</p>
            <p><strong>Customer:</strong> ${order.fullName || 'N/A'}</p>
            <p><strong>Status:</strong> ${getStatusLabel(order.status)}</p>
          </div>
          
          <table>
            <thead>
              <tr><th>Item</th><th>Qty</th><th>Price</th></tr>
            </thead>
            <tbody>
              ${(order.items || []).map(item => `
                <tr>
                  <td>${item.name || item.productName}</td>
                  <td>${item.quantity}</td>
                  <td>₱${((item.price * item.quantity) || 0).toFixed(2)}</td>
                </tr>
              `).join('')}
              <tr style="height: 10px;"><td colspan="3"></td></tr>
              ${pricingRows}
              <tr class="total-row">
                <td colspan="2">Total</td>
                <td>₱${(order.total || 0).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          
          ${order.discount && order.discount > 0 ? `
            <div class="savings">
              🎉 You saved ₱${order.discount.toFixed(2)} on this order!
            </div>
          ` : ''}
          
          <div class="footer">
            <p>For inquiries, please contact our customer service</p>
            <p>Thank you for shopping with us!</p>
          </div>
        </div>
      </body>
      </html>
    `
    
    const printWindow = window.open('', '_blank', 'width=800,height=600')
    printWindow.document.write(receiptHTML)
    printWindow.document.close()
    
    setTimeout(() => {
      printWindow.print()
    }, 500)
    
  } catch (error) {
    console.error('❌ Error generating receipt:', error)
    alert('Failed to generate receipt. Please try again.')
  }
}

// ============================================================================
// DELIVERY NOTIFICATIONS
// ============================================================================

function setupUserDeliveryNotifications(userId) {
  if (!userId || !onSnapshot || !db || !collection) {
    console.warn('⚠️ Cannot setup notifications - missing dependencies')
    return
  }
  
  if (deliveryNotificationsListener) {
    deliveryNotificationsListener()
  }

  try {
    const ordersRef = collection(db, "orders")
    const q = query(ordersRef, where("userId", "==", userId))

    let firstLoad = true

    deliveryNotificationsListener = onSnapshot(q, 
      (snapshot) => {
        if (firstLoad) {
          firstLoad = false
          return
        }

        snapshot.docChanges().forEach((change) => {
          if (change.type === "modified") {
            const order = { id: change.doc.id, ...change.doc.data() }
            
            if (order.status === "delivered" && !order.userNotified) {
              showUserDeliveryNotification(order)
              
              if (updateDoc && doc) {
                updateDoc(doc(db, "orders", order.id), {
                  userNotified: true,
                  userNotifiedAt: Timestamp.now()
                }).catch(err => console.error("Failed to mark as notified:", err))
              }
            }
          }
        })
        
        loadOrdersQuietly()
      },
      (error) => {
        console.error("❌ User notifications listener error:", error)
      }
    )
    
    console.log("✅ User delivery notifications active")
  } catch (error) {
    console.error('❌ Failed to setup notifications:', error)
  }
}

function showUserDeliveryNotification(order) {
  playNotificationSound()
  
  const notification = document.createElement('div')
  notification.className = 'user-delivery-notification'
  notification.innerHTML = `
    <div style="text-align: center;">
      <div style="font-size: 64px; margin-bottom: 16px; animation: bounceIn 0.8s;">🎉</div>
      <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 12px; color: #4CAF50;">
        Order Delivered!
      </h2>
      <p style="font-size: 16px; margin-bottom: 8px;">
        Your order <strong>#${order.id.substring(0, 8)}</strong> has been delivered successfully!
      </p>
      <p style="font-size: 14px; color: rgba(0,0,0,0.7); margin-bottom: 20px;">
        Delivered by: <strong>${order.riderName || 'Your rider'}</strong>
      </p>
      
      <div style="background: #f8f9fa; padding: 16px; border-radius: 12px; margin-bottom: 20px;">
        <p style="font-size: 13px; color: #666; margin-bottom: 12px;">
          How was your experience?
        </p>
        <div style="display: flex; gap: 12px; justify-content: center; margin-bottom: 12px;">
          ${[5, 4, 3, 2, 1].map(rating => `
            <button onclick="setRating(${rating}, '${order.id}')" 
                    class="rating-btn"
                    data-rating="${rating}"
                    data-order-id="${order.id}"
                    style="background: none; border: none; font-size: 32px; cursor: pointer; 
                           transition: transform 0.2s; padding: 4px; filter: grayscale(1) opacity(0.4);">
              ⭐
            </button>
          `).join('')}
        </div>
        <textarea id="feedback-text-${order.id}" 
                  placeholder="Tell us about your experience (optional)"
                  style="width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; 
                         font-family: inherit; font-size: 14px; resize: vertical; min-height: 80px;
                         margin-bottom: 12px; box-sizing: border-box;">
        </textarea>
        <button onclick="submitFeedback('${order.id}')" 
                id="submit-feedback-${order.id}"
                class="btn-submit-feedback"
                style="width: 100%; padding: 12px 20px; background: linear-gradient(135deg, #667eea, #764ba2); 
                       color: white; border: none; border-radius: 8px; font-weight: 700; 
                       cursor: pointer; font-size: 15px; transition: all 0.3s;">
          Submit Feedback
        </button>
      </div>
      
      <button onclick="closeNotificationModal()" 
              style="padding: 10px 24px; background: #e0e0e0; color: #333; border: none; 
                     border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px;">
        Close
      </button>
    </div>
  `
  
  notification.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 32px;
    background: white;
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    z-index: 10002;
    max-width: 500px;
    width: 90%;
    animation: scaleIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  `
  
  const backdrop = document.createElement('div')
  backdrop.className = 'notification-backdrop'
  backdrop.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    z-index: 10001;
    animation: fadeIn 0.3s;
  `
  backdrop.onclick = closeNotificationModal
  
  document.body.appendChild(backdrop)
  document.body.appendChild(notification)
}

function closeNotificationModal() {
  const notification = document.querySelector('.user-delivery-notification')
  const backdrop = document.querySelector('.notification-backdrop')
  if (notification) notification.remove()
  if (backdrop) backdrop.remove()
  selectedRating = 0
  selectedOrderId = ''
}

// ============================================================================
// FEEDBACK SYSTEM
// ============================================================================

window.setRating = function(rating, orderId) {
  selectedRating = rating
  selectedOrderId = orderId
  
  const buttons = document.querySelectorAll(`.rating-btn[data-order-id="${orderId}"]`)
  buttons.forEach((btn, index) => {
    const btnRating = 5 - index
    if (btnRating <= rating) {
      btn.style.transform = 'scale(1.2)'
      btn.style.filter = 'none'
    } else {
      btn.style.transform = 'scale(1)'
      btn.style.filter = 'grayscale(1) opacity(0.4)'
    }
  })
}

window.submitFeedback = async function(orderId) {
  const feedbackText = document.getElementById(`feedback-text-${orderId}`)?.value || ''
  const submitBtn = document.getElementById(`submit-feedback-${orderId}`)
  
  if (selectedRating === 0) {
    alert('⭐ Please select a rating first!')
    return
  }
  
  if (submitBtn) {
    submitBtn.disabled = true
    submitBtn.textContent = '⏳ Submitting...'
  }
  
  try {
    if (db && addDoc && updateDoc && collection && doc) {
      const feedbackData = {
        orderId: orderId,
        rating: selectedRating,
        comment: feedbackText,
        createdAt: Timestamp.now(),
        userId: currentUser?.uid || null,
        userEmail: currentUser?.email || null
      }
      
      await addDoc(collection(db, "feedback"), feedbackData)
      
      await updateDoc(doc(db, "orders", orderId), {
        hasFeedback: true,
        rating: selectedRating,
        feedbackComment: feedbackText,
        feedbackAt: Timestamp.now()
      })
    }
    
    try {
      const localOrders = JSON.parse(localStorage.getItem("orders") || "[]")
      const updatedOrders = localOrders.map(order => 
        order.id === orderId 
          ? { ...order, hasFeedback: true, rating: selectedRating, feedbackComment: feedbackText }
          : order
      )
      localStorage.setItem("orders", JSON.stringify(updatedOrders))
    } catch (e) {
      console.warn('Could not update localStorage:', e)
    }
    
    const notification = document.querySelector('.user-delivery-notification')
    if (notification) {
      notification.innerHTML = `
        <div style="text-align: center;">
          <div style="font-size: 64px; margin-bottom: 16px; animation: bounceIn 0.8s;">✅</div>
          <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 12px; color: #4CAF50;">
            Thank You!
          </h2>
          <p style="font-size: 16px; margin-bottom: 20px; color: #666;">
            Your feedback has been submitted successfully.
          </p>
          <button onclick="closeNotificationModal()" 
                  style="padding: 12px 32px; background: linear-gradient(135deg, #667eea, #764ba2); 
                         color: white; border: none; border-radius: 8px; cursor: pointer; 
                         font-weight: 700; font-size: 15px;">
            Close
          </button>
        </div>
      `
    }
    
    setTimeout(() => {
      closeNotificationModal()
      window.location.reload()
    }, 2000)
    
    selectedRating = 0
    selectedOrderId = ''
    
  } catch (error) {
    console.error('❌ Error submitting feedback:', error)
    alert('Failed to submit feedback. Please try again.')
    if (submitBtn) {
      submitBtn.disabled = false
      submitBtn.textContent = 'Submit Feedback'
    }
  }
}

function playNotificationSound() {
  try {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBi1+zPDTfS8GJHzM8OeLNgkXbL3q7Kj/')
    audio.volume = 0.4
    audio.play().catch(() => {})
  } catch (e) {
    console.warn('Could not play sound:', e)
  }
}

// ============================================================================
// REAL-TIME TRACKING SETUP
// ============================================================================

function setupRealtimeTracking() {
  loadOrders()
  
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
  
  refreshInterval = setInterval(() => {
    loadOrdersQuietly()
  }, 5000)
  
  console.log("✓ Real-time tracking initialized (5s updates)")
}

// ============================================================================
// STYLES
// ============================================================================

const style = document.createElement('style')
style.textContent = `
  .spinner {
    border: 4px solid #f3f3f3;
    border-top: 4px solid #667eea;
    border-radius: 50%;
    width: 50px;
    height: 50px;
    animation: spin 1s linear infinite;
    margin: 0 auto;
  }
  
  .spinner-small {
    border: 3px solid #f3f3f3;
    border-top: 3px solid #667eea;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    animation: spin 1s linear infinite;
    margin: 0 auto 10px;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes pulse-dot {
    0% { box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.7); }
    70% { box-shadow: 0 0 0 10px rgba(40, 167, 69, 0); }
    100% { box-shadow: 0 0 0 0 rgba(40, 167, 69, 0); }
  }
  
  @keyframes pulse-indicator {
    0%, 100% { 
      transform: scale(1);
      opacity: 1;
    }
    50% { 
      transform: scale(1.2);
      opacity: 0.7;
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
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }
  
  @keyframes scaleIn {
    0% {
      transform: translate(-50%, -50%) scale(0.8);
      opacity: 0;
    }
    100% {
      transform: translate(-50%, -50%) scale(1);
      opacity: 1;
    }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .map-container {
    margin-top: 16px;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    display: none;
    height: 0;
    transition: height 0.3s ease;
    background: #f5f5f5;
  }
  
  .map-container.active {
    display: block;
  }
  
  .rider-marker {
    animation: bounce 2s ease-in-out infinite;
  }
  
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }
  
  .btn-live-map {
    width: 100%;
    padding: 14px 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    font-weight: 700;
    font-size: 15px;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  }
  
  .btn-live-map:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
  }
  
  .order-item-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #f0f0f0;
  }
  
  .order-item-row:last-child {
    border-bottom: none;
  }
  
  [id^="location-coords-"] {
    transition: opacity 0.3s ease;
  }
  
  .leaflet-marker-icon {
    transition: all 0.3s ease !important;
  }
  
  .rating-btn:hover {
    transform: scale(1.3) !important;
  }
  
  .btn-submit-feedback {
    transition: all 0.3s ease;
  }
  
  .btn-submit-feedback:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  }
  
  .btn-submit-feedback:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
  }
  
  .loading-rider {
    text-align: center;
    padding: 20px;
    color: #666;
  }
  
  .order-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 2px solid #f0f0f0;
  }
  
  .order-id {
    font-size: 18px;
    font-weight: 700;
    color: #333;
    margin-bottom: 4px;
  }
  
  .order-date {
    font-size: 13px;
    color: #666;
  }
  
  .order-items {
    margin: 16px 0;
    padding: 16px;
    background: #f8f9fa;
    border-radius: 8px;
  }
  
  .order-total {
    display: flex;
    justify-content: space-between;
    padding: 16px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    border-radius: 8px;
    font-size: 18px;
    font-weight: 700;
    margin-top: 16px;
  }
`
document.head.appendChild(style)

// ============================================================================
// INITIALIZATION
// ============================================================================

const breadcrumbContainer = document.getElementById("breadcrumb-container")
if (breadcrumbContainer && typeof renderBreadcrumb !== 'undefined') {
  breadcrumbContainer.innerHTML = renderBreadcrumb([
    { label: "Home", link: "index.html" },
    { label: "Track Orders", link: null },
  ])
}

function startOrderTracking() {
  initializeAuth().then(user => {
    if (user) {
      setupRealtimeTracking()
      setupUserDeliveryNotifications(user.uid)
      console.log("✅ Order tracking system initialized")
      console.log(`📊 User: ${user.email || user.displayName}`)
      console.log(`🔄 Real-time updates every 5 seconds`)
      console.log(`🔔 Delivery notifications: ${onSnapshot && db ? 'ACTIVE' : 'DISABLED (Firebase unavailable)'}`)
    }
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startOrderTracking)
} else {
  setTimeout(startOrderTracking, 500)
}

// ============================================================================
// CLEANUP
// ============================================================================

window.addEventListener('beforeunload', () => {
  if (refreshInterval) clearInterval(refreshInterval)
  Object.keys(mapUpdateIntervals).forEach(orderId => stopRealtimeTracking(orderId))
  if (deliveryNotificationsListener) {
    deliveryNotificationsListener()
    console.log("✅ Cleaned up listeners")
  }
})

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && currentUser) {
    loadOrdersQuietly()
  }
})

// Make functions globally accessible
window.closeNotificationModal = closeNotificationModal

console.log("✅ Order tracking module loaded - waiting for initialization")