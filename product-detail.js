import { renderBreadcrumb } from "./components.js"
import { db, doc, getDoc } from "./firebase-config.js"

// Get product ID from URL
const urlParams = new URLSearchParams(window.location.search)
const productId = urlParams.get("id")

let currentProduct = null

// Load product details
async function loadProductDetail() {
  try {
    const productDoc = await getDoc(doc(db, "products", productId))

    if (productDoc.exists()) {
      currentProduct = { id: productDoc.id, ...productDoc.data() }
    } else {
      // Use sample data if not in Firestore
      const sampleProducts = getSampleProducts()
      currentProduct = sampleProducts.find((p) => p.id === productId)
    }

    if (currentProduct) {
      displayProductDetail(currentProduct)
      updateBreadcrumb(currentProduct.name)
    } else {
      document.getElementById("product-detail").innerHTML = "<p>Product not found.</p>"
    }
  } catch (error) {
    console.error("Error loading product:", error)
    const sampleProducts = getSampleProducts()
    currentProduct = sampleProducts.find((p) => p.id === productId)
    if (currentProduct) {
      displayProductDetail(currentProduct)
      updateBreadcrumb(currentProduct.name)
    }
  }
}

function getSampleProducts() {
  return [
    {
      id: "1",
      name: "Chocolate Dream Cake",
      price: 850,
      category: "cake",
      description:
        "Rich chocolate cake with creamy frosting, perfect for celebrations. Made with premium cocoa and fresh ingredients. Serves 8-10 people.",
      image:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23D2691E' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='white' text-anchor='middle' dy='.3em'%3EChocolate Cake%3C/text%3E%3C/svg%3E",
      images: [
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23D2691E' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='white' text-anchor='middle' dy='.3em'%3EChocolate Cake%3C/text%3E%3C/svg%3E",
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%238B4513' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='20' fill='white' text-anchor='middle' dy='.3em'%3EChocolate Detail%3C/text%3E%3C/svg%3E",
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23A0522D' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='20' fill='white' text-anchor='middle' dy='.3em'%3EChocolate Slice%3C/text%3E%3C/svg%3E",
      ],
    },
    {
      id: "2",
      name: "Strawberry Delight",
      price: 950,
      category: "cake",
      description:
        "Fresh strawberry cake with vanilla cream, light and delicious. Topped with fresh strawberries and whipped cream. Perfect for summer celebrations.",
      image:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23FFB6C1' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='%23FF1493' text-anchor='middle' dy='.3em'%3EStrawberry Cake%3C/text%3E%3C/svg%3E",
      images: [
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23FFB6C1' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='%23FF1493' text-anchor='middle' dy='.3em'%3EStrawberry Cake%3C/text%3E%3C/svg%3E",
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23FF69B4' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='20' fill='white' text-anchor='middle' dy='.3em'%3EStrawberry Detail%3C/text%3E%3C/svg%3E",
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23FFC0CB' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='20' fill='%23FF1493' text-anchor='middle' dy='.3em'%3EStrawberry Slice%3C/text%3E%3C/svg%3E",
      ],
    },
    {
      id: "3",
      name: "Vanilla Classic",
      price: 750,
      category: "cake",
      description:
        "Traditional vanilla cake with buttercream frosting. A timeless classic that never goes out of style. Made with real vanilla beans.",
      image:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23FFFACD' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='%23DAA520' text-anchor='middle' dy='.3em'%3EVanilla Cake%3C/text%3E%3C/svg%3E",
      images: [
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23FFFACD' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='%23DAA520' text-anchor='middle' dy='.3em'%3EVanilla Cake%3C/text%3E%3C/svg%3E",
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23F0E68C' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='20' fill='%23DAA520' text-anchor='middle' dy='.3em'%3EVanilla Detail%3C/text%3E%3C/svg%3E",
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23FAFAD2' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='20' fill='%23DAA520' text-anchor='middle' dy='.3em'%3EVanilla Slice%3C/text%3E%3C/svg%3E",
      ],
    },
    {
      id: "4",
      name: "Rose Bouquet",
      price: 1200,
      category: "bouquet",
      description:
        "Beautiful arrangement of fresh red roses, perfect for romance. Contains 12 premium long-stem roses with elegant wrapping.",
      image:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23FF0000' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='white' text-anchor='middle' dy='.3em'%3ERose Bouquet%3C/text%3E%3C/svg%3E",
      images: [
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23FF0000' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='white' text-anchor='middle' dy='.3em'%3ERose Bouquet%3C/text%3E%3C/svg%3E",
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23DC143C' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='20' fill='white' text-anchor='middle' dy='.3em'%3ERose Detail%3C/text%3E%3C/svg%3E",
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23B22222' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='20' fill='white' text-anchor='middle' dy='.3em'%3ERose Close-up%3C/text%3E%3C/svg%3E",
      ],
    },
    {
      id: "5",
      name: "Tulip Garden",
      price: 1100,
      category: "bouquet",
      description:
        "Colorful tulip arrangement bringing spring to your home. Mixed colors including pink, yellow, and purple tulips.",
      image:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23FF69B4' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='white' text-anchor='middle' dy='.3em'%3ETulip Bouquet%3C/text%3E%3C/svg%3E",
      images: [
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23FF69B4' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='white' text-anchor='middle' dy='.3em'%3ETulip Bouquet%3C/text%3E%3C/svg%3E",
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23FF1493' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='20' fill='white' text-anchor='middle' dy='.3em'%3ETulip Detail%3C/text%3E%3C/svg%3E",
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23DB7093' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='20' fill='white' text-anchor='middle' dy='.3em'%3ETulip Close-up%3C/text%3E%3C/svg%3E",
      ],
    },
    {
      id: "6",
      name: "Sunflower Sunshine",
      price: 900,
      category: "bouquet",
      description:
        "Bright sunflowers to brighten any day. Large, vibrant sunflowers arranged with greenery for a cheerful display.",
      image:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23FFD700' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='%23FF8C00' text-anchor='middle' dy='.3em'%3ESunflower Bouquet%3C/text%3E%3C/svg%3E",
      images: [
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23FFD700' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='%23FF8C00' text-anchor='middle' dy='.3em'%3ESunflower Bouquet%3C/text%3E%3C/svg%3E",
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23FFA500' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='20' fill='white' text-anchor='middle' dy='.3em'%3ESunflower Detail%3C/text%3E%3C/svg%3E",
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23FFB90F' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='20' fill='%23FF8C00' text-anchor='middle' dy='.3em'%3ESunflower Close-up%3C/text%3E%3C/svg%3E",
      ],
    },
  ]
}

