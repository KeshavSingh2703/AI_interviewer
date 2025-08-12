import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
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
    if (error.response?.status === 401) {
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
};

export default api;
