// Delivery Rider API Module
// This module provides API functions for delivery riders to interact with the system

import { db } from "./firebase-config.js"
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  orderBy,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js"

/**
 * Delivery Rider API Class
 * Provides methods for riders to manage their deliveries
 */
class DeliveryRiderAPI {
  constructor() {
    this.riderId = null
  }

  /**
   * Initialize the API with a rider ID
   * @param {string} riderId - The ID of the delivery rider
   */
  setRiderId(riderId) {
    this.riderId = riderId
  }

  /**
   * Fetch all orders assigned to this rider
   * @returns {Promise<Array>} Array of assigned orders
   */
  async fetchAssignedOrders() {
    try {
      if (!this.riderId) {
        throw new Error("Rider ID not set. Call setRiderId() first.")
      }

      const ordersRef = collection(db, "orders")
      const q = query(ordersRef, where("riderId", "==", this.riderId), orderBy("createdAt", "desc"))

      const querySnapshot = await getDocs(q)
      const orders = []

      querySnapshot.forEach((doc) => {
        orders.push({
          id: doc.id,
          ...doc.data(),
        })
      })

      return {
        success: true,
        orders: orders,
        count: orders.length,
      }
    } catch (error) {
      console.error("Error fetching assigned orders:", error)
      return {
        success: false,
        error: error.message,
        orders: [],
      }
    }
  }

  /**
   * Fetch pending orders that need to be accepted
   * @returns {Promise<Array>} Array of pending orders
   */
  async fetchPendingOrders() {
    try {
      if (!this.riderId) {
        throw new Error("Rider ID not set. Call setRiderId() first.")
      }

      const ordersRef = collection(db, "orders")
      const q = query(
        ordersRef,
        where("riderId", "==", this.riderId),
        where("status", "==", "assigned"),
        orderBy("createdAt", "desc"),
      )

      const querySnapshot = await getDocs(q)
      const orders = []

      querySnapshot.forEach((doc) => {
        orders.push({
          id: doc.id,
          ...doc.data(),
        })
      })

      return {
        success: true,
        orders: orders,
        count: orders.length,
      }
    } catch (error) {
      console.error("Error fetching pending orders:", error)
      return {
        success: false,
        error: error.message,
        orders: [],
      }
    }
  }

