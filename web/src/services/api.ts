import axios from "axios";

// Using the same URL as the mobile app API gateway
const BASE_URL = "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// We can add interceptors for Auth tokens later
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const token = localStorage.getItem("access_token");
    const isMockToken = token && token.startsWith("mock-token");
    
    // Only force logout if it's a real token that got rejected
    if (error.response && error.response.status === 401 && !isMockToken) {
      localStorage.removeItem("access_token");
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

