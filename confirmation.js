import { renderBreadcrumb } from "./components.js"

// Render breadcrumb
const breadcrumbContainer = document.getElementById("breadcrumb-container")
if (breadcrumbContainer) {
  breadcrumbContainer.innerHTML = renderBreadcrumb([
    { label: "Home", link: "index.html" },
    { label: "Cart", link: "cart.html" },
    { label: "Checkout", link: "checkout.html" },
    { label: "Payment", link: "payment.html" },
    { label: "Confirmation", link: null },
  ])
}

// Load order details
function loadOrderDetails() {
  // Note: Use in-memory storage instead of localStorage for artifacts
  const orderData = JSON.parse(localStorage.getItem("lastOrder"))

  if (!orderData) {
    window.location.href = "index.html"
    return
  }

  document.getElementById("order-id").textContent = orderData.id

  const orderDetailsContainer = document.getElementById("order-details")
  
  // Build pricing breakdown HTML
  let pricingHTML = `
    <div style="display: flex; justify-content: space-between; margin-bottom: 10px; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
      <span style="color: #666;">Subtotal:</span>
      <span style="font-weight: 500;">₱${(orderData.subtotal || 0).toFixed(2)}</span>
    </div>
  `
  
  // Add discount if applicable
  if (orderData.discount && orderData.discount > 0) {
    const discountTiers = Math.floor(orderData.subtotal / 1000)
    pricingHTML += `
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px; padding: 8px 0; border-bottom: 1px solid #f0f0f0; color: #4caf50; font-weight: 600;">
        <span>Discount (${discountTiers} × 20%):</span>
        <span>-₱${orderData.discount.toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
        <span style="color: #666;">After Discount:</span>
        <span style="font-weight: 500;">₱${(orderData.subtotalAfterDiscount || 0).toFixed(2)}</span>
      </div>
    `
  }
  
  // Add tax
  if (orderData.tax && orderData.tax > 0) {
    pricingHTML += `
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
        <span style="color: #666;">Tax (12%):</span>
        <span style="font-weight: 500;">₱${orderData.tax.toFixed(2)}</span>
      </div>
    `
  }
  
  // Add delivery fee
  pricingHTML += `
    <div style="display: flex; justify-content: space-between; padding: 8px 0;">
      <span style="color: #666;">Delivery Fee:</span>
      <span style="font-weight: 500;">₱${(orderData.deliveryFee || 100).toFixed(2)}</span>
    </div>
  `
  
  // Build delivery info section
  let deliveryInfoHTML = `
    <div style="background: #f9f9f9; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
      <p style="margin: 0 0 12px 0;"><strong style="color: #333;">👤 ${orderData.fullName}</strong></p>
      <p style="margin: 8px 0; color: #666;"><strong>Phone:</strong> ${orderData.phone}</p>
      <p style="margin: 8px 0; color: #666;"><strong>Email:</strong> ${orderData.email}</p>
      <p style="margin: 8px 0; color: #666;"><strong>Address:</strong> ${orderData.address}, ${orderData.city}</p>
    </div>
  `
  
  // Add GPS coordinates if available
  if (orderData.deliveryLat && orderData.deliveryLng) {
    deliveryInfoHTML += `
      <div style="background: #e8f5e9; padding: 14px; border-radius: 8px; border-left: 4px solid #4caf50; margin-bottom: 16px;">
        <p style="margin: 0 0 10px 0; font-weight: 600; color: #2e7d32; font-size: 14px;">📍 GPS Location Confirmed</p>
        <p style="margin: 6px 0; font-size: 12px; color: #555; line-height: 1.5;">
          <strong>Location:</strong> ${orderData.deliveryLocation || orderData.city}<br>
          <strong>Coordinates:</strong> ${orderData.deliveryLat.toFixed(6)}, ${orderData.deliveryLng.toFixed(6)}
        </p>
      </div>
    `
  } else {
    deliveryInfoHTML += `
      <div style="background: #fff3cd; padding: 14px; border-radius: 8px; border-left: 4px solid #ffc107; margin-bottom: 16px;">
        <p style="margin: 0; font-weight: 600; color: #856404; font-size: 14px;">⚠️ GPS Location Pending</p>
        <p style="margin: 6px 0 0 0; font-size: 12px; color: #666;">Your GPS coordinates will be added to your delivery route.</p>
      </div>
    `
  }
  
  if (orderData.notes) {
    deliveryInfoHTML += `
      <div style="background: #f0f4ff; padding: 12px; border-radius: 8px; border-left: 4px solid #667eea;">
        <p style="margin: 0; font-size: 12px;"><strong style="color: #667eea;">📝 Delivery Notes:</strong><br><span style="color: #555;">${orderData.notes}</span></p>
      </div>
    `
  }
  
  orderDetailsContainer.innerHTML = `
    <h2 style="margin-bottom: 20px; color: #333; font-size: 18px;">Order Details</h2>
    
    <div style="margin-bottom: 32px;">
      <h3 style="margin-bottom: 16px; color: #555; font-size: 16px; font-weight: 600;">🚚 Delivery Information</h3>
      ${deliveryInfoHTML}
    </div>
    
    <div style="margin-bottom: 32px;">
      <h3 style="margin-bottom: 16px; color: #555; font-size: 16px; font-weight: 600;">🛒 Order Items (${orderData.items.length} ${orderData.items.length === 1 ? 'item' : 'items'})</h3>
      <div style="background: #fafafa; border-radius: 8px; padding: 16px;">
        ${orderData.items
          .map(
            (item, index) => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; ${index < orderData.items.length - 1 ? 'border-bottom: 1px solid #e0e0e0;' : ''}">
            <div style="display: flex; align-items: center; flex: 1;">
              <div style="background: #667eea; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; margin-right: 12px;">
                ${index + 1}
              </div>
              <div style="flex: 1;">
                <div style="font-weight: 600; color: #333; margin-bottom: 4px;">${item.name || item.productName}</div>
                <div style="font-size: 13px; color: #888;">Qty: ${item.quantity} × ₱${item.price.toFixed(2)}</div>
              </div>
            </div>
            <div style="font-weight: 700; color: #667eea; min-width: 90px; text-align: right; font-size: 16px;">₱${(item.price * item.quantity).toFixed(2)}</div>
          </div>
        `,
          )
          .join("")}
      </div>
    </div>
    
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px; border-radius: 12px; margin-bottom: 32px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
      <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">💰 Price Summary</h3>
      <div style="font-size: 14px; line-height: 2;">
        ${pricingHTML.replace(/color: #666;/g, 'color: rgba(255,255,255,0.9);').replace(/style="font-weight: 500;"/g, 'style="font-weight: 600;"')}
      </div>
      <div style="border-top: 2px solid rgba(255,255,255,0.3); padding-top: 16px; margin-top: 16px; display: flex; justify-content: space-between; font-size: 20px; font-weight: 700;">
        <span>Total Amount:</span>
        <span>₱${(orderData.total || 0).toFixed(2)}</span>
      </div>
      ${orderData.discount && orderData.discount > 0 ? `
      <div style="background: rgba(76, 175, 80, 0.3); padding: 12px; border-radius: 8px; text-align: center; font-weight: 600; margin-top: 16px; border: 1px solid rgba(76, 175, 80, 0.6);">
        ✨ You saved ₱${orderData.discount.toFixed(2)} on this order!
      </div>
      ` : ''}
    </div>
    
    <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0;">
      <h3 style="margin: 0 0 16px 0; color: #555; font-size: 16px; font-weight: 600;">💳 Payment Information</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 14px;">
        <div>
          <p style="margin: 0 0 4px 0; color: #888; font-size: 12px;"><strong>Payment Method</strong></p>
          <p style="margin: 0; color: #333; font-weight: 600; font-size: 15px;">${orderData.paymentMethod}</p>
        </div>
        <div>
          <p style="margin: 0 0 4px 0; color: #888; font-size: 12px;"><strong>Receipt Number</strong></p>
          <p style="margin: 0; color: #333; font-weight: 600; font-size: 15px;">${orderData.receiptNumber}</p>
        </div>
      </div>
      <div style="margin-top: 16px; padding: 12px; background: #fff3cd; border-radius: 6px; border-left: 4px solid #ff9800;">
        <p style="margin: 0; font-size: 13px; color: #856404;"><strong>Status:</strong> <span style="font-weight: 700;">⏳ Pending Verification</span></p>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">Your payment is being verified. You'll receive a confirmation shortly.</p>
      </div>
    </div>
  `
}

// Download receipt as PDF with improved formatting
window.downloadReceipt = () => {
  const orderData = JSON.parse(localStorage.getItem("lastOrder"))

  if (!orderData) {
    alert("Order data not found")
    return
  }

  try {
    const { jsPDF } = window.jspdf
    const doc = new jsPDF()
    
    const pageWidth = 210
    const pageHeight = 297
    const margin = 20
    const contentWidth = pageWidth - (margin * 2)
    let yPos = margin
    
    // Helper function to render peso sign properly
    const peso = "PHP "

    // ========== HEADER ==========
    doc.setFillColor(102, 126, 234)
    doc.rect(0, 0, pageWidth, 35, 'F')
    
    doc.setFontSize(24)
    doc.setTextColor(255, 255, 255)
    doc.setFont(undefined, "bold")
    doc.text("Florist & Cake Shop", pageWidth / 2, 15, { align: "center" })
    
    doc.setFontSize(10)
    doc.setFont(undefined, "normal")
    doc.text("Premium Flowers & Cakes Delivery Service", pageWidth / 2, 22, { align: "center" })
    
    doc.setFontSize(8)
    doc.text("Contact: 0921-269-7632 | Email: shop@floristcake.com", pageWidth / 2, 28, { align: "center" })
    
    yPos = 45

    // Receipt Title
    doc.setFontSize(16)
    doc.setTextColor(102, 126, 234)
    doc.setFont(undefined, "bold")
    doc.text("OFFICIAL RECEIPT", pageWidth / 2, yPos, { align: "center" })
    
    yPos += 8
    doc.setDrawColor(102, 126, 234)
    doc.setLineWidth(0.5)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    
    // ========== ORDER INFO BOX ==========
    yPos += 8
    doc.setFillColor(245, 247, 250)
    doc.rect(margin, yPos, contentWidth, 24, 'F')
    doc.setDrawColor(200, 200, 200)
    doc.rect(margin, yPos, contentWidth, 24, 'S')
    
    yPos += 6
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    doc.setFont(undefined, "bold")
    doc.text("Order ID:", margin + 3, yPos)
    doc.setFont(undefined, "normal")
    doc.setTextColor(102, 126, 234)
    doc.text(orderData.id, margin + 25, yPos)
    
    yPos += 6
    doc.setTextColor(0, 0, 0)
    doc.setFont(undefined, "bold")
    doc.text("Date:", margin + 3, yPos)
    doc.setFont(undefined, "normal")
    doc.text(new Date(orderData.createdAt).toLocaleString('en-PH', { 
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }), margin + 25, yPos)
    
    yPos += 6
    doc.setFont(undefined, "bold")
    doc.text("Status:", margin + 3, yPos)
    doc.setFont(undefined, "bold")
    doc.setTextColor(255, 152, 0)
    doc.text("Pending Verification", margin + 25, yPos)
    doc.setTextColor(0, 0, 0)

    // ========== CUSTOMER INFO ==========
    yPos += 12
    doc.setFillColor(102, 126, 234)
    doc.rect(margin, yPos, contentWidth, 7, 'F')
    
    doc.setFontSize(11)
    doc.setFont(undefined, "bold")
    doc.setTextColor(255, 255, 255)
    doc.text("CUSTOMER INFORMATION", margin + 2, yPos + 5)
    
    yPos += 10
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(9)
    
    const customerBoxY = yPos
    doc.setDrawColor(220, 220, 220)
    doc.rect(margin, customerBoxY, contentWidth, 26, 'S')
    
    yPos += 5
    doc.setFont(undefined, "bold")
    doc.text("Name:", margin + 3, yPos)
    doc.setFont(undefined, "normal")
    doc.text(orderData.fullName, margin + 30, yPos)
    
    yPos += 5
    doc.setFont(undefined, "bold")
    doc.text("Phone:", margin + 3, yPos)
    doc.setFont(undefined, "normal")
    doc.text(orderData.phone, margin + 30, yPos)
    
    yPos += 5
    doc.setFont(undefined, "bold")
    doc.text("Email:", margin + 3, yPos)
    doc.setFont(undefined, "normal")
    doc.text(orderData.email, margin + 30, yPos)
    
    yPos += 5
    doc.setFont(undefined, "bold")
    doc.text("Address:", margin + 3, yPos)
    doc.setFont(undefined, "normal")
    const addressText = `${orderData.address}, ${orderData.city}`
    const addressLines = doc.splitTextToSize(addressText, contentWidth - 33)
    addressLines.forEach((line, idx) => {
      doc.text(line, margin + 30, yPos + (idx * 4))
    })
    yPos += (addressLines.length * 4)

    // GPS Location
    if (orderData.deliveryLat && orderData.deliveryLng) {
      yPos += 5
      doc.setFillColor(232, 245, 233)
      doc.rect(margin, yPos, contentWidth, 12, 'F')
      doc.setDrawColor(76, 175, 80)
      doc.setLineWidth(0.3)
      doc.rect(margin, yPos, contentWidth, 12, 'S')
      
      yPos += 4
      doc.setTextColor(46, 125, 50)
      doc.setFont(undefined, "bold")
      doc.setFontSize(8)
      doc.text("GPS DELIVERY LOCATION CONFIRMED", margin + 2, yPos)
      
      yPos += 4
      doc.setTextColor(0, 0, 0)
      doc.setFont(undefined, "normal")
      doc.setFontSize(7)
      doc.text(`Location: ${orderData.deliveryLocation || orderData.city}`, margin + 2, yPos)
      doc.text(`Coordinates: ${orderData.deliveryLat.toFixed(6)}, ${orderData.deliveryLng.toFixed(6)}`, pageWidth / 2, yPos)
      
      yPos += 2
    }

    // ========== ORDER ITEMS ==========
    yPos += 10
    doc.setFillColor(102, 126, 234)
    doc.rect(margin, yPos, contentWidth, 7, 'F')
    
    doc.setFontSize(11)
    doc.setFont(undefined, "bold")
    doc.setTextColor(255, 255, 255)
    doc.text(`ORDER ITEMS (${orderData.items.length} ${orderData.items.length === 1 ? 'ITEM' : 'ITEMS'})`, margin + 2, yPos + 5)
    
    yPos += 10
    
    // Table header
    doc.setFillColor(240, 240, 240)
    doc.rect(margin, yPos, contentWidth, 7, 'F')
    
    yPos += 5
    doc.setFontSize(8)
    doc.setFont(undefined, "bold")
    doc.setTextColor(60, 60, 60)
    doc.text("#", margin + 2, yPos)
    doc.text("ITEM DESCRIPTION", margin + 10, yPos)
    doc.text("QTY", margin + 110, yPos, { align: "center" })
    doc.text("UNIT PRICE", margin + 140, yPos, { align: "right" })
    doc.text("AMOUNT", pageWidth - margin - 2, yPos, { align: "right" })
    
    yPos += 2
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    
    // Items
    yPos += 4
    doc.setFont(undefined, "normal")
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(8)
    
    orderData.items.forEach((item, index) => {
      if (yPos > pageHeight - 70) {
        doc.addPage()
        yPos = margin + 10
      }
      
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250)
        doc.rect(margin, yPos - 2, contentWidth, 7, 'F')
      }
      
      const itemName = item.name || item.productName
      
      doc.setFont(undefined, "bold")
      doc.text(`${index + 1}.`, margin + 2, yPos)
      
      doc.setFont(undefined, "normal")
      const nameLines = doc.splitTextToSize(itemName, 95)
      doc.text(nameLines[0], margin + 10, yPos)
      
      doc.text(`${item.quantity}`, margin + 110, yPos, { align: "center" })
      doc.text(`${peso}${item.price.toFixed(2)}`, margin + 140, yPos, { align: "right" })
      doc.setFont(undefined, "bold")
      doc.text(`${peso}${(item.price * item.quantity).toFixed(2)}`, pageWidth - margin - 2, yPos, { align: "right" })
      doc.setFont(undefined, "normal")
      
      yPos += 7
      
      if (index < orderData.items.length - 1) {
        doc.setDrawColor(230, 230, 230)
        doc.setLineWidth(0.1)
        doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2)
      }
    })

    // ========== PRICING SUMMARY ==========
    yPos += 3
    doc.setDrawColor(102, 126, 234)
    doc.setLineWidth(0.5)
    doc.line(margin + 100, yPos, pageWidth - margin, yPos)
    
    yPos += 6
    doc.setFontSize(9)
    doc.setFont(undefined, "normal")
    doc.setTextColor(0, 0, 0)
    
    doc.text("Subtotal:", margin + 105, yPos)
    doc.setFont(undefined, "bold")
    doc.text(`${peso}${(orderData.subtotal || 0).toFixed(2)}`, pageWidth - margin - 2, yPos, { align: "right" })
    doc.setFont(undefined, "normal")
    
    if (orderData.discount && orderData.discount > 0) {
      yPos += 5
      doc.setTextColor(76, 175, 80)
      doc.setFont(undefined, "bold")
      const discountTiers = Math.floor(orderData.subtotal / 1000)
      doc.text(`Discount (${discountTiers} x 20%):`, margin + 105, yPos)
      doc.text(`-${peso}${orderData.discount.toFixed(2)}`, pageWidth - margin - 2, yPos, { align: "right" })
      
      yPos += 5
      doc.setTextColor(0, 0, 0)
      doc.setFont(undefined, "normal")
      doc.text("After Discount:", margin + 105, yPos)
      doc.setFont(undefined, "bold")
      doc.text(`${peso}${(orderData.subtotalAfterDiscount || 0).toFixed(2)}`, pageWidth - margin - 2, yPos, { align: "right" })
      doc.setFont(undefined, "normal")
    }
    
    if (orderData.tax && orderData.tax > 0) {
      yPos += 5
      doc.text("VAT (12%):", margin + 105, yPos)
      doc.setFont(undefined, "bold")
      doc.text(`${peso}${orderData.tax.toFixed(2)}`, pageWidth - margin - 2, yPos, { align: "right" })
      doc.setFont(undefined, "normal")
    }
    
    yPos += 5
    doc.text("Delivery Fee:", margin + 105, yPos)
    doc.setFont(undefined, "bold")
    doc.text(`${peso}${(orderData.deliveryFee || 100).toFixed(2)}`, pageWidth - margin - 2, yPos, { align: "right" })
    
    // Total
    yPos += 8
    doc.setFillColor(102, 126, 234)
    doc.rect(margin + 100, yPos - 4, pageWidth - margin - 100, 10, 'F')
    
    doc.setFontSize(12)
    doc.setFont(undefined, "bold")
    doc.setTextColor(255, 255, 255)
    doc.text("TOTAL AMOUNT:", margin + 105, yPos + 2)
    doc.setFontSize(14)
    doc.text(`${peso}${(orderData.total || 0).toFixed(2)}`, pageWidth - margin - 2, yPos + 2, { align: "right" })
    
    if (orderData.discount && orderData.discount > 0) {
      yPos += 15
      doc.setFillColor(232, 245, 233)
      doc.rect(margin, yPos - 3, contentWidth, 8, 'F')
      doc.setDrawColor(76, 175, 80)
      doc.rect(margin, yPos - 3, contentWidth, 8, 'S')
      
      doc.setFontSize(10)
      doc.setTextColor(46, 125, 50)
      doc.setFont(undefined, "bold")
      doc.text(`YOU SAVED ${peso}${orderData.discount.toFixed(2)} ON THIS ORDER!`, pageWidth / 2, yPos + 1, { align: "center" })
    }

    // ========== PAYMENT INFO ==========
    yPos += 15
    doc.setFillColor(102, 126, 234)
    doc.rect(margin, yPos, contentWidth, 7, 'F')
    
    doc.setFontSize(11)
    doc.setFont(undefined, "bold")
    doc.setTextColor(255, 255, 255)
    doc.text("PAYMENT INFORMATION", margin + 2, yPos + 5)
    
    yPos += 10
    doc.setTextColor(0, 0, 0)
    
    doc.setDrawColor(220, 220, 220)
    doc.rect(margin, yPos, contentWidth, 12, 'S')
    
    yPos += 5
    doc.setFontSize(9)
    doc.setFont(undefined, "bold")
    doc.text("Payment Method:", margin + 3, yPos)
    doc.setFont(undefined, "normal")
    doc.text(orderData.paymentMethod, margin + 40, yPos)
    
    yPos += 5
    doc.setFont(undefined, "bold")
    doc.text("Receipt Number:", margin + 3, yPos)
    doc.setFont(undefined, "normal")
    doc.text(orderData.receiptNumber, margin + 40, yPos)

    // ========== FOOTER ==========
    yPos = pageHeight - 20
    doc.setDrawColor(102, 126, 234)
    doc.setLineWidth(0.3)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    
    yPos += 4
    doc.setFontSize(10)
    doc.setTextColor(102, 126, 234)
    doc.setFont(undefined, "bold")
    doc.text("Thank you for choosing Florist & Cake Shop!", pageWidth / 2, yPos, { align: "center" })
    
    yPos += 4
    doc.setFontSize(7)
    doc.setTextColor(120, 120, 120)
    doc.setFont(undefined, "normal")
    doc.text("Customer Service: +63 921 697 632 | Jayknightvigilla@gmail.com", pageWidth / 2, yPos, { align: "center" })

    const filename = `Receipt_${orderData.id}_${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(filename)
    
    setTimeout(() => {
      alert(`✅ Receipt downloaded successfully!\n\nFilename: ${filename}`)
    }, 100)
    
  } catch (error) {
    console.error("Error generating PDF:", error)
    alert("❌ Failed to generate receipt. Please try again.")
  }
}

// Initialize
loadOrderDetails()

console.log("✅ Order confirmation page loaded successfully")