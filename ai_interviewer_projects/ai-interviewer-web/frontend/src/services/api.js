import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Decode JWT payload safely and check expiration
function isTokenExpired(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(
      decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      )
    );
    if (!json || !json.exp) return true;
    const nowSec = Math.floor(Date.now() / 1000);
    return json.exp <= nowSec;
  } catch (_) {
    return true;
  }
}

// Request interceptor to add JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      // Proactively clear expired tokens to avoid 403s
      if (isTokenExpired(token)) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        if (typeof window !== "undefined" && window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        return Promise.reject(new axios.Cancel("Expired token"));
      }
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Clear stored data and redirect to login
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export const interviewAPI = {
  startInterview: (data) => api.post("/api/interview/start", data),
  submitAnswer: (sessionId, data) =>
    api.post(`/api/interview/submit-answer/${sessionId}`, data),
  completeInterview: (sessionId) =>
    api.post(`/api/interview/complete/${sessionId}`),
  getSession: (sessionId) => api.get(`/api/interview/session/${sessionId}`),
  getUserInterviews: () => api.get("/api/user/interviews"),
  getRoles: () => api.get("/api/roles"),
  uploadResume: (file) => {
    const form = new FormData();
    form.append("resume", file);
    return api.post("/api/resume/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  downloadReport: (sessionId) =>
    api.get(`/api/interview/report/${sessionId}`, { responseType: "blob" }),
};

export default api;
