import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { interviewAPI } from "../services/api";
import {
  MessageSquare,
  Send,
  CheckCircle,
  Clock,
  User,
  Award,
  ArrowLeft,
  Loader,
  Mic,
  MicOff,
  Volume2,
} from "lucide-react";
import toast from "react-hot-toast";

const InterviewSession = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const noResponseTimerRef = useRef(null);
  const finalWaitTimerRef = useRef(null);
  const endedRef = useRef(false);
  const hasGreetedRef = useRef(false);
  const preGreetedRef = useRef(false);

  // Helpers for realistic conversation
  const isUnsureAnswer = (text) => {
    if (!text || typeof text !== "string") return false;
    const patterns = [
      /\bi\s*don'?t\s*know\b/i,
      /\bdo\s*not\s*know\b/i,
      /\bnot\s*sure\b/i,
      /\bno\s*idea\b/i,
      /\bi'?m\s*not\s*sure\b/i,
      /\bunsure\b/i,
      /\bidk\b/i,
      /\bpass\b/i,
    ];
    return patterns.some((re) => re.test(text));
  };

  const shouldAskFollowUp = (text) => {
    if (!text) return false;
    if (isUnsureAnswer(text)) return false;
    const wordCount = text.trim().split(/\s+/).length;
    return wordCount < 12; // short answers trigger a follow-up
  };

  const getFollowUpQuestion = (role) => {
    const prompts = [
      "Could you walk me through a specific example?",
      "What was the impact or outcome of your approach?",
      "Which tools or techniques did you use?",
      "What challenges did you face and how did you handle them?",
      "How did you measure success in that situation?",
    ];
    // Optionally tailor first prompt by role category
    return prompts[0];
  };

  const speakAsync = (text) =>
    new Promise((resolve) => {
      speak(text, { onEnd: resolve });
    });

  useEffect(() => {
    fetchSession();
    const hasTTS = typeof window !== "undefined" && "speechSynthesis" in window;
    const SpeechRecognition =
      typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);
    setVoiceSupported(Boolean(hasTTS && SpeechRecognition));
    try {
      preGreetedRef.current =
        sessionStorage.getItem("rick_pre_greeted") === "1";
      if (preGreetedRef.current) sessionStorage.removeItem("rick_pre_greeted");
    } catch (_) {}
  }, [sessionId]);

  useEffect(() => {
    if (
      !voiceSupported ||
      !session ||
      session.status === "completed" ||
      !session.questions ||
      !session.questions[currentQuestionIndex]
    ) {
      return;
    }

    // If first question and not greeted yet, greet and ask immediately
    if (currentQuestionIndex === 0 && !hasGreetedRef.current) {
      const firstQ = session.questions[0].question;
      const name = session.user_name || session.name || "there";
      hasGreetedRef.current = true;
      const greet = preGreetedRef.current
        ? "Let's begin."
        : `Hello ${name}. Hope you're doing good. Let's start your interview. First question: ${firstQ}`;
      speak(greet, {
        onEnd: () => startListeningWithTimeouts(),
      });
      return;
    }

    const q = session.questions[currentQuestionIndex].question;
    speak(q, {
      onEnd: () => {
        startListeningWithTimeouts();
      },
    });

    return () => {
      try {
        recognitionRef.current?.abort?.();
        window?.speechSynthesis?.cancel?.();
      } catch (_) {}
    };
  }, [voiceSupported, session, currentQuestionIndex]);

  const startListeningWithTimeouts = () => {
    if (!voiceSupported) return;
    startListening();
    // After 10 seconds without answer text, warn and give another 10 seconds
    setTimeout(() => {
      if (!currentAnswer.trim()) {
        speak("I didn't hear a response. Please answer now.", {
          onEnd: () => {
            setTimeout(async () => {
              if (!currentAnswer.trim() && !endedRef.current) {
                stopListening();
                try {
                  await completeInterview();
                  endedRef.current = true;
                } catch (_) {}
              }
            }, 10000);
          },
        });
      }
    }, 10000);
  };

  const fetchSession = async () => {
    try {
      const response = await interviewAPI.getSession(sessionId);
      console.log("Fetched session:", response);
      setSession(response.data.session);

      // If session is completed, show results
      console.log("Session data:", response.data.session);
      if (response.data.session.status === "completed") {
        console.log("Session is completed, showing results");
        setShowResults(true);
      }
    } catch (error) {
      console.error("Error fetching session:", error);
      toast.error("Failed to load interview session");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!currentAnswer.trim()) {
      toast.error("Please provide an answer");
      return;
    }

    setSubmitting(true);

    try {
      // Optionally ask one follow-up before submitting
      let combinedAnswer = currentAnswer.trim();
      if (voiceSupported && shouldAskFollowUp(combinedAnswer)) {
        const followUp = getFollowUpQuestion(session.role);
        await speakAsync(followUp);
        // Listen for the follow-up reply
        const followUpText = await new Promise((resolve) => {
          const SpeechRecognition =
            window.SpeechRecognition || window.webkitSpeechRecognition;
          if (!SpeechRecognition) return resolve("");
          const recognition = new SpeechRecognition();
          recognition.lang = "en-US";
          recognition.interimResults = true;
          recognition.maxAlternatives = 1;
          let finalTranscript = "";
          setListening(true);
          recognition.start();
          recognition.onresult = (event) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const transcript = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                finalTranscript += transcript + " ";
              }
            }
          };
          recognition.onerror = () => {
            setListening(false);
          };
          recognition.onend = () => {
            setListening(false);
            resolve(finalTranscript.trim());
          };
        });
        if (followUpText) {
          combinedAnswer = `${combinedAnswer}\n\nFollow-up: ${followUpText}`;
        }
      }

      const response = await interviewAPI.submitAnswer(session.id, {
        question_id:
          session.questions?.[currentQuestionIndex]?.id ||
          currentQuestionIndex + 1,
        answer: combinedAnswer,
      });

      // Update session with new answer
      setSession((prev) => ({
        ...prev,
        answers: [
          ...(prev.answers || []),
          {
            question:
              session.questions?.[currentQuestionIndex]?.question ||
              "Question not available",
            answer: currentAnswer,
            feedback: response.data.feedback,
            question_id: response.data.question_id,
          },
        ],
      }));

      setCurrentAnswer("");

      // Move to next question or complete — no per-question feedback spoken
      const isLast = currentQuestionIndex + 1 >= session.questions.length;
      if (voiceSupported) {
        if (!isLast) {
          const nextQ = session.questions[currentQuestionIndex + 1]?.question;
          setCurrentQuestionIndex((idx) => idx + 1);
          if (nextQ) {
            await speakAsync("Let's proceed to the next question.");
            await speakAsync(nextQ);
            startListeningWithTimeouts();
          }
        } else {
          await speakAsync(
            "That was the last question. Wrapping up your results now."
          );
          await completeInterview();
        }
      } else {
        // Non-voice fallback
        if (!isLast) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
          toast.success("Answer submitted! Moving to next question.");
        } else {
          await completeInterview();
        }
      }
    } catch (error) {
      console.error("Error submitting answer:", error);
      toast.error("Failed to submit answer");
    } finally {
      setSubmitting(false);
    }
  };

  const speak = (text, { onEnd } = {}) => {
    try {
      if (!voiceSupported) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1;
      utter.pitch = 1;
      utter.lang = "en-US";
      if (onEnd) utter.onend = onEnd;
      window.speechSynthesis.speak(utter);
    } catch (_) {}
  };

  const startListening = () => {
    try {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) return;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = "en-US";
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      let finalTranscript = "";
      setListening(true);
      recognition.start();
      recognition.onresult = (event) => {
        // Accumulate only; do not require manual submit
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + " ";
          }
        }
        setCurrentAnswer(finalTranscript.trim());
      };
      recognition.onerror = () => {
        setListening(false);
      };
      recognition.onend = async () => {
        setListening(false);
        // Auto submit if we captured speech
        if (currentAnswer.trim() && !endedRef.current) {
          try {
            await handleSubmitAnswer();
          } catch (_) {}
        }
      };
    } catch (_) {}
  };

  const stopListening = () => {
    try {
      recognitionRef.current?.stop?.();
    } catch (_) {}
    setListening(false);
  };

  const completeInterview = async () => {
    setCompleting(true);

    try {
      const response = await interviewAPI.completeInterview(session.id);

      // Update session with final evaluation
      setSession((prev) => ({
        ...prev,
        status: "completed",
        overall_evaluation: response.data.overall_evaluation,
      }));

      setShowResults(true);
      toast.success("Interview completed! Check your results below.");

      // Speak overall experience summary
      try {
        const overall = response?.data?.overall_evaluation;
        const overallText = overall?.overall_feedback || overall?.feedback;
        if (voiceSupported && overallText) {
          await speakAsync("Here's my overall feedback on your interview.");
          await speakAsync(overallText);
        }
      } catch (_) {}
    } catch (error) {
      console.error("Error completing interview:", error);
      toast.error("Failed to complete interview");
    } finally {
      setCompleting(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && e.ctrlKey) {
      handleSubmitAnswer();
    }
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

  if (!session) {
    return (
      <div className="interview-container">
        <div className="text-center">
          <p className="text-gray-600">Session not found</p>
        </div>
      </div>
    );
  }

  if (showResults) {
    return (
      <div className="interview-container">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto h-16 w-16 bg-green-600 rounded-full flex items-center justify-center mb-4">
              <Award className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Interview Completed!
            </h1>
            <p className="text-gray-600">
              Great job, {session.user_name || session.name}! Here's your
              interview summary
            </p>
          </div>

          {/* Overall Evaluation */}
          {session.overall_evaluation && (
            <div className="card mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Overall Evaluation
              </h2>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800">
                  {session.overall_evaluation.overall_feedback}
                </p>
              </div>
            </div>
          )}

          {/* Questions and Answers */}
          <div className="space-y-6">
            {(session.answers || []).map((qa, index) => (
              <div key={index} className="card">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Question {index + 1}
                  </h3>
                  <p className="text-gray-700">{qa.question}</p>
                </div>

                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">
                    Your Answer:
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-700">{qa.answer}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Rick's Feedback:
                  </h4>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-blue-800">
                      {typeof qa.feedback === "object"
                        ? qa.feedback.feedback
                        : qa.feedback}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={async () => {
                try {
                  const res = await interviewAPI.downloadReport(session.id);
                  const blob = new Blob([res.data], {
                    type: "application/pdf",
                  });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `interview_report_${session.id}.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  window.URL.revokeObjectURL(url);
                } catch (err) {
                  console.error("Download report failed:", err);
                  toast.error("Failed to download report");
                }
              }}
              className="btn-secondary flex items-center justify-center"
            >
              <ArrowLeft className="h-5 w-5 mr-2 rotate-180" />
              Download PDF Report
            </button>
            <button
              onClick={() => navigate("/interview")}
              className="btn-primary flex items-center justify-center"
            >
              <MessageSquare className="h-5 w-5 mr-2" />
              Start New Interview
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="btn-secondary flex items-center justify-center"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Add safety checks for session.questions
  if (
    !session.questions ||
    !Array.isArray(session.questions) ||
    session.questions.length === 0
  ) {
    return (
      <div className="interview-container">
        <div className="text-center">
          <p className="text-gray-600">
            No questions available for this interview session
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="btn-primary mt-4"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = session.questions[currentQuestionIndex] || {
    question: "Question not available",
  };
  const progress =
    ((currentQuestionIndex + 1) / session.questions.length) * 100;

  return (
    <div className="interview-container">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Interview with Rick
              </h1>
              <p className="text-gray-600">
                {session.user_name || session.name} •{" "}
                {session.role
                  .replace("_", " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase())}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">
                Question {currentQuestionIndex + 1} of{" "}
                {session.questions.length}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="h-4 w-4 mr-1" />
                In Progress
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Rick's Message */}
        <div className="card mb-6">
          <div className="flex items-start space-x-3">
            <div className="h-10 w-10 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="bg-primary-50 rounded-lg p-4">
                <p className="text-primary-900 font-medium mb-2">Rick says:</p>
                <p className="text-primary-800">{currentQuestion.question}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Voice-Only Answer Input (if supported) */}
        {voiceSupported ? (
          <div className="card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`h-3 w-3 rounded-full ${
                    listening ? "bg-green-500" : "bg-gray-300"
                  }`}
                  aria-label={listening ? "listening" : "not listening"}
                />
                <p className="text-sm text-gray-700">
                  {listening
                    ? "Rick is listening..."
                    : "Rick is paused. Tap resume to continue."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {listening ? (
                  <button
                    onClick={stopListening}
                    className="btn-secondary flex items-center"
                  >
                    <MicOff className="h-4 w-4 mr-2" /> Pause Listening
                  </button>
                ) : (
                  <button
                    onClick={startListening}
                    className="btn-primary flex items-center"
                  >
                    <Mic className="h-4 w-4 mr-2" /> Resume Listening
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              No typing needed. Answer out loud and Rick will evaluate
              automatically.
            </p>
          </div>
        ) : (
          // Fallback: text input when voice not supported
          <div className="card">
            <label
              htmlFor="answer"
              className="block text-sm font-medium text-gray-700 mb-3"
            >
              Your Answer
            </label>
            <textarea
              id="answer"
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your answer here... (Ctrl+Enter to submit)"
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              disabled={submitting}
            />

            <div className="mt-4 flex justify-between items-center">
              <p className="text-sm text-gray-500">
                Press Ctrl+Enter to submit your answer
              </p>
              <button
                onClick={handleSubmitAnswer}
                disabled={submitting || !currentAnswer.trim()}
                className="btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Answer
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Previous Answers */}
        {session.answers &&
          Array.isArray(session.answers) &&
          session.answers.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Previous Answers
              </h3>
              <div className="space-y-4">
                {session.answers.map((qa, index) => (
                  <div key={index} className="card">
                    <div className="mb-3">
                      <h4 className="font-medium text-gray-900 mb-2">
                        Question {index + 1}
                      </h4>
                      <p className="text-gray-700 text-sm">{qa.question}</p>
                    </div>

                    <div className="mb-3">
                      <h5 className="font-medium text-gray-900 mb-1">
                        Your Answer:
                      </h5>
                      <p className="text-gray-700 text-sm">{qa.answer}</p>
                    </div>

                    <div>
                      <h5 className="font-medium text-gray-900 mb-1">
                        Feedback:
                      </h5>
                      <div className="bg-green-50 border border-green-200 rounded p-2">
                        <p className="text-green-800 text-sm">
                          {typeof qa.feedback === "object"
                            ? qa.feedback.feedback
                            : qa.feedback}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default InterviewSession;
