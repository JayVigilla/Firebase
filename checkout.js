import { renderBreadcrumb } from "./components.js"
import { db, doc, getDoc } from "./firebase-config.js"

// Render breadcrumb
const breadcrumbContainer = document.getElementById("breadcrumb-container")
if (breadcrumbContainer) {
  breadcrumbContainer.innerHTML = renderBreadcrumb([
    { label: "Home", link: "index.html" },
    { label: "Cart", link: "cart.html" },
    { label: "Checkout", link: null },
  ])
}

const DELIVERY_FEE = 100
const TAX_RATE = 0.12
const DISCOUNT_THRESHOLD = 1000
const DISCOUNT_RATE = 0.20

// Predefined locations in Cebu with accurate GPS coordinates (from Firebase data)
const PREDEFINED_LOCATIONS = [
  // Lapu-Lapu City - Detailed Barangays (Based on Firebase: 10.3157, 123.8854)
  { name: "Lapu-Lapu City - Poblacion (City Hall Area)", city: "Lapu-Lapu City", lat: 10.3105, lng: 123.8854 },
  { name: "Lapu-Lapu City - Mactan (Main Area)", city: "Lapu-Lapu City", lat: 10.3157, lng: 123.8854 },
  { name: "Lapu-Lapu City - Basak", city: "Lapu-Lapu City", lat: 10.2983, lng: 123.9729 },
  { name: "Lapu-Lapu City - Marigondon", city: "Lapu-Lapu City", lat: 10.2989, lng: 123.9894 },
  { name: "Lapu-Lapu City - Mactan Airport Area", city: "Lapu-Lapu City", lat: 10.3075, lng: 123.9792 },
  { name: "Lapu-Lapu City - Punta Engaño", city: "Lapu-Lapu City", lat: 10.3098, lng: 124.0153 },
  { name: "Lapu-Lapu City - Agus", city: "Lapu-Lapu City", lat: 10.3247, lng: 123.9562 },
  { name: "Lapu-Lapu City - Ibo", city: "Lapu-Lapu City", lat: 10.3195, lng: 123.9450 },
  { name: "Lapu-Lapu City - Pusok", city: "Lapu-Lapu City", lat: 10.3265, lng: 123.9683 },
  { name: "Lapu-Lapu City - Pajac", city: "Lapu-Lapu City", lat: 10.3128, lng: 123.9324 },
  { name: "Lapu-Lapu City - Gun-ob", city: "Lapu-Lapu City", lat: 10.3042, lng: 123.9158 },
  { name: "Lapu-Lapu City - Maribago", city: "Lapu-Lapu City", lat: 10.3053, lng: 123.9951 },
  { name: "Lapu-Lapu City - Canjulao", city: "Lapu-Lapu City", lat: 10.2925, lng: 123.9583 },
  { name: "Lapu-Lapu City - Buaya", city: "Lapu-Lapu City", lat: 10.2864, lng: 123.9825 },
  { name: "Lapu-Lapu City - Talima", city: "Lapu-Lapu City", lat: 10.3318, lng: 123.9847 },
  
  // Cebu City - Major Areas
  { name: "Cebu City - Downtown (Colon)", city: "Cebu City", lat: 10.2939, lng: 123.9026 },
  { name: "Cebu City - IT Park", city: "Cebu City", lat: 10.3200, lng: 123.8950 },
  { name: "Cebu City - Ayala Center", city: "Cebu City", lat: 10.3181, lng: 123.9059 },
  { name: "Cebu City - SM City Cebu", city: "Cebu City", lat: 10.3117, lng: 123.9188 },
  { name: "Cebu City - Fuente Osmeña", city: "Cebu City", lat: 10.3122, lng: 123.8963 },
  { name: "Cebu City - Capitol Area", city: "Cebu City", lat: 10.3207, lng: 123.8922 },
  { name: "Cebu City - Mabolo", city: "Cebu City", lat: 10.3283, lng: 123.9108 },
  { name: "Cebu City - Banilad", city: "Cebu City", lat: 10.3367, lng: 123.9172 },
  { name: "Cebu City - Talamban", city: "Cebu City", lat: 10.3453, lng: 123.9194 },
  { name: "Cebu City - Lahug", city: "Cebu City", lat: 10.3289, lng: 123.8978 },
  
  // Mandaue City
  { name: "Mandaue City - Centro", city: "Mandaue City", lat: 10.3237, lng: 123.9226 },
  { name: "Mandaue City - Parkmall Area", city: "Mandaue City", lat: 10.3459, lng: 123.9511 },
  { name: "Mandaue City - Alang-Alang", city: "Mandaue City", lat: 10.3383, lng: 123.9425 },
  { name: "Mandaue City - Basak", city: "Mandaue City", lat: 10.3156, lng: 123.9392 },
  { name: "Mandaue City - North Reclamation", city: "Mandaue City", lat: 10.3508, lng: 123.9597 },
  
  // Other Cities/Municipalities
  { name: "Cordova - Poblacion", city: "Cordova", lat: 10.2533, lng: 123.9500 },
  { name: "Cordova - Gabi", city: "Cordova", lat: 10.2611, lng: 123.9625 },
  { name: "Talisay City - Tabunok", city: "Talisay City", lat: 10.2450, lng: 123.8490 },
  { name: "Talisay City - San Isidro", city: "Talisay City", lat: 10.2617, lng: 123.8514 },
  { name: "Consolacion - Poblacion", city: "Consolacion", lat: 10.3762, lng: 123.9574 },
  { name: "Liloan - Poblacion", city: "Liloan", lat: 10.3894, lng: 123.9879 },
  { name: "Compostela - Poblacion", city: "Compostela", lat: 10.4525, lng: 124.0142 },
  { name: "Minglanilla - Poblacion", city: "Minglanilla", lat: 10.2458, lng: 123.7967 },
  { name: "Naga City - Poblacion", city: "Naga City", lat: 10.2086, lng: 123.7614 }
]

