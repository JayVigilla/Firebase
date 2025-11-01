// payment.js - Enhanced with Tax, Discount, and GPS Coordinates

import { renderBreadcrumb } from "./components.js"
import { db, doc, addDoc, collection, getDoc } from "./firebase-config.js"

// Render breadcrumb
const breadcrumbContainer = document.getElementById("breadcrumb-container")
if (breadcrumbContainer) {
  breadcrumbContainer.innerHTML = renderBreadcrumb([
    { label: "Home", link: "index.html" },
    { label: "Cart", link: "cart.html" },
    { label: "Checkout", link: "checkout.html" },
    { label: "Payment", link: null },
  ])
}

const DELIVERY_FEE = 100
const TAX_RATE = 0.12
const DISCOUNT_THRESHOLD = 1000
const DISCOUNT_RATE = 0.20

// Check if user is logged in
const user = JSON.parse(localStorage.getItem("currentUser"))
if (!user) {
  alert("Please login to continue")
  window.location.href = "login.html"
}

// Check if checkout data exists
const checkoutData = JSON.parse(localStorage.getItem("checkoutData"))
if (!checkoutData) {
  alert("Please complete checkout first")
  window.location.href = "checkout.html"
}

function calculateDiscount(subtotal) {
  const discountTiers = Math.floor(subtotal / DISCOUNT_THRESHOLD)
  return discountTiers * DISCOUNT_THRESHOLD * DISCOUNT_RATE
}

function getPlaceholderImage(productName) {
  const colors = ["%23FF69B4", "%23FFD700", "%23FF6347", "%2387CEEB", "%2398FB98", "%23DDA0DD"]
  const colorIndex = (productName || "").length % colors.length
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='${colors[colorIndex]}' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='20' fill='white' text-anchor='middle' dy='.3em'%3E${encodeURIComponent(productName || "Product")}%3C/text%3E%3C/svg%3E`
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

  return getPlaceholderImage(product.name)
}

// Validate image file
function validateImageFile(file) {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/jfif']
  const validExtensions = ['jpg', 'jpeg', 'png', 'jfif']
  const maxSize = 5 * 1024 * 1024 // 5MB
  
  // Check file type
  if (!validTypes.includes(file.type.toLowerCase())) {
    const extension = file.name.split('.').pop().toLowerCase()
    if (!validExtensions.includes(extension)) {
      return {
        valid: false,
        message: 'Invalid file type. Please upload only JPEG, JPG, PNG, or JFIF images.'
      }
    }
  }
  
  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      message: 'File size too large. Please upload an image smaller than 5MB.'
    }
  }
  
  return { valid: true }
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
        console.log("Firestore unavailable, using sample products:", firestoreError.message)
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
            <img src="${imageUrl}" alt="${product.name}" class="item-image" onerror="this.src='${getPlaceholderImage(product.name)}'">
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
    ${discount > 0 ? `
    <div style="background: linear-gradient(135deg, #4caf50, #45a049); color: white; padding: 12px; border-radius: 8px; text-align: center; font-weight: 600; margin-top: 16px;">
      You saved ₱${discount.toFixed(2)}!
    </div>
    ` : ''}
  `
  
  document.querySelector(".summary-totals").innerHTML = summaryHTML
  document.getElementById("payment-amount").textContent = `₱${total.toFixed(2)}`

  // Store calculation data
  window.orderCalculation = {
    subtotal,
    discount,
    subtotalAfterDiscount,
    tax,
    deliveryFee: DELIVERY_FEE,
    total
  }
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

// Convert file to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result)
    reader.onerror = error => reject(error)
  })
}

// Add real-time validation to file input
const receiptImageInput = document.getElementById("receiptImage")
if (receiptImageInput) {
  receiptImageInput.addEventListener("change", (e) => {
    const file = e.target.files[0]
    if (file) {
      const validation = validateImageFile(file)
      if (!validation.valid) {
        alert(validation.message)
        e.target.value = '' // Clear the input
        return
      }
      
      // Show file info
      const existingInfo = document.querySelector('.file-info')
      if (existingInfo) {
        existingInfo.remove()
      }
      
      const info = document.createElement('div')
      info.className = 'file-info'
      info.style.cssText = 'margin-top: 8px; padding: 8px; background: #e8f5e9; border-radius: 4px; font-size: 14px; color: #2e7d32;'
      info.innerHTML = `✓ ${file.name} (${(file.size / 1024).toFixed(1)} KB)`
      e.target.parentElement.appendChild(info)
    }
  })
}