  /**
   * Accept an assigned order
   * @param {string} orderId - The ID of the order to accept
   * @returns {Promise<Object>} Result of the operation
   */
  async acceptOrder(orderId) {
    try {
      if (!this.riderId) {
        throw new Error("Rider ID not set. Call setRiderId() first.")
      }

      const orderRef = doc(db, "orders", orderId)
      const orderDoc = await getDoc(orderRef)

      if (!orderDoc.exists()) {
        throw new Error("Order not found")
      }

      const orderData = orderDoc.data()

      // Verify the order is assigned to this rider
      if (orderData.riderId !== this.riderId) {
        throw new Error("This order is not assigned to you")
      }

      // Verify the order is in assigned status
      if (orderData.status !== "assigned") {
        throw new Error("Order cannot be accepted in current status")
      }

      // Update order status to picked up
      await updateDoc(orderRef, {
        status: "picked_up",
        acceptedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })

      return {
        success: true,
        message: "Order accepted successfully",
        orderId: orderId,
      }
    } catch (error) {
      console.error("Error accepting order:", error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * Update the delivery status of an order
   * @param {string} orderId - The ID of the order
   * @param {string} status - New status (picked_up, in_transit, delivered)
   * @param {string} notes - Optional notes about the status update
   * @returns {Promise<Object>} Result of the operation
   */
  async updateDeliveryStatus(orderId, status, notes = "") {
    try {
      if (!this.riderId) {
        throw new Error("Rider ID not set. Call setRiderId() first.")
      }

      const validStatuses = ["picked_up", "in_transit", "delivered"]
      if (!validStatuses.includes(status)) {
        throw new Error("Invalid status. Must be one of: " + validStatuses.join(", "))
      }

      const orderRef = doc(db, "orders", orderId)
      const orderDoc = await getDoc(orderRef)

      if (!orderDoc.exists()) {
        throw new Error("Order not found")
      }

      const orderData = orderDoc.data()

      // Verify the order is assigned to this rider
      if (orderData.riderId !== this.riderId) {
        throw new Error("This order is not assigned to you")
      }

      const updateData = {
        status: status,
        updatedAt: Timestamp.now(),
      }

      if (notes) {
        updateData.deliveryNotes = notes
      }

      if (status === "delivered") {
        updateData.deliveredAt = Timestamp.now()
      }

      await updateDoc(orderRef, updateData)

      return {
        success: true,
        message: `Order status updated to ${status}`,
        orderId: orderId,
        newStatus: status,
      }
    } catch (error) {
      console.error("Error updating delivery status:", error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * Update the rider's current location
   * @param {number} latitude - Current latitude
   * @param {number} longitude - Current longitude
   * @returns {Promise<Object>} Result of the operation
   */
  async updateRiderLocation(latitude, longitude) {
    try {
      if (!this.riderId) {
        throw new Error("Rider ID not set. Call setRiderId() first.")
      }

      if (typeof latitude !== "number" || typeof longitude !== "number") {
        throw new Error("Latitude and longitude must be numbers")
      }

      if (latitude < -90 || latitude > 90) {
        throw new Error("Latitude must be between -90 and 90")
      }

      if (longitude < -180 || longitude > 180) {
        throw new Error("Longitude must be between -180 and 180")
      }

      const riderRef = doc(db, "riders", this.riderId)
      const riderDoc = await getDoc(riderRef)

      if (!riderDoc.exists()) {
        throw new Error("Rider not found")
      }

      await updateDoc(riderRef, {
        location: {
          latitude: latitude,
          longitude: longitude,
          updatedAt: Timestamp.now(),
        },
        lastActive: Timestamp.now(),
      })

      return {
        success: true,
        message: "Location updated successfully",
        location: {
          latitude,
          longitude,
        },
      }
    } catch (error) {
      console.error("Error updating rider location:", error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * Get rider's current information
   * @returns {Promise<Object>} Rider information
   */
  async getRiderInfo() {
    try {
      if (!this.riderId) {
        throw new Error("Rider ID not set. Call setRiderId() first.")
      }

      const riderRef = doc(db, "riders", this.riderId)
      const riderDoc = await getDoc(riderRef)

      if (!riderDoc.exists()) {
        throw new Error("Rider not found")
      }

      return {
        success: true,
        rider: {
          id: riderDoc.id,
          ...riderDoc.data(),
        },
      }
    } catch (error) {
      console.error("Error fetching rider info:", error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * Update rider's online/offline status
   * @param {boolean} isOnline - Whether the rider is online
   * @returns {Promise<Object>} Result of the operation
   */
  async updateOnlineStatus(isOnline) {
    try {
      if (!this.riderId) {
        throw new Error("Rider ID not set. Call setRiderId() first.")
      }

      const riderRef = doc(db, "riders", this.riderId)
      const riderDoc = await getDoc(riderRef)

      if (!riderDoc.exists()) {
        throw new Error("Rider not found")
      }

      await updateDoc(riderRef, {
        isOnline: isOnline,
        lastActive: Timestamp.now(),
      })

      return {
        success: true,
        message: `Status updated to ${isOnline ? "online" : "offline"}`,
        isOnline: isOnline,
      }
    } catch (error) {
      console.error("Error updating online status:", error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * Get order details by ID
   * @param {string} orderId - The ID of the order
   * @returns {Promise<Object>} Order details
   */
  async getOrderDetails(orderId) {
    try {
      if (!this.riderId) {
        throw new Error("Rider ID not set. Call setRiderId() first.")
      }

      const orderRef = doc(db, "orders", orderId)
      const orderDoc = await getDoc(orderRef)

      if (!orderDoc.exists()) {
        throw new Error("Order not found")
      }

      const orderData = orderDoc.data()

      // Verify the order is assigned to this rider
      if (orderData.riderId !== this.riderId) {
        throw new Error("This order is not assigned to you")
      }

      return {
        success: true,
        order: {
          id: orderDoc.id,
          ...orderData,
        },
      }
    } catch (error) {
      console.error("Error fetching order details:", error)
      return {
        success: false,
        error: error.message,
      }
    }
  }
}

// Export the API class
export default DeliveryRiderAPI

// Example usage:
/*
import DeliveryRiderAPI from './delivery-rider-api.js';

const riderAPI = new DeliveryRiderAPI();
riderAPI.setRiderId('rider123');

// Fetch assigned orders
const orders = await riderAPI.fetchAssignedOrders();
console.log(orders);

// Accept an order
const result = await riderAPI.acceptOrder('order123');
console.log(result);

// Update delivery status
const statusUpdate = await riderAPI.updateDeliveryStatus('order123', 'in_transit', 'On the way');
console.log(statusUpdate);

// Update location
const locationUpdate = await riderAPI.updateRiderLocation(10.3157, 123.8854);
console.log(locationUpdate);

// Update online status
const onlineStatus = await riderAPI.updateOnlineStatus(true);
console.log(onlineStatus);
*/
