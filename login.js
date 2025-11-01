// ============================================
// FIXED login.js - With working password toggle
// ============================================

import { renderBreadcrumb } from "./components.js"
import { 
  auth, 
  signInWithEmailAndPassword, 
  db, 
  doc, 
  getDoc, 
  setDoc,
  isAdmin
} from "./firebase-config.js"

// LOCAL DEVELOPMENT URL
const CLOUD_FUNCTION_URL = "http://localhost:8080"

// Render breadcrumb
const breadcrumbContainer = document.getElementById("breadcrumb-container")
if (breadcrumbContainer) {
  breadcrumbContainer.innerHTML = renderBreadcrumb([
    { label: "Home", link: "index.html" },
    { label: "Login", link: null },
  ])
}

const loginForm = document.getElementById("login-form")
const errorMessage = document.getElementById("error-message")
const otpSection = document.getElementById("otp-section")
const otpForm = document.getElementById("otp-form")
let pendingCredentials = null

// ============================================
// PASSWORD VISIBILITY TOGGLE
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  const togglePasswordBtn = document.getElementById('toggle-password')
  const passwordInput = document.getElementById('password')
  
  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', () => {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password'
      passwordInput.setAttribute('type', type)
      
      // Update the icon
      const svg = togglePasswordBtn.querySelector('svg')
      if (type === 'password') {
        // Show eye icon (hidden password)
        svg.innerHTML = '<path d="M15 12c0 1.654-1.346 3-3 3s-3-1.346-3-3 1.346-3 3-3 3 1.346 3 3zm9-.449s-4.252 8.449-11.985 8.449c-7.18 0-12.015-8.449-12.015-8.449s4.446-7.551 12.015-7.551c7.694 0 11.985 7.551 11.985 7.551zm-7 .449c0-2.757-2.243-5-5-5s-5 2.243-5 5 2.243 5 5 5 5-2.243 5-5z"/>'
      } else {
        // Show eye-slash icon (visible password)
        svg.innerHTML = '<path d="M11.885 14.988l3.104-3.098.011.11c0 1.654-1.346 3-3 3l-.115-.012zm8.048-8.032l-3.274 3.268c.212.554.341 1.149.341 1.776 0 2.757-2.243 5-5 5-.631 0-1.229-.13-1.785-.344l-2.377 2.372c1.276.588 2.671.972 4.177.972 7.733 0 11.985-8.449 11.985-8.449s-1.415-2.478-4.067-4.595zm1.67-3.456l-19.603 19.603-1.5-1.5 4.587-4.583c-1.814-1.024-3.309-2.543-4.487-4.02 0 0 4.252-8.449 11.985-8.449 1.506 0 2.892.277 4.159.717l3.36-3.36 1.5 1.5zm-13.603 6.5c0-.265.031-.522.082-.769l-2.299 2.296c-.026.176-.033.354-.033.533 0 2.757 2.243 5 5 5 .179 0 .357-.007.533-.033l2.298-2.297c-.248.051-.505.082-.769.082-1.654 0-3-1.346-3-3z"/>'
      }
    })
  }
})