// Handle payment form submission
document.getElementById("payment-form").addEventListener("submit", async (e) => {
  e.preventDefault()

  const receiptNumber = document.getElementById("receiptNumber").value
  const receiptImageInput = document.getElementById("receiptImage")

  if (!receiptImageInput.files || !receiptImageInput.files[0]) {
    alert("Please upload a receipt screenshot")
    return
  }

  // Validate the uploaded file
  const file = receiptImageInput.files[0]
  const validation = validateImageFile(file)
  if (!validation.valid) {
    alert(validation.message)
    return
  }

  const submitButton = e.target.querySelector('button[type="submit"]')
  submitButton.disabled = true
  submitButton.textContent = "Processing..."

  try {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]")
    
    // Calculate subtotal with proper product data
    let subtotal = 0
    const enhancedCartItems = []
    
    for (const item of cart) {
      try {
        let product = null
        
        try {
          const productDoc = await getDoc(doc(db, "products", item.productId))
          if (productDoc.exists()) {
            product = { id: productDoc.id, ...productDoc.data() }
          }
        } catch (firestoreError) {
          console.log("Firestore unavailable for product fetch:", firestoreError.message)
        }
        
        if (!product) {
          const sampleProducts = getSampleProducts()
          product = sampleProducts.find((p) => p.id === item.productId)
        }
        
        if (product) {
          const itemTotal = product.price * item.quantity
          subtotal += itemTotal
          
          enhancedCartItems.push({
            productId: item.productId,
            productName: product.name,
            name: product.name,
            price: product.price,
            quantity: item.quantity,
            total: itemTotal
          })
        }
      } catch (error) {
        console.error("Error processing cart item:", error)
      }
    }
    
    // Use the calculation from loadOrderSummary if available
    const calculation = window.orderCalculation || {
      subtotal: subtotal,
      discount: calculateDiscount(subtotal),
      subtotalAfterDiscount: subtotal - calculateDiscount(subtotal),
      tax: (subtotal - calculateDiscount(subtotal)) * TAX_RATE,
      deliveryFee: DELIVERY_FEE,
      total: (subtotal - calculateDiscount(subtotal)) + ((subtotal - calculateDiscount(subtotal)) * TAX_RATE) + DELIVERY_FEE
    }

    let receiptImageUrl = ""

    // Convert receipt image to base64
    try {
      receiptImageUrl = await fileToBase64(file)
      console.log("Receipt converted to base64 successfully")
    } catch (error) {
      console.error("Error converting receipt:", error)
      alert("Error processing receipt image. Please try again.")
      submitButton.disabled = false
      submitButton.textContent = "Confirm Payment"
      return
    }

    // Create order object with all pricing details and GPS coordinates
    const orderData = {
      userId: user.uid || user.id,
      fullName: checkoutData.fullName,
      email: checkoutData.email,
      phone: checkoutData.phone,
      address: checkoutData.address,
      city: checkoutData.city,
      notes: checkoutData.notes,
      // Add GPS coordinates for delivery location
      deliveryLat: checkoutData.deliveryLat || null,
      deliveryLng: checkoutData.deliveryLng || null,
      deliveryLocation: checkoutData.deliveryLocation || null,
      items: enhancedCartItems,
      subtotal: calculation.subtotal,
      discount: calculation.discount,
      subtotalAfterDiscount: calculation.subtotalAfterDiscount,
      tax: calculation.tax,
      taxRate: TAX_RATE,
      deliveryFee: calculation.deliveryFee,
      total: calculation.total,
      paymentMethod: "GCash",
      receiptNumber: receiptNumber,
      receiptImageUrl: receiptImageUrl,
      status: "pending",
      createdAt: new Date().toISOString(),
    }

    console.log("Order data with GPS coordinates:", {
      lat: orderData.deliveryLat,
      lng: orderData.deliveryLng,
      location: orderData.deliveryLocation
    })

    // Try to save to Firestore
    try {
      const docRef = await addDoc(collection(db, "orders"), orderData)
      orderData.id = docRef.id
      console.log("Order saved to Firestore successfully:", docRef.id)
    } catch (firestoreError) {
      console.warn("Firestore save failed, using localStorage fallback:", firestoreError.message)
      // Fallback: Save to localStorage
      const orders = JSON.parse(localStorage.getItem("orders") || "[]")
      orderData.id = "order_" + Date.now()
      orders.push(orderData)
      localStorage.setItem("orders", JSON.stringify(orders))
      console.log("Order saved to localStorage:", orderData.id)
    }

    // Save order to localStorage for confirmation page
    localStorage.setItem("lastOrder", JSON.stringify(orderData))

    // Clear cart and checkout data
    localStorage.removeItem("cart")
    localStorage.removeItem("checkoutData")

    // Redirect to confirmation page
    window.location.href = "confirmation.html"
  } catch (error) {
    console.error("Error processing payment:", error)
    alert("Error processing payment: " + error.message + "\nPlease try again.")
    submitButton.disabled = false
    submitButton.textContent = "Confirm Payment"
  }
})

// Initialize
loadOrderSummary()