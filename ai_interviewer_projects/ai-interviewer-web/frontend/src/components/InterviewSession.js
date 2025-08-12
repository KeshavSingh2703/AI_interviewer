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

  useEffect(() => {
    fetchSession();
    const hasTTS = typeof window !== "undefined" && "speechSynthesis" in window;
    const SpeechRecognition =
      typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);
    setVoiceSupported(Boolean(hasTTS && SpeechRecognition));
  }, [sessionId]);

  useEffect(() => {
    if (
      voiceSupported &&
      session &&
      session.status !== "completed" &&
      session.questions &&
      session.questions[currentQuestionIndex]
    ) {
      const q = session.questions[currentQuestionIndex].question;
      speak(q, {
        onEnd: () => {
          startListeningWithTimeouts();
        },
      });
    }
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
      } else if (voiceSupported) {
        // Read the first question
        const firstQ = response?.data?.session?.questions?.[0]?.question;
        if (firstQ) speak(firstQ);
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
      const response = await interviewAPI.submitAnswer(session.id, {
        question_id:
          session.questions?.[currentQuestionIndex]?.id ||
          currentQuestionIndex + 1,
        answer: currentAnswer,
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

      // Move to next question or complete interview
      if (currentQuestionIndex + 1 < session.questions.length) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        toast.success("Answer submitted! Moving to next question.");
        if (voiceSupported) {
          const nextQ = session.questions[currentQuestionIndex + 1]?.question;
          if (nextQ) speak(nextQ);
        }
      } else {
        await completeInterview();
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
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + " ";
          } else {
            interim += transcript;
          }
        }
        setCurrentAnswer((finalTranscript + interim).trim());
      };
      recognition.onerror = () => {
        setListening(false);
      };
      recognition.onend = async () => {
        setListening(false);
        // Auto submit if have text
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
                    Gwen's Feedback:
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
                Interview with Gwen
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

        {/* Gwen's Message */}
        <div className="card mb-6">
          <div className="flex items-start space-x-3">
            <div className="h-10 w-10 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="bg-primary-50 rounded-lg p-4">
                <p className="text-primary-900 font-medium mb-2">Gwen says:</p>
                <p className="text-primary-800">{currentQuestion.question}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Answer Input */}
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