// Step 1: Verify email/password FIRST, then send OTP
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault()

  const email = document.getElementById("email").value.trim()
  const password = document.getElementById("password").value

  // Check if trying to login as admin
  if (isAdmin(email)) {
    showError("Admin users must login through the admin portal.")
    return
  }

  const submitBtn = loginForm.querySelector('button[type="submit"]')
  const originalText = submitBtn.textContent
  
  try {
    submitBtn.textContent = "Verifying credentials..."
    submitBtn.disabled = true

    // STEP 1: Verify email and password with Firebase Auth
    console.log("Step 1: Verifying email and password...")
    
    try {
      // This will throw an error if credentials are wrong
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user
      
      // Immediately sign out - we'll sign in again after OTP verification
      await auth.signOut()
      
      console.log("✅ Credentials verified. User ID:", user.uid)
      
    } catch (authError) {
      console.error("Authentication error:", authError)
      
      // Handle specific auth errors
      if (authError.code === 'auth/wrong-password') {
        throw new Error("Incorrect password. Please try again.")
      } else if (authError.code === 'auth/user-not-found') {
        throw new Error("No account found with this email.")
      } else if (authError.code === 'auth/invalid-email') {
        throw new Error("Invalid email address.")
      } else if (authError.code === 'auth/too-many-requests') {
        throw new Error("Too many failed attempts. Please try again later.")
      } else if (authError.code === 'auth/invalid-credential') {
        throw new Error("Invalid email or password.")
      } else {
        throw new Error("Login failed. Please check your credentials.")
      }
    }

    // STEP 2: Credentials are correct, now send OTP
    console.log("Step 2: Generating and sending OTP...")
    submitBtn.textContent = "Sending verification code..."

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    
    // Store OTP in Firestore
    await setDoc(doc(db, "otpVerification", email), {
      otp: otp,
      email: email,
      password: password,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      verified: false
    })

    // Try to send OTP via email
    await sendOTPEmail(email, otp)

    // Store credentials for OTP verification
    pendingCredentials = { email, password }

    // Show OTP form
    loginForm.style.display = "none"
    otpSection.style.display = "block"
    
    hideError()
    showSuccess(`Verification code sent to ${email}`)
    
    submitBtn.textContent = originalText
    submitBtn.disabled = false
    
  } catch (error) {
    console.error("Login error:", error)
    showError(error.message || "Login failed. Please try again.")
    
    submitBtn.textContent = originalText
    submitBtn.disabled = false
  }
})

// Step 2: Verify OTP and complete login
otpForm.addEventListener("submit", async (e) => {
  e.preventDefault()

  const otpInputs = document.querySelectorAll('.otp-input')
  const enteredOTP = Array.from(otpInputs).map(input => input.value).join('')

  if (!pendingCredentials) {
    showError("Session expired. Please try again.")
    return
  }

  if (enteredOTP.length !== 6) {
    showError("Please enter all 6 digits")
    return
  }

  const submitBtn = otpForm.querySelector('button[type="submit"]')
  
  try {
    submitBtn.textContent = "Verifying..."
    submitBtn.disabled = true

    // Verify OTP from Firestore
    const otpDoc = await getDoc(doc(db, "otpVerification", pendingCredentials.email))
    
    if (!otpDoc.exists()) {
      throw new Error("Verification code not found")
    }

    const otpData = otpDoc.data()
    
    // Check if OTP is expired
    if (new Date() > otpData.expiresAt.toDate()) {
      throw new Error("Verification code expired")
    }

    // Verify OTP matches
    if (otpData.otp !== enteredOTP) {
      throw new Error("Invalid verification code")
    }

    // OTP verified - proceed with final login
    const userCredential = await signInWithEmailAndPassword(
      auth, 
      pendingCredentials.email, 
      pendingCredentials.password
    )
    const user = userCredential.user

    // Get user data from Firestore
    const userDoc = await getDoc(doc(db, "users", user.uid))

    let userData = {}
    
    if (userDoc.exists()) {
      userData = userDoc.data()
      console.log("✅ User data found in Firestore")
    } else {
      // Create basic user data if it doesn't exist
      console.warn("⚠️ User data not found, creating basic profile...")
      userData = {
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0],
        role: 'customer',
        createdAt: new Date()
      }
      
      // Save the basic user data to Firestore
      await setDoc(doc(db, "users", user.uid), userData)
      console.log("✅ Basic user profile created")
    }

    // Store user in localStorage
    localStorage.setItem(
      "currentUser",
      JSON.stringify({
        uid: user.uid,
        email: user.email,
        emailVerified: true,
        ...userData,
      }),
    )

    // Mark OTP as verified
    await setDoc(doc(db, "otpVerification", pendingCredentials.email), {
      ...otpData,
      verified: true,
      verifiedAt: new Date()
    })

    // Redirect to home page
    showSuccess("Login successful! Redirecting...")
    setTimeout(() => {
      window.location.href = "index.html"
    }, 500)
    
  } catch (error) {
    console.error("OTP verification error:", error)
    let message = "Verification failed. Please try again."

    if (error.message.includes("expired")) {
      message = "Verification code expired. Please request a new one."
    } else if (error.message.includes("Invalid")) {
      message = "Invalid verification code. Please check and try again."
    }

    showError(message)
    
    submitBtn.textContent = "Verify & Login"
    submitBtn.disabled = false
  }
})

// Resend OTP functionality
document.addEventListener('DOMContentLoaded', () => {
  const resendBtn = document.getElementById("resend-otp")
  if (resendBtn) {
    resendBtn.addEventListener("click", async () => {
      if (!pendingCredentials) return

      try {
        resendBtn.style.pointerEvents = "none"
        resendBtn.textContent = "Sending..."

        const otp = Math.floor(100000 + Math.random() * 900000).toString()
        
        await setDoc(doc(db, "otpVerification", pendingCredentials.email), {
          otp: otp,
          email: pendingCredentials.email,
          password: pendingCredentials.password,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          verified: false
        })

        await sendOTPEmail(pendingCredentials.email, otp)
        
        showSuccess("New verification code sent!")
        
        resendBtn.textContent = "Resend Code"
        resendBtn.style.pointerEvents = "auto"
        
      } catch (error) {
        console.error("Resend OTP error:", error)
        showError("Failed to resend code. Please try again.")
        resendBtn.textContent = "Resend Code"
        resendBtn.style.pointerEvents = "auto"
      }
    })
  }

  // Auto-focus OTP inputs
  const otpInputs = document.querySelectorAll('.otp-input')
  
  otpInputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
      if (e.target.value.length === 1 && index < otpInputs.length - 1) {
        otpInputs[index + 1].focus()
      }
    })
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && index > 0) {
        otpInputs[index - 1].focus()
      }
    })

    input.addEventListener('keypress', (e) => {
      if (!/[0-9]/.test(e.key)) {
        e.preventDefault()
      }
    })

    input.addEventListener('paste', (e) => {
      e.preventDefault()
      const pastedData = e.clipboardData.getData('text').slice(0, 6)
      const digits = pastedData.split('')
      
      digits.forEach((digit, i) => {
        if (otpInputs[i] && /[0-9]/.test(digit)) {
          otpInputs[i].value = digit
        }
      })
      
      if (digits.length > 0) {
        otpInputs[Math.min(digits.length, otpInputs.length - 1)].focus()
      }
    })
  })
})

// Function to send OTP via Cloud Function
async function sendOTPEmail(toEmail, otp) {
  try {
    console.log('📧 Attempting to send OTP email...')
    console.log('To:', toEmail)
    console.log('URL:', CLOUD_FUNCTION_URL)
    
    const response = await fetch(CLOUD_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: toEmail,
        otp: otp
      })
    })
    
    if (!response.ok) {
      console.warn('⚠️ Email service error, but continuing with OTP in console')
    } else {
      const result = await response.json()
      console.log('✅ Email sent successfully:', result)
    }
    
  } catch (error) {
    console.warn('⚠️ Email service unavailable:', error.message)
  }
  
  // ALWAYS show OTP in console for development
  console.log('\n' + '='.repeat(50))
  console.log('🔐 OTP VERIFICATION CODE')
  console.log('='.repeat(50))
  console.log(`Email: ${toEmail}`)
  console.log(`CODE: ${otp}`)
  console.log('='.repeat(50) + '\n')
  
  return true
}

// Helper functions
function showError(message) {
  errorMessage.textContent = message
  errorMessage.classList.add("active")
  errorMessage.style.display = "block"
  
  setTimeout(() => hideError(), 8000)
}

function hideError() {
  errorMessage.classList.remove("active")
  errorMessage.style.display = "none"
}

function showSuccess(message) {
  const existingSuccess = document.querySelector('.success-message')
  if (existingSuccess) {
    existingSuccess.remove()
  }
  
  const successMsg = document.createElement('div')
  successMsg.className = 'success-message active'
  successMsg.textContent = message
  
  const container = otpSection.style.display === 'block' ? otpSection : loginForm.parentElement
  container.insertBefore(successMsg, container.firstChild)
  
  setTimeout(() => successMsg.remove(), 5000)
}