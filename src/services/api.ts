import axios from 'axios';

// Change baseURL for mobile: Android emulator uses 'http://10.0.2.2:3001', iOS simulator uses 'http://localhost:3001'.
const BASE_URL =
  window && window.navigator && window.navigator.product === 'ReactNative'
    ? 'http://10.0.2.2:3001'
    : 'http://localhost:3001';

const api = axios.create({ baseURL: BASE_URL });

export const getUsers = () => api.get('/users');
export const getReviews = () => api.get('/reviews');
export const getReviewsInline = () => api.get('/reviews-inline');

// Add POST/PUT with token as needed.
