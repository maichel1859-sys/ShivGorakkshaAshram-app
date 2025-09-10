/**
 * Socket.IO Integration for ShivGorakksha Ashram App
 * Connects to the WebSocket server at https://ashram-queue-socket-server.onrender.com
 * This file provides the integration without modifying existing UI components
 */

import { getSocketClient } from './socket-client';

// Initialize socket connection
export const initializeSocket = () => {
  const socket = getSocketClient();
  console.log('🔌 Socket.IO client initialized');
  return socket;
};

// Connect to WebSocket server
export const connectToSocketServer = () => {
  try {
    const socket = initializeSocket();
    return {
      success: true,
      socket,
      message: 'Connected to WebSocket server'
    };
  } catch (error) {
    console.error('Failed to connect to WebSocket server:', error);
    return {
      success: false,
      socket: null,
      message: 'Failed to connect to WebSocket server'
    };
  }
};

// Get connection status
export const getSocketConnectionStatus = () => {
  const socket = getSocketClient();
  return socket.getConnectionStatus();
};

// Subscribe to queue events (for background updates)
export const subscribeToQueueEvents = (userId: string, role: string, gurujiId?: string) => {
  const socket = getSocketClient();
  
  // Join appropriate room
  socket.joinRoom(userId, role, gurujiId);
  
  // Subscribe to queue events
  socket.subscribeToEvents({
    userId,
    events: [
      'queue_updated',
      'queue_entry_updated',
      'queue_entry_added',
      'queue_entry_removed',
      'queue_position_updated',
      'user_queue_status'
    ],
    rooms: [
      'queue',
      `user:${userId}`,
      role === 'GURUJI' ? `guruji:${gurujiId || userId}` : '',
      role === 'ADMIN' || role === 'COORDINATOR' ? 'admin' : ''
    ].filter(Boolean)
  });
  
  console.log(`🔌 Subscribed to queue events for ${role}: ${userId}`);
};

// Subscribe to notification events
export const subscribeToNotificationEvents = (userId: string) => {
  const socket = getSocketClient();
  
  socket.subscribeToEvents({
    userId,
    events: ['notification_update'],
    rooms: ['notifications', `user:${userId}`]
  });
  
  console.log(`🔌 Subscribed to notification events for user: ${userId}`);
};

// Request queue update
export const requestQueueUpdate = () => {
  const socket = getSocketClient();
  socket.requestQueueUpdate();
  console.log('🔌 Requested queue update');
};

// Request user queue status
export const requestUserQueueStatus = (userId: string) => {
  const socket = getSocketClient();
  socket.requestUserQueueStatus(userId);
  console.log(`🔌 Requested queue status for user: ${userId}`);
};

// Request guruji queue
export const requestGurujiQueue = (gurujiId: string) => {
  const socket = getSocketClient();
  socket.requestGurujiQueue(gurujiId);
  console.log(`🔌 Requested queue for guruji: ${gurujiId}`);
};

// Add event listener for queue updates
export const addQueueEventListener = (callback: (data: unknown) => void) => {
  const socket = getSocketClient();
  socket.on('queue_updated', callback);
  socket.on('queue_entry_updated', callback);
  socket.on('queue_entry_added', callback);
  socket.on('queue_entry_removed', callback);
  socket.on('queue_position_updated', callback);
  socket.on('user_queue_status', callback);
};

// Add event listener for notifications
export const addNotificationEventListener = (callback: (data: unknown) => void) => {
  const socket = getSocketClient();
  socket.on('notification_update', callback);
};

// Remove event listeners
export const removeEventListeners = (eventName: string) => {
  const socket = getSocketClient();
  socket.off(eventName);
};

// Disconnect from socket
export const disconnectSocket = () => {
  const socket = getSocketClient();
  socket.disconnect();
  console.log('🔌 Disconnected from WebSocket server');
};

// Health check for socket server
export const checkSocketServerHealth = async () => {
  try {
    const response = await fetch('https://ashram-queue-socket-server.onrender.com/health');
    const data = await response.json();
    return {
      success: true,
      data,
      message: 'Socket server is healthy'
    };
  } catch (error) {
    console.error('Socket server health check failed:', error);
    return {
      success: false,
      data: null,
      message: 'Socket server health check failed'
    };
  }
};

const socketIntegration = {
  initializeSocket,
  connectToSocketServer,
  getSocketConnectionStatus,
  subscribeToQueueEvents,
  subscribeToNotificationEvents,
  requestQueueUpdate,
  requestUserQueueStatus,
  requestGurujiQueue,
  addQueueEventListener,
  addNotificationEventListener,
  removeEventListeners,
  disconnectSocket,
  checkSocketServerHealth
};

export default socketIntegration;
