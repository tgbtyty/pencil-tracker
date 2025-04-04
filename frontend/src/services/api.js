// Base API URL - would be configured based on environment
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Helper function for API requests
// Helper function for API requests
async function fetchAPI(endpoint, options = {}) {
    const url = `${API_URL}/${endpoint}`;
    
    const token = localStorage.getItem('token');
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
    };
    
    const response = await fetch(url, { ...defaultOptions, ...options });
    
    if (response.status === 401) {
      // Unauthorized, clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      throw new Error('Session expired. Please login again.');
    }
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    }
    
    return response.json();
  }

// Get all detectors with their current item counts
export function getDetectors() {
  return fetchAPI('detectors');
}

// Get details for a specific detector
export function getDetectorById(id) {
  return fetchAPI(`detectors/${id}`);
}

// Get furniture categories
export function getFurnitureCategories() {
  return fetchAPI('furniture/categories');
}

// Add a new furniture category
export function addFurnitureCategory(name) {
  return fetchAPI('furniture/categories', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

// Validate a beacon UUID
export function validateBeacon(uuid) {
  return fetchAPI(`beacons/validate/${uuid}`);
}

// Register a new furniture item with a beacon
export async function registerFurniture(data) {
  const formData = new FormData();
  
  // Add text fields
  formData.append('beaconUUID', data.beaconUUID);
  formData.append('name', data.name);
  formData.append('categoryId', data.category);
  formData.append('description', data.description);
  
  // Add image files
  if (data.images && data.images.length) {
    data.images.forEach((image, index) => {
      formData.append(`image${index}`, image);
    });
  }
  
  const response = await fetch(`${API_URL}/furniture`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to register furniture');
  }
  
  return response.json();
}

// Get analytics data for the past week
export function getWeeklyAnalytics() {
  return fetchAPI('analytics/weekly');
}

export default {
  getDetectors,
  getDetectorById,
  getFurnitureCategories,
  addFurnitureCategory,
  validateBeacon,
  registerFurniture,
  getWeeklyAnalytics
};