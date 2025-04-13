// This file contains the API URL configuration for the frontend application.
// It sets the API URL based on the environment variable or defaults to localhost.
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

export default API_URL;
