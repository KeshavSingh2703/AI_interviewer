import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { interviewAPI } from "../services/api";
import {
  Briefcase,
  User,
  Play,
  ArrowRight,
  Loader,
  Mic,
  Volume2,
  Upload,
  FileText,
  CheckCircle,
} from "lucide-react";
import toast from "react-hot-toast";

const Interview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [formData, setFormData] = useState({
    role: "",
    user_name: user?.full_name || "",
  });
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const [resumeOptIn, setResumeOptIn] = useState(false);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeText, setResumeText] = useState("");
  const [resumeSuggestedRole, setResumeSuggestedRole] = useState("");
  const [resumeSkills, setResumeSkills] = useState(null);

  useEffect(() => {
    fetchRoles();
    // Detect browser support for Speech Synthesis and Recognition
    const hasTTS = typeof window !== "undefined" && "speechSynthesis" in window;
    const SpeechRecognition =
      typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);
    setVoiceSupported(Boolean(hasTTS && SpeechRecognition));
  }, []);

  const fetchRoles = async () => {
    const fallbackRoles = [
      "cloud_engineer",
      "backend_engineer",
      "frontend_engineer",
      "ui_ux_designer",
      "sde",
      "data_analyst",
      "ai_engineer",
    ];

    try {
      const response = await interviewAPI.getRoles();
      const apiRoles = Array.isArray(response?.data?.roles)
        ? response.data.roles
        : [];

      const sourceRoles = apiRoles.length > 0 ? apiRoles : fallbackRoles;

      const transformedRoles = sourceRoles.map((role) => ({
        id: role,
        name: role
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" "),
      }));

      setRoles(transformedRoles);
      // Preselect the first role if none selected yet
      if (!formData.role && transformedRoles.length > 0) {
        setFormData((prev) => ({ ...prev, role: transformedRoles[0].id }));
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
      // Use fallback roles on error
      const transformedRoles = fallbackRoles.map((role) => ({
        id: role,
        name: role
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" "),
      }));
      setRoles(transformedRoles);
      if (!formData.role && transformedRoles.length > 0) {
        setFormData((prev) => ({ ...prev, role: transformedRoles[0].id }));
      }
      toast.error("Failed to load interview roles (showing defaults)");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let resolvedName = formData.user_name.trim();
    // If name is missing and voice is supported, ask via voice first
    if (!resolvedName && voiceSupported) {
      try {
        const name = await askNameViaVoice();
        if (!name) {
          toast.error("Didn't catch your name. Please try again or type it.");
          return;
        }
        resolvedName = name;
        setFormData((prev) => ({ ...prev, user_name: name }));
      } catch (err) {
        toast.error("Voice input failed. Please type your name.");
        return;
      }
    }

    if (!formData.role || !resolvedName) {
      toast.error("Please fill in all fields");
      return;
    }

    setStarting(true);

    try {
      // Speak immediate greeting on click and mark as pre-greeted for the session view
      if (voiceSupported) {
        speak(
          `Hello ${resolvedName}. Hope you're doing good. Let's start your interview.`,
        );
        try {
          sessionStorage.setItem("rick_pre_greeted", "1");
        } catch (_) {}
      }

      const response = await interviewAPI.startInterview({
        role: formData.role,
        name: resolvedName,
        resume_text: resumeOptIn && resumeText ? resumeText : undefined,
      });
      toast.success("Interview started! Rick is ready to meet you.");
      navigate(`/interview/${response.data.session_id}`);
    } catch (error) {
      console.error("Error starting interview:", error);
      toast.error(error.response?.data?.detail || "Failed to start interview");
    } finally {
      setStarting(false);
    }
  };

  const handleResumeFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a PDF resume");
      return;
    }
    setResumeUploading(true);
    try {
      const { data } = await interviewAPI.uploadResume(file);
      setResumeText(data.text || "");
      setResumeSkills(data.skills || null);
      setResumeSuggestedRole(data.suggested_role || "");
      if (data.suggested_role && !formData.role) {
        setFormData((prev) => ({ ...prev, role: data.suggested_role }));
      }
      toast.success("Resume uploaded. Questions will be personalized.");
    } catch (err) {
      console.error("Resume upload failed:", err);
      toast.error(err.response?.data?.detail || "Failed to parse resume");
      setResumeText("");
      setResumeSkills(null);
      setResumeSuggestedRole("");
    } finally {
      setResumeUploading(false);
    }
  };

  const speak = (text) => {
    try {
      if (!voiceSupported) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1;
      utter.pitch = 1;
      utter.lang = "en-US";
      window.speechSynthesis.speak(utter);
    } catch (_) {
      // no-op
    }
  };

  const askNameViaVoice = () => {
    return new Promise((resolve, reject) => {
      try {
        const SpeechRecognition =
          window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return reject(new Error("No STT"));

        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.lang = "en-US";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        // Prompt
        speak("Please tell me your name.");

        setTimeout(() => {
          setListening(true);
          recognition.start();
        }, 600);

        recognition.onresult = (event) => {
          const transcript = event.results?.[0]?.[0]?.transcript || "";
          setListening(false);
          resolve(transcript.trim());
        };
        recognition.onerror = () => {
          setListening(false);
          reject(new Error("recognition error"));
        };
        recognition.onend = () => {
          setListening(false);
        };
      } catch (err) {
        reject(err);
      }
    });
  };

  const roleDescriptions = {
    cloud_engineer:
      "Design and manage cloud infrastructure, DevOps practices, and scalable systems.",
    backend_engineer:
      "Build robust server-side applications, APIs, and database systems.",
    frontend_engineer:
      "Create responsive user interfaces and interactive web applications.",
    ui_ux_designer:
      "Design user experiences and create intuitive, accessible interfaces.",
    sde: "Full-stack development with focus on software engineering principles.",
    data_analyst:
      "Analyze data, create insights, and drive data-informed decisions.",
    ai_engineer: "Develop machine learning models and AI-powered applications.",
  };

  if (loading) {
    return (
      <div className="interview-container">
        <div className="flex items-center justify-center min-h-64">
          <Loader className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="interview-container">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-primary-600 rounded-full flex items-center justify-center mb-4">
            <Briefcase className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Start Your Interview
          </h1>
          <p className="text-gray-600">
            Choose your role and begin practicing with Rick, your AI interviewer
          </p>
        </div>

        {/* Interview Setup Form */}
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Input (optional if using voice) */}
            <div>
              <label
                htmlFor="user_name"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Your Name
              </label>
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <input
                    id="user_name"
                    name="user_name"
                    type="text"
                    className="input-field pl-10"
                    placeholder={
                      voiceSupported
                        ? "You can say your name using the mic"
                        : "Enter your name"
                    }
                    value={formData.user_name}
                    onChange={handleChange}
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
                {voiceSupported && (
                  <button
                    type="button"
                    onClick={askNameViaVoice}
                    className={`btn-secondary flex items-center whitespace-nowrap ${
                      listening ? "opacity-75" : ""
                    }`}
                    title="Say your name"
                  >
                    <Mic className="h-4 w-4 mr-2" />
                    {listening ? "Listening..." : "Speak"}
                  </button>
                )}
                {voiceSupported && (
                  <button
                    type="button"
                    onClick={() => speak("Please tell me your name.")}
                    className="btn-secondary flex items-center"
                    title="Hear prompt"
                  >
                    <Volume2 className="h-4 w-4 mr-2" />
                    Prompt
                  </button>
                )}
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Interview Role
              </label>
              <div className="grid grid-cols-1 gap-3">
                {roles.map((role) => (
                  <div
                    key={role.id}
                    className={`relative border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                      formData.role === role.id
                        ? "border-primary-500 bg-primary-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setFormData({ ...formData, role: role.id })}
                  >
                    <div className="flex items-center">
                      <div
                        className={`w-4 h-4 rounded-full border-2 mr-3 ${
                          formData.role === role.id
                            ? "border-primary-500 bg-primary-500"
                            : "border-gray-300"
                        }`}
                      >
                        {formData.role === role.id && (
                          <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">
                          {role.name}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {roleDescriptions[role.id] ||
                            "Practice interview questions for this role."}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {resumeSuggestedRole && (
                <div className="text-xs text-gray-600 mt-2">
                  Suggested by resume: <span className="font-medium">{resumeSuggestedRole.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}</span>
                </div>
              )}
            </div>

            {/* Resume Upload (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Personalize with your resume (optional)
              </label>
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    id="resumeOptIn"
                    type="checkbox"
                    className="mr-2"
                    checked={resumeOptIn}
                    onChange={(e) => setResumeOptIn(e.target.checked)}
                  />
                  <label htmlFor="resumeOptIn" className="text-sm text-gray-700">
                    Use my resume to tailor the first questions
                  </label>
                </div>

                {resumeOptIn && (
                  <div className="flex items-center gap-3">
                    <label className="btn-secondary inline-flex items-center cursor-pointer">
                      <Upload className="h-4 w-4 mr-2" /> Upload PDF
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        className="hidden"
                        onChange={handleResumeFileChange}
                        disabled={resumeUploading}
                      />
                    </label>
                    {resumeUploading && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Loader className="h-4 w-4 animate-spin mr-2" /> Parsing resume...
                      </div>
                    )}
                    {!resumeUploading && resumeText && (
                      <div className="flex items-center text-sm text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
                        <CheckCircle className="h-4 w-4 mr-1" /> Resume parsed
                      </div>
                    )}
                  </div>
                )}

                {resumeOptIn && resumeSkills && (
                  <div className="bg-gray-50 border border-gray-200 rounded p-3">
                    <div className="flex items-center text-sm font-medium text-gray-800 mb-1">
                      <FileText className="h-4 w-4 mr-2" /> Detected skills for {formData.role.replace(/_/g, " ")}
                    </div>
                    <div className="text-xs text-gray-700">
                      {(resumeSkills[formData.role] || []).slice(0, 6).join(", ") || "No specific skills detected for this role"}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Start Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={
                  starting || !formData.role || !formData.user_name.trim()
                }
                className="btn-primary w-full flex items-center justify-center py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {starting ? (
                  <>
                    <Loader className="h-5 w-5 animate-spin mr-2" />
                    Starting Interview...
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5 mr-2" />
                    Start Interview with Rick
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Tips */}
        <div className="mt-8 card bg-blue-50 border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            💡 Interview Tips
          </h3>
          <ul className="text-blue-800 space-y-1 text-sm">
            <li>• Take your time to think before answering</li>
            <li>• Provide specific examples from your experience</li>
            <li>• Be honest about your strengths and areas for improvement</li>
            <li>• Rick will provide real-time feedback to help you improve</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Interview;
