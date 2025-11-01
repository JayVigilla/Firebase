import { renderBreadcrumb } from "./components.js"
import { db, doc, getDoc } from "./firebase-config.js"

// Render breadcrumb
const breadcrumbContainer = document.getElementById("breadcrumb-container")
if (breadcrumbContainer) {
  breadcrumbContainer.innerHTML = renderBreadcrumb([
    { label: "Home", link: "index.html" },
    { label: "Cart", link: null },
  ])
}

const DELIVERY_FEE = 100
const TAX_RATE = 0.12 // 12% tax
const DISCOUNT_THRESHOLD = 1000 // Every ₱1000
const DISCOUNT_RATE = 0.20 // 20% discount

// Calculate discount based on subtotal
function calculateDiscount(subtotal) {
  const discountTiers = Math.floor(subtotal / DISCOUNT_THRESHOLD)
  const discountAmount = discountTiers * DISCOUNT_THRESHOLD * DISCOUNT_RATE
  return discountAmount
}

// Load cart items
async function loadCart() {
  const cart = JSON.parse(localStorage.getItem("cart") || "[]")

  if (cart.length === 0) {
    displayEmptyCart()
    return
  }

  const cartItemsContainer = document.getElementById("cart-items")
  cartItemsContainer.innerHTML = ""

  let subtotal = 0

  for (const item of cart) {
    try {
      const productDoc = await getDoc(doc(db, "products", item.productId))
      let product

      if (productDoc.exists()) {
        product = { id: productDoc.id, ...productDoc.data() }
      } else {
        // Use sample data
        const sampleProducts = getSampleProducts()
        product = sampleProducts.find((p) => p.id === item.productId)
      }

      if (product) {
        const itemTotal = product.price * item.quantity
        subtotal += itemTotal

        cartItemsContainer.innerHTML += `
          <div class="cart-item">
            <img src="${product.image}" alt="${product.name}" class="cart-item-image">
            <div class="cart-item-info">
              <h3 class="cart-item-name">${product.name}</h3>
              <p class="cart-item-price">₱${product.price.toFixed(2)}</p>
              <div class="cart-item-controls">
                <button class="cart-quantity-btn" onclick="updateQuantity('${item.productId}', -1)">-</button>
                <span class="cart-quantity">${item.quantity}</span>
                <button class="cart-quantity-btn" onclick="updateQuantity('${item.productId}', 1)">+</button>
                <button class="remove-btn" onclick="removeFromCart('${item.productId}')">Remove</button>
              </div>
              <p style="margin-top: 8px; font-weight: 600;">Item Total: ₱${itemTotal.toFixed(2)}</p>
            </div>
          </div>
        `
      }
    } catch (error) {
      console.error("Error loading cart item:", error)
    }
  }

  updateSummary(subtotal)
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

function updateSummary(subtotal) {
  // Calculate discount
  const discount = calculateDiscount(subtotal)
  const subtotalAfterDiscount = subtotal - discount
  
  // Calculate tax on discounted amount
  const tax = subtotalAfterDiscount * TAX_RATE
  
  // Calculate final total
  const total = subtotalAfterDiscount + tax + DELIVERY_FEE

  // Display breakdown
  const summaryHTML = `
    <div class="summary-row">
      <span>Subtotal:</span>
      <span>₱${subtotal.toFixed(2)}</span>
    </div>
    ${discount > 0 ? `
    <div class="summary-row discount-row">
      <span>Discount (${Math.floor(subtotal / DISCOUNT_THRESHOLD)} × 20%):</span>
      <span class="discount-amount">-₱${discount.toFixed(2)}</span>
    </div>
    <div class="summary-row">
      <span>Subtotal after discount:</span>
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
    <div class="savings-badge">
      🎉 You saved ₱${discount.toFixed(2)}!
    </div>
    ` : ''}
    ${subtotal < DISCOUNT_THRESHOLD && subtotal > 0 ? `
    <div class="discount-info">
      💡 Spend ₱${(DISCOUNT_THRESHOLD - subtotal).toFixed(2)} more to get 20% discount!
    </div>
    ` : ''}
  `
  
  document.getElementById("cart-summary-details").innerHTML = summaryHTML
  
  // Store calculation for checkout
  const cartData = {
    subtotal,
    discount,
    subtotalAfterDiscount,
    tax,
    deliveryFee: DELIVERY_FEE,
    total
  }
  
  sessionStorage.setItem("cartCalculation", JSON.stringify(cartData))
}

function displayEmptyCart() {
  document.querySelector(".cart-container").innerHTML = `
    <div class="empty-cart">
      <h2>Your cart is empty</h2>
      <p>Add some products to get started!</p>
      <a href="shop.html" class="btn-primary">Go to Shop</a>
    </div>
  `
}

// Update quantity
window.updateQuantity = (productId, delta) => {
  const cart = JSON.parse(localStorage.getItem("cart") || "[]")
  const item = cart.find((i) => i.productId === productId)

  if (item) {
    item.quantity += delta
    if (item.quantity < 1) item.quantity = 1
    localStorage.setItem("cart", JSON.stringify(cart))
    location.reload()
  }
}

// Remove from cart
window.removeFromCart = (productId) => {
  if (confirm("Remove this item from cart?")) {
    let cart = JSON.parse(localStorage.getItem("cart") || "[]")
    cart = cart.filter((item) => item.productId !== productId)
    localStorage.setItem("cart", JSON.stringify(cart))
    location.reload()
  }
}

// Proceed to checkout
window.proceedToCheckout = () => {
  const user = JSON.parse(localStorage.getItem("currentUser"))

  if (!user) {
    alert("Please login to proceed with checkout")
    window.location.href = "login.html"
    return
  }

  window.location.href = "checkout.html"
}

// Initialize
loadCart()