// Check if user is logged in
const user = JSON.parse(localStorage.getItem("currentUser"))
if (!user) {
  alert("Please login to continue")
  window.location.href = "login.html"
}

function calculateDiscount(subtotal) {
  const discountTiers = Math.floor(subtotal / DISCOUNT_THRESHOLD)
  return discountTiers * DISCOUNT_THRESHOLD * DISCOUNT_RATE
}

function getProductImageUrl(product) {
  if (product.image && typeof product.image === "string" && product.image.length > 0) {
    if (product.image.startsWith("data:") || product.image.startsWith("http")) {
      return product.image
    }
  }

  if (product.images && Array.isArray(product.images) && product.images.length > 0) {
    const firstImage = product.images[0]
    if (
      firstImage &&
      typeof firstImage === "string" &&
      (firstImage.startsWith("data:") || firstImage.startsWith("http"))
    ) {
      return firstImage
    }
  }

  const colors = ["%23FF69B4", "%23FFD700", "%23FF6347", "%2387CEEB", "%2398FB98", "%23DDA0DD"]
  const colorIndex = (product.name || "").length % colors.length
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='${colors[colorIndex]}' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='20' fill='white' text-anchor='middle' dy='.3em'%3E${encodeURIComponent(product.name || "Product")}%3C/text%3E%3C/svg%3E`
}

// Load order summary
async function loadOrderSummary() {
  const cart = JSON.parse(localStorage.getItem("cart") || "[]")

  if (cart.length === 0) {
    alert("Your cart is empty")
    window.location.href = "shop.html"
    return
  }

  const orderItemsContainer = document.getElementById("order-items")
  let subtotal = 0
  orderItemsContainer.innerHTML = ""
  let itemIndex = 1

  for (const item of cart) {
    try {
      let product = null

      try {
        const productDoc = await getDoc(doc(db, "products", item.productId))
        if (productDoc.exists()) {
          product = { id: productDoc.id, ...productDoc.data() }
        }
      } catch (firestoreError) {
        console.log("[v0] Firestore unavailable, using sample products")
      }

      if (!product) {
        const sampleProducts = getSampleProducts()
        product = sampleProducts.find((p) => p.id === item.productId)
      }

      if (product) {
        const itemTotal = product.price * item.quantity
        subtotal += itemTotal

        const imageUrl = getProductImageUrl(product)

        orderItemsContainer.innerHTML += `
          <div class="order-item">
            <div class="item-index">${itemIndex}</div>
            <img src="${imageUrl}" alt="${product.name}" class="item-image" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27400%27 height=%27400%27%3E%3Crect fill=%27%23cccccc%27 width=%27400%27 height=%27400%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 font-size=%2724%27 fill=%27white%27 text-anchor=%27middle%27 dy=%27.3em%27%3EProduct%3C/text%3E%3C/svg%3E'">
            <div class="item-details">
              <div class="item-name">${product.name}</div>
              <div class="item-quantity">Qty: ${item.quantity}</div>
            </div>
            <div class="item-price">₱${itemTotal.toFixed(2)}</div>
          </div>
        `
        itemIndex++
      }
    } catch (error) {
      console.error("Error loading product:", error)
    }
  }

  // Calculate discount, tax, and total
  const discount = calculateDiscount(subtotal)
  const subtotalAfterDiscount = subtotal - discount
  const tax = subtotalAfterDiscount * TAX_RATE
  const total = subtotalAfterDiscount + tax + DELIVERY_FEE

  // Display summary with discount and tax breakdown
  const summaryHTML = `
    <div class="summary-row">
      <span>Subtotal:</span>
      <span>₱${subtotal.toFixed(2)}</span>
    </div>
    ${discount > 0 ? `
    <div class="summary-row" style="color: #4caf50; font-weight: 600;">
      <span>Discount (${Math.floor(subtotal / DISCOUNT_THRESHOLD)} × 20%):</span>
      <span>-₱${discount.toFixed(2)}</span>
    </div>
    <div class="summary-row">
      <span>After Discount:</span>
      <span>₱${subtotalAfterDiscount.toFixed(2)}</span>
    </div>
    ` : ''}
    <div class="summary-row">
      <span>Tax (12%):</span>
      <span>₱${tax.toFixed(2)}</span>
    </div>
    <div class="summary-row">
      <span>Delivery Fee:</span>
      <span>₱${DELIVERY_FEE.toFixed(2)}</span>
    </div>
    <div class="summary-row total">
      <span>Total:</span>
      <span>₱${total.toFixed(2)}</span>
    </div>
  `
  
  document.querySelector(".summary-totals").innerHTML = summaryHTML

  // Store calculation data
  sessionStorage.setItem("orderCalculation", JSON.stringify({
    subtotal,
    discount,
    subtotalAfterDiscount,
    tax,
    deliveryFee: DELIVERY_FEE,
    total
  }))
}

function getSampleProducts() {
  return [
    {
      id: "1",
      name: "Chocolate Dream Cake",
      price: 850,
      image:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23D2691E' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='white' text-anchor='middle' dy='.3em'%3EChocolate Cake%3C/text%3E%3C/svg%3E",
    },
    {
      id: "2",
      name: "Strawberry Delight",
      price: 950,
      image:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23FFB6C1' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='%23FF1493' text-anchor='middle' dy='.3em'%3EStrawberry Cake%3C/text%3E%3C/svg%3E",
    },
    {
      id: "3",
      name: "Vanilla Classic",
      price: 750,
      image:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23FFFACD' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='%23DAA520' text-anchor='middle' dy='.3em'%3EVanilla Cake%3C/text%3E%3C/svg%3E",
    },
    {
      id: "4",
      name: "Rose Bouquet",
      price: 1200,
      image:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23FF0000' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='white' text-anchor='middle' dy='.3em'%3ERose Bouquet%3C/text%3E%3C/svg%3E",
    },
    {
      id: "5",
      name: "Tulip Garden",
      price: 1100,
      image:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23FF69B4' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='white' text-anchor='middle' dy='.3em'%3ETulip Bouquet%3C/text%3E%3C/svg%3E",
    },
    {
      id: "6",
      name: "Sunflower Sunshine",
      price: 900,
      image:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23FFD700' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='%23FF8C00' text-anchor='middle' dy='.3em'%3ESunflower Bouquet%3C/text%3E%3C/svg%3E",
    },
  ]
}

// Add location selector to the form
function setupLocationSelector() {
  const cityGroup = document.querySelector('.form-group:has(#city)')
  
  // Create location selector HTML
  const locationSelectorHTML = `
    <div class="form-group">
      <label for="location-selector">Quick Select Location *</label>
      <select id="location-selector" class="form-control">
        <option value="">-- Select a location --</option>
        ${PREDEFINED_LOCATIONS.map(loc => 
          `<option value="${loc.name}" data-city="${loc.city}" data-lat="${loc.lat}" data-lng="${loc.lng}">
            ${loc.name}
          </option>`
        ).join('')}
      </select>
      <small style="color: #666; margin-top: 4px; display: block;">
        Or enter your address and city manually below
      </small>
    </div>
  `
  
  // Insert before the address field
  const addressGroup = document.querySelector('.form-group:has(#address)')
  addressGroup.insertAdjacentHTML('beforebegin', locationSelectorHTML)
  
  // Handle location selection
  document.getElementById('location-selector').addEventListener('change', (e) => {
    const selectedOption = e.target.selectedOptions[0]
    
    if (selectedOption.value) {
      const city = selectedOption.dataset.city
      const lat = selectedOption.dataset.lat
      const lng = selectedOption.dataset.lng
      const locationName = selectedOption.value
      
      // Auto-fill city
      document.getElementById('city').value = city
      
      // Store GPS coordinates temporarily
      window.selectedLocationGPS = {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        name: locationName
      }
      
      // Show success indicator
      const cityInput = document.getElementById('city')
      cityInput.style.borderColor = '#4caf50'
      cityInput.style.backgroundColor = '#f1f8f4'
      
      setTimeout(() => {
        cityInput.style.borderColor = ''
        cityInput.style.backgroundColor = ''
      }, 2000)
      
      console.log('✓ Location selected:', locationName, `[${lat}, ${lng}]`)
    }
  })
}

// Pre-fill form with user data
if (user) {
  document.getElementById("fullName").value = user.fullName || ""
  document.getElementById("phone").value = user.phone || ""
  document.getElementById("email").value = user.email || ""
}

// Handle checkout form submission
document.getElementById("checkout-form").addEventListener("submit", async (e) => {
  e.preventDefault()

  const address = document.getElementById("address").value
  const city = document.getElementById("city").value
  const submitBtn = e.target.querySelector('button[type="submit"]')
  
  // Check if location was selected
  if (!window.selectedLocationGPS) {
    const confirmed = confirm(
      `You haven't selected a location from the dropdown.\n\n` +
      `Without GPS coordinates, the rider may have difficulty finding your address.\n\n` +
      `Do you want to continue anyway?`
    )
    
    if (!confirmed) {
      return
    }
    
    // Use a default location for Cebu City if no selection
    window.selectedLocationGPS = {
      lat: 10.3157,
      lng: 123.8854,
      name: `${city} (approximate)`
    }
  }

  const checkoutData = {
    fullName: document.getElementById("fullName").value,
    phone: document.getElementById("phone").value,
    email: document.getElementById("email").value,
    address: address,
    city: city,
    notes: document.getElementById("notes").value,
    // Add GPS coordinates
    deliveryLat: window.selectedLocationGPS.lat,
    deliveryLng: window.selectedLocationGPS.lng,
    deliveryLocation: window.selectedLocationGPS.name
  }

  localStorage.setItem("checkoutData", JSON.stringify(checkoutData))
  
  console.log('✓ Checkout data saved with GPS:', checkoutData)
  
  window.location.href = "payment.html"
})

// Initialize
loadOrderSummary()
setupLocationSelector()

console.log('✓ Checkout loaded with', PREDEFINED_LOCATIONS.length, 'predefined locations')