function displayProductDetail(product) {
  const images = product.images || [product.image]
  const container = document.getElementById("product-detail")

  container.innerHTML = `
    <div class="product-images">
      <img src="${images[0]}" alt="${product.name}" class="main-image" id="main-image">
      <div class="thumbnail-images">
        ${images.map((img, index) => `<img src="${img}" alt="${product.name}" class="thumbnail ${index === 0 ? "active" : ""}" onclick="changeMainImage('${img}', ${index})">`).join("")}
      </div>
    </div>
    
    <div class="product-info-detail">
      <span class="product-category">${product.category.toUpperCase()}</span>
      <h1>${product.name}</h1>
      <p class="product-price-detail">₱${product.price.toFixed(2)}</p>
      <p class="product-description-detail">${product.description}</p>
      
      <div class="quantity-selector">
        <label>Quantity:</label>
        <div class="quantity-controls">
          <button class="quantity-btn" onclick="changeQuantity(-1)">-</button>
          <input type="number" class="quantity-input" id="quantity" value="1" min="1" readonly>
          <button class="quantity-btn" onclick="changeQuantity(1)">+</button>
        </div>
      </div>
      
      <button class="btn-primary btn-full add-to-cart-btn" onclick="addToCartFromDetail()">Add to Cart</button>
    </div>
  `
}

function updateBreadcrumb(productName) {
  const breadcrumbContainer = document.getElementById("breadcrumb-container")
  if (breadcrumbContainer) {
    breadcrumbContainer.innerHTML = renderBreadcrumb([
      { label: "Home", link: "index.html" },
      { label: "Shop", link: "shop.html" },
      { label: productName, link: null },
    ])
  }
}

// Change main image
window.changeMainImage = (imageSrc, index) => {
  document.getElementById("main-image").src = imageSrc
  document.querySelectorAll(".thumbnail").forEach((thumb, i) => {
    thumb.classList.toggle("active", i === index)
  })
}

// Change quantity
window.changeQuantity = (delta) => {
  const quantityInput = document.getElementById("quantity")
  let quantity = Number.parseInt(quantityInput.value) + delta
  if (quantity < 1) quantity = 1
  quantityInput.value = quantity
}

// Add to cart from detail page
window.addToCartFromDetail = () => {
  const quantity = Number.parseInt(document.getElementById("quantity").value)
  const cart = JSON.parse(localStorage.getItem("cart") || "[]")
  const existingItem = cart.find((item) => item.productId === productId)

  if (existingItem) {
    existingItem.quantity += quantity
  } else {
    cart.push({ productId, quantity })
  }

  localStorage.setItem("cart", JSON.stringify(cart))
  alert(`Added ${quantity} item(s) to cart!`)
  window.location.href = "cart.html"
}

// Initialize
loadProductDetail()