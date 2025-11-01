import { renderBreadcrumb } from "./components.js"
import { auth, createUserWithEmailAndPassword, db, doc, setDoc, isAdmin } from "./firebase-config.js"

// Render breadcrumb
const breadcrumbContainer = document.getElementById("breadcrumb-container")
if (breadcrumbContainer) {
  breadcrumbContainer.innerHTML = renderBreadcrumb([
    { label: "Home", link: "index.html" },
    { label: "Register", link: null },
  ])
}

// Handle registration form submission
const registerForm = document.getElementById("register-form")
const errorMessage = document.getElementById("error-message")

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault()

  const fullName = document.getElementById("fullName").value.trim()
  const email = document.getElementById("email").value.trim()
  const phone = document.getElementById("phone").value.trim()
  const password = document.getElementById("password").value
  const confirmPassword = document.getElementById("confirmPassword").value

  // Validation
  if (password !== confirmPassword) {
    errorMessage.textContent = "Passwords do not match."
    errorMessage.classList.add("active")
    return
  }

  if (password.length < 6) {
    errorMessage.textContent = "Password must be at least 6 characters."
    errorMessage.classList.add("active")
    return
  }

  // Check if trying to register with admin email
  if (isAdmin(email)) {
    errorMessage.textContent = "This email is reserved for admin use."
    errorMessage.classList.add("active")
    return
  }

  try {
    // Create user account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    // Save user data to Firestore
    await setDoc(doc(db, "users", user.uid), {
      fullName,
      email,
      phone,
      createdAt: new Date().toISOString(),
      role: "user",
    })

    // Save to localStorage
    localStorage.setItem(
      "currentUser",
      JSON.stringify({
        uid: user.uid,
        email: user.email,
        fullName,
        phone,
        role: "user",
      }),
    )

    // Redirect to home page
    window.location.href = "index.html"
  } catch (error) {
    console.error("Registration error:", error)
    let message = "Registration failed. Please try again."

    if (error.code === "auth/email-already-in-use") {
      message = "An account with this email already exists."
    } else if (error.code === "auth/invalid-email") {
      message = "Invalid email address."
    } else if (error.code === "auth/weak-password") {
      message = "Password is too weak."
    }

    errorMessage.textContent = message
    errorMessage.classList.add("active")
  }
})
