const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const morgan = require("morgan");
const { MongoClient, ObjectId } = require("mongodb");
const { v4: uuidv4 } = require("uuid");
const multer = require("multer");
const PDFDocument = require("pdfkit");
let pdfParse = null;
try {
  // Optional dependency; enable resume PDF parsing when installed
  pdfParse = require("pdf-parse");
} catch (_) {
  pdfParse = null;
}
// Try to import ollama, but don't fail if it's not available
let ollama;

try {
  const ollamaModule = require("ollama");
  ollama = ollamaModule?.default ?? ollamaModule;
} catch (error) {
  console.log("⚠️  Ollama not available, using fallback evaluation");
  ollama = null;
}
require("dotenv").config({ path: "config.env" });

const app = express();
app.use(cors());
app.use(morgan("dev")); // Logging middleware
const PORT = process.env.PORT || 8000;

// JWT Configuration
const JWT_SECRET =
  process.env.JWT_SECRET || "your-jwt-secret-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

// AI Agent Questions and Roles (from ai-interviewer-voice)
const QUESTIONS = {
  cloud_engineer: [
    "Tell me about your experience with cloud platforms like AWS, Azure, or GCP.",
    "How would you design a highly available system in the cloud?",
    "What's your experience with containerization and orchestration tools?",
    "How do you handle security in cloud environments?",
    "Describe a time when you had to troubleshoot a production issue in the cloud.",
    "What's your experience with Infrastructure as Code tools?",
    "How do you approach cost optimization in cloud environments?",
    "Tell me about your experience with CI/CD pipelines.",
  ],
  backend_engineer: [
    "Tell me about your experience with backend technologies and frameworks.",
    "How would you design a scalable database architecture?",
    "What's your experience with API design and development?",
    "How do you handle data consistency in distributed systems?",
    "Describe a challenging backend problem you solved.",
    "What's your experience with microservices architecture?",
    "How do you approach performance optimization?",
    "Tell me about your experience with testing strategies.",
  ],
  frontend_engineer: [
    "Tell me about your experience with frontend frameworks and libraries.",
    "How do you approach responsive design and cross-browser compatibility?",
    "What's your experience with state management in frontend applications?",
    "How do you optimize frontend performance?",
    "Describe a complex UI component you built.",
    "What's your experience with modern JavaScript and TypeScript?",
    "How do you approach accessibility in web applications?",
    "Tell me about your experience with build tools and bundlers.",
  ],
  ui_ux_designer: [
    "Walk me through your design process from research to final design.",
    "How do you approach user research and usability testing?",
    "Tell me about a design challenge you faced and how you solved it.",
    "How do you ensure your designs are accessible and inclusive?",
    "What's your experience with design systems and component libraries?",
    "How do you collaborate with developers and product managers?",
    "Describe a project where you had to balance user needs with business requirements.",
    "What design tools and software are you most comfortable with?",
  ],
  sde: [
    "Tell me about your experience with data structures and algorithms.",
    "How would you approach solving a complex programming problem?",
    "Describe a time when you had to optimize code for performance.",
    "What's your experience with system design and architecture?",
    "How do you approach debugging and troubleshooting?",
    "Tell me about a challenging project you worked on.",
    "What's your experience with version control and collaboration?",
    "How do you stay updated with new technologies and best practices?",
  ],
  data_analyst: [
    "Tell me about your experience with data analysis and visualization tools.",
    "How do you approach cleaning and preprocessing data?",
    "Describe a time when you had to present complex data insights to stakeholders.",
    "What's your experience with SQL and database querying?",
    "How do you ensure data quality and accuracy in your analysis?",
    "Tell me about a data-driven decision you helped make.",
    "What's your experience with statistical analysis and modeling?",
    "How do you approach storytelling with data?",
  ],
  ai_engineer: [
    "Tell me about your experience with machine learning frameworks and libraries.",
    "How do you approach feature engineering and model selection?",
    "Describe a machine learning project you worked on from start to finish.",
    "What's your experience with deep learning and neural networks?",
    "How do you handle overfitting and model validation?",
    "Tell me about your experience with MLOps and model deployment.",
    "What's your experience with natural language processing or computer vision?",
    "How do you stay updated with the latest AI research and developments?",
  ],
};

// General questions for all roles
const GENERAL_QUESTIONS = [
  "Tell me about yourself and your background.",
  "What are your greatest strengths?",
  "What areas are you looking to improve?",
  "Where do you see yourself in five years?",
  "Why are you interested in this role?",
  "Describe a challenging situation you faced at work and how you handled it.",
  "What's your experience working in teams?",
  "How do you handle stress and pressure?",
];

// Role-specific rubrics (criteria with weights). Weights should sum to 1.0
const ROLE_RUBRICS = {
  cloud_engineer: [
    {
      name: "Architecture & Scalability",
      weight: 0.35,
      description:
        "Designs highly available, scalable cloud systems; tradeoffs and patterns",
    },
    {
      name: "Security & Reliability",
      weight: 0.25,
      description: "IAM, network policies, backups, monitoring, resiliency",
    },
    {
      name: "DevOps & Automation",
      weight: 0.2,
      description: "CI/CD, IaC, container orchestration, cost optimization",
    },
    {
      name: "Communication & Clarity",
      weight: 0.2,
      description: "Clear, structured explanation with relevant examples",
    },
  ],
  backend_engineer: [
    {
      name: "System Design",
      weight: 0.35,
      description:
        "APIs, data modeling, performance, scalability, consistency tradeoffs",
    },
    {
      name: "Implementation Depth",
      weight: 0.25,
      description: "Algorithms, code structure, testing, debugging",
    },
    {
      name: "Databases & Storage",
      weight: 0.2,
      description: "SQL/NoSQL choices, indexing, transactions, caching",
    },
    {
      name: "Communication & Clarity",
      weight: 0.2,
      description: "Clarity, structure, concrete examples",
    },
  ],
  frontend_engineer: [
    {
      name: "UI Architecture & State",
      weight: 0.3,
      description: "Component design, state management, routing",
    },
    {
      name: "Performance & Accessibility",
      weight: 0.25,
      description: "Perf optimizations, a11y, responsiveness",
    },
    {
      name: "Web Fundamentals",
      weight: 0.25,
      description: "HTML/CSS/JS/TS best practices",
    },
    {
      name: "Communication & Clarity",
      weight: 0.2,
      description: "Structure, examples, tradeoffs",
    },
  ],
  ui_ux_designer: [
    {
      name: "Process & Research",
      weight: 0.35,
      description: "User research, usability testing, insights",
    },
    {
      name: "Interaction & Systems",
      weight: 0.3,
      description: "Interaction design, design systems, consistency",
    },
    {
      name: "Communication & Clarity",
      weight: 0.2,
      description: "Narrative, rationale, constraints",
    },
    {
      name: "Accessibility",
      weight: 0.15,
      description: "Inclusive design considerations",
    },
  ],
  sde: [
    {
      name: "Problem Solving",
      weight: 0.35,
      description: "DSA, complexity, correctness",
    },
    {
      name: "System Design",
      weight: 0.25,
      description: "Architecture, scalability, reliability",
    },
    {
      name: "Code Quality & Testing",
      weight: 0.2,
      description: "Clean code, tests, debugging",
    },
    {
      name: "Communication & Clarity",
      weight: 0.2,
      description: "Structure, examples, tradeoffs",
    },
  ],
  data_analyst: [
    {
      name: "Data Handling & SQL",
      weight: 0.35,
      description: "Cleaning, joins, aggregations, correctness",
    },
    {
      name: "Analysis & Insight",
      weight: 0.3,
      description: "Reasoning from data, business impact",
    },
    {
      name: "Visualization & Communication",
      weight: 0.2,
      description: "Charts, storytelling, clarity",
    },
    {
      name: "Tooling",
      weight: 0.15,
      description: "Pandas/Excel/BI tools proficiency",
    },
  ],
  ai_engineer: [
    {
      name: "ML Fundamentals",
      weight: 0.3,
      description: "Bias/variance, metrics, validation",
    },
    {
      name: "Modeling & MLOps",
      weight: 0.3,
      description: "Feature engineering, deployment, monitoring",
    },
    {
      name: "Problem Framing",
      weight: 0.2,
      description: "Objective, constraints, data suitability",
    },
    {
      name: "Communication & Clarity",
      weight: 0.2,
      description: "Structure, examples, tradeoffs",
    },
  ],
};

// Few-shot examples to anchor scoring per role (kept concise)
const ROLE_FEWSHOTS = {
  backend_engineer: [
    {
      label: "Good",
      question: "How would you design a rate limiter for an API?",
      answer:
        "I'd use a token bucket per client with Redis for atomic counters and TTL. For burst handling, refill tokens each interval and enforce a max. I'd expose headers for remaining quota and backoff.",
      rationale: "Concrete mechanism, storage choice, headers, backoff",
    },
    {
      label: "Poor",
      question: "How would you design a rate limiter for an API?",
      answer: "I'd limit requests somehow. Maybe use a database.",
      rationale: "Vague, lacks mechanism and tradeoffs",
    },
  ],
  cloud_engineer: [
    {
      label: "Good",
      question: "Design a highly available web app on AWS.",
      answer:
        "ALB -> ASG across AZs, RDS Multi-AZ, S3 for assets, CloudFront, IaC via Terraform, CloudWatch alarms, WAF, backups.",
      rationale: "HA patterns, services, IaC, ops",
    },
    {
      label: "Poor",
      question: "Design a highly available web app on AWS.",
      answer: "I'd use EC2. Maybe a database.",
      rationale: "No HA detail, no services, no ops",
    },
  ],
};

// Lightweight resume skill keywords to personalize questions (mirrors voice agent)
const RESUME_SKILLS_KEYWORDS = {
  cloud_engineer: [
    "aws",
    "azure",
    "gcp",
    "kubernetes",
    "docker",
    "terraform",
    "ansible",
    "jenkins",
    "ci/cd",
    "microservices",
    "serverless",
    "lambda",
    "ec2",
    "s3",
    "rds",
    "vpc",
    "cloudformation",
    "elasticsearch",
    "redis",
  ],
  backend_engineer: [
    "python",
    "java",
    "node.js",
    "go",
    "c++",
    "c#",
    "spring",
    "django",
    "flask",
    "express",
    "postgresql",
    "mysql",
    "mongodb",
    "redis",
    "kafka",
    "rabbitmq",
    "rest api",
    "graphql",
    "microservices",
    "docker",
  ],
  frontend_engineer: [
    "javascript",
    "typescript",
    "react",
    "vue",
    "angular",
    "html",
    "css",
    "sass",
    "webpack",
    "babel",
    "redux",
    "vuex",
    "next.js",
    "nuxt.js",
    "responsive design",
    "accessibility",
    "seo",
    "pwa",
  ],
  ui_ux_designer: [
    "figma",
    "sketch",
    "adobe xd",
    "invision",
    "prototyping",
    "wireframing",
    "user research",
    "usability testing",
    "design systems",
    "typography",
    "color theory",
    "interaction design",
    "information architecture",
  ],
  sde: [
    "data structures",
    "algorithms",
    "leetcode",
    "system design",
    "distributed systems",
    "python",
    "java",
    "c++",
    "javascript",
    "sql",
    "nosql",
    "git",
    "agile",
    "scrum",
  ],
  data_analyst: [
    "sql",
    "python",
    "r",
    "excel",
    "tableau",
    "power bi",
    "pandas",
    "numpy",
    "matplotlib",
    "seaborn",
    "statistics",
    "machine learning",
    "data visualization",
    "etl",
    "data warehousing",
    "business intelligence",
  ],
  ai_engineer: [
    "python",
    "tensorflow",
    "pytorch",
    "scikit-learn",
    "keras",
    "numpy",
    "pandas",
    "machine learning",
    "deep learning",
    "neural networks",
    "nlp",
    "computer vision",
    "reinforcement learning",
    "mlops",
    "model deployment",
    "data preprocessing",
  ],
};

const extractResumeSkills = (text) => {
  const lower = (text || "").toLowerCase();
  const found = {};
  for (const [role, keywords] of Object.entries(RESUME_SKILLS_KEYWORDS)) {
    found[role] = [];
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) {
        found[role].push(kw);
      }
    }
  }
  return found;
};

const suggestRoleFromSkills = (skillsByRole) => {
  let bestRole = "sde";
  let bestScore = -1;
  for (const [role, skills] of Object.entries(skillsByRole || {})) {
    const score = skills?.length || 0;
    if (score > bestScore) {
      bestScore = score;
      bestRole = role;
    }
  }
  return bestRole;
};

const generateResumeBasedQuestions = (role, skillsForRole) => {
  const skills = (skillsForRole || []).slice(0, 3); // personalize up to 3
  const personalized = [];
  for (const skill of skills) {
    personalized.push(
      `You mentioned ${skill} in your resume. Can you describe a project where you applied ${skill} and the impact it had?`
    );
  }
  return personalized;
};

// Helper function to get questions for a specific role
const getQuestionsForRole = (role, numQuestions = 5, resumeInfo = null) => {
  const roleQuestions = QUESTIONS[role.toLowerCase()] || QUESTIONS["sde"];
  const generalQuestions = GENERAL_QUESTIONS.slice(0, 3); // Include 3 general questions

  // Combine role-specific and general questions
  let allQuestions = [...roleQuestions, ...generalQuestions];

  // If resume info is provided, prepend a few personalized questions
  if (resumeInfo && resumeInfo.skills) {
    const skillsForRole = resumeInfo.skills[role.toLowerCase()] || [];
    const resumeQs = generateResumeBasedQuestions(role, skillsForRole);
    if (resumeQs.length > 0) {
      allQuestions = [...resumeQs, ...allQuestions];
    }
  }

  // Add IDs to questions and return a subset
  const questionsWithIds = allQuestions
    .slice(0, numQuestions)
    .map((question, index) => ({
      id: index + 1,
      question: question,
      role: role,
    }));

  return questionsWithIds;
};

// Helper function to get available roles
const getAvailableRoles = () => {
  return Object.keys(QUESTIONS);
};

// Middleware
// app.use(
//   cors({
//     origin: "http://localhost:3000",
//     credentials: true,
//   })
// );
app.use(express.json());
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// In-memory storage for development/testing
const inMemoryDB = {
  users: new Map(),
  sessions: new Map(),
};

// MongoDB Connection
let db;
const connectDB = async () => {
  try {
    const client = new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });
    await client.connect();
    db = client.db("ai_interviewer");
    console.log("✅ MongoDB connected successfully");

    // Create indexes
    await db.collection("users").createIndex({ username: 1 }, { unique: true });
    await db.collection("users").createIndex({ email: 1 }, { unique: true });
    await db.collection("sessions").createIndex({ user_id: 1 });
    await db
      .collection("sessions")
      .createIndex({ session_id: 1 }, { unique: true });

    console.log("✅ Database indexes created");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    console.log("⚠️  Starting server with in-memory storage...");
    db = null;
  }
};

// JWT Token Creation Helper
const createAccessToken = (user) => {
  return jwt.sign({ username: user.username, email: user.email }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

// Authentication Middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ detail: "Authentication required" });
    // next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    let user;

    if (db) {
      // Use MongoDB
      user = await db
        .collection("users")
        .findOne({ username: decoded.username });
    } else {
      // Use in-memory storage
      user = inMemoryDB.users.get(decoded.username);
    }

    if (!user) {
      return res.status(401).json({ detail: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(403).json({ detail: "Invalid token" });
  }
};

// AI Evaluation using Ollama (from ai-interviewer-voice)
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

const evaluateAnswer = async (question, answer, role) => {
  try {
    // Handle unsure answers with a supportive response
    if (isUnsureAnswer(answer)) {
      const score = 62;
      return {
        score,
        feedback:
          "That's completely okay. Not knowing every answer is normal in interviews. A good approach is to explain how you'd find the answer or relate similar experience.",
        suggestions: [
          "Share how you'd research or approach the problem",
          "Relate a similar concept you do understand",
          "Be honest and pivot to what you know",
        ],
      };
    }

    // If Ollama not available, mock rubric-based response
    if (!ollama) {
      const rubric = ROLE_RUBRICS[role?.toLowerCase?.()] || ROLE_RUBRICS["sde"];
      const lengthScore = Math.max(0, Math.min(100, (answer || "").length / 4));
      let weighted = 0;
      const criteria = {};
      for (const c of rubric) {
        const s = Math.round(lengthScore * (0.9 + Math.random() * 0.2));
        weighted += s * c.weight;
        criteria[c.name] = {
          score: s,
          weight: c.weight,
          reason: "Heuristic fallback without model",
        };
      }
      const score = Math.round(weighted);
      return {
        score,
        weighted_score: score,
        total_weight: 1,
        feedback:
          "Good answer. Consider adding specific examples, tradeoffs, and measurable impact to strengthen it.",
        suggestions: [
          "Add one concrete example",
          "Explain tradeoffs/decisions",
          "Quantify outcome or impact",
        ],
        criteria,
      };
    }

    // Create a prompt for evaluation with Rick's personality and a role-specific rubric + few-shots
    const rubric = ROLE_RUBRICS[role?.toLowerCase?.()] || ROLE_RUBRICS["sde"];
    const examples = ROLE_FEWSHOTS[role?.toLowerCase?.()] || [];
    const rubricText = rubric
      .map(
        (c, idx) =>
          `${idx + 1}. ${c.name} (weight ${c.weight}): ${c.description}`
      )
      .join("\n");
    const examplesText = examples
      .map(
        (ex, idx) =>
          `Example ${idx + 1} - ${ex.label}\nQ: ${ex.question}\nA: ${
            ex.answer
          }\nWhy: ${ex.rationale}`
      )
      .join("\n\n");

    const prompt = `
You are Rick, a professional and friendly AI interviewer.

Evaluate the candidate's answer using the role-specific rubric below. Score each criterion 0-100 with a brief reason, then compute a weighted_score (0-100) using the given weights (weights sum to 1.0). Return concise feedback and 3 suggestions.

Rubric:\n${rubricText}

Few-shot anchors (for reference quality; do not copy):
${examplesText || "(none)"}

Question: ${question}
Answer: ${answer}
Role: ${role}

Return JSON only:
{
  "criteria": {
    "<criterion_name>": { "score": <0-100>, "weight": <0-1>, "reason": "<short>" }
  },
  "weighted_score": <0-100>,
  "score": <0-100>,
  "feedback": "<2 short sentences>",
  "suggestions": ["<short>", "<short>", "<short>"]
}
`;

    // Use Ollama to generate structured evaluation
    const response = await ollama.chat({
      model: "llama3.1:8b" || "llama2",
      messages: [{ role: "user", content: prompt }],
    });

    // Extract and parse
    const responseText = response.message.content.trim();
    try {
      const parsedResponse = JSON.parse(responseText);
      return {
        score: parsedResponse.score ?? parsedResponse.weighted_score ?? 75,
        weighted_score:
          parsedResponse.weighted_score ?? parsedResponse.score ?? 75,
        total_weight: rubric.reduce((s, c) => s + (c.weight || 0), 0) || 1,
        feedback:
          parsedResponse.feedback ||
          "Good answer. Consider adding specific examples and tradeoffs.",
        suggestions: parsedResponse.suggestions || [
          "Provide more specific examples",
          "Explain tradeoffs",
          "Quantify impact",
        ],
        criteria: parsedResponse.criteria || {},
      };
    } catch (parseError) {
      const score = Math.floor(Math.random() * 40) + 60;
      const criteria = {};
      for (const c of rubric) {
        criteria[c.name] = {
          score,
          weight: c.weight,
          reason: "Model parse fallback",
        };
      }
      return {
        score,
        weighted_score: score,
        total_weight: 1,
        feedback: `Solid response. You scored ${score}/100. Add concrete examples and quantify results.`,
        suggestions: ["Add examples", "Explain tradeoffs", "Quantify impact"],
        criteria,
      };
    }
  } catch (error) {
    console.error("AI evaluation error:", error);
    // Fallback evaluation
    const score = Math.floor(Math.random() * 40) + 60; // Score between 60-100
    return {
      score,
      feedback: `Great answer for the ${role} position! You scored ${score}/100. Your response shows good understanding of the topic. Consider adding more specific examples from your experience to make it even stronger.`,
      suggestions: [
        "Provide more specific examples",
        "Use technical terminology relevant to the role",
        "Structure your response better",
        "Connect your answer to real-world scenarios",
      ],
    };
  }
};

const evaluateInterview = async (answers, role) => {
  try {
    const totalScore = answers.reduce(
      (sum, a) => sum + (a.feedback?.weighted_score ?? a.feedback?.score ?? 0),
      0
    );
    const averageScore = Math.round(totalScore / Math.max(answers.length, 1));

    // Aggregate criteria averages if available
    const criteriaTotals = {};
    const criteriaWeights = {};
    for (const a of answers) {
      const crit = a.feedback?.criteria || {};
      for (const [k, v] of Object.entries(crit)) {
        criteriaTotals[k] = (criteriaTotals[k] || 0) + (v?.score || 0);
        criteriaWeights[k] = v?.weight ?? criteriaWeights[k] ?? null;
      }
    }
    const criteriaAverages = Object.fromEntries(
      Object.entries(criteriaTotals).map(([k, total]) => [
        k,
        Math.round(total / Math.max(answers.length, 1)),
      ])
    );

    // Check if Ollama is available
    if (!ollama) {
      // Fallback evaluation without Ollama
      return {
        overall_score: averageScore,
        total_questions: answers.length,
        completed_questions: answers.length,
        feedback: `You completed the ${role} interview with an average score of ${averageScore}/100. Your responses demonstrate good understanding of the role requirements. Keep practicing to deepen specifics and quantify impact.`,
        recommendations: [
          "Practice more technical questions specific to your role",
          "Work on your communication skills and clarity",
          "Research industry best practices and trends",
          "Prepare specific examples from your experience",
        ],
        criteria_averages: criteriaAverages,
      };
    }

    // Generate overall feedback with Rick's personality using Ollama
    const overallPrompt = `
    You are Rick, a professional and friendly AI interviewer providing overall feedback for an interview session.
    
    Interview Summary:
    - Total questions answered: ${answers.length}
    - Average answer length: ${Math.round(
      answers.reduce((sum, item) => sum + (item.answer?.length || 0), 0) /
        answers.length
    )} characters
    - Role: ${role}
    - Average score: ${averageScore}/100
    
    Individual responses:
    ${answers
      .map(
        (item) =>
          `Q: ${item.question} | A: ${(item.answer || "").substring(0, 100)}...`
      )
      .join("\n")}
    
    Please provide overall feedback on the candidate's interview performance. Consider:
    1. Overall communication skills
    2. Consistency in responses
    3. Areas of strength
    4. Areas for improvement
    5. Overall impression
    
    Provide feedback in 3-4 sentences that sounds natural and conversational. Use a warm, professional tone as if you're wrapping up a real interview. Be encouraging but honest about areas for improvement.
    
    Also provide 4 specific recommendations for improvement.
    
    Format your response as JSON:
    {
      "feedback": "<overall_feedback_text>",
      "recommendations": ["<rec1>", "<rec2>", "<rec3>", "<rec4>"]
    }
    `;

    try {
      const response = await ollama.chat({
        model: "llama3.1:8b" || "llama2",
        messages: [
          {
            role: "user",
            content: overallPrompt,
          },
        ],
      });

      const responseText = response.message.content.trim();

      try {
        const parsedResponse = JSON.parse(responseText);
        return {
          overall_score: averageScore,
          total_questions: answers.length,
          completed_questions: answers.length,
          feedback:
            parsedResponse.feedback ||
            `You completed the ${role} interview with an average score of ${averageScore}/100. Your responses demonstrate good understanding of the role requirements.`,
          recommendations: parsedResponse.recommendations || [
            "Practice more technical questions specific to your role",
            "Work on your communication skills",
            "Research industry best practices",
            "Prepare specific examples from your experience",
          ],
          criteria_averages: criteriaAverages,
        };
      } catch (parseError) {
        return {
          overall_score: averageScore,
          total_questions: answers.length,
          completed_questions: answers.length,
          feedback:
            responseText ||
            `You completed the ${role} interview with an average score of ${averageScore}/100. Your responses demonstrate good understanding of the role requirements.`,
          recommendations: [
            "Practice more technical questions specific to your role",
            "Work on your communication skills",
            "Research industry best practices",
            "Prepare specific examples from your experience",
          ],
          criteria_averages: criteriaAverages,
        };
      }
    } catch (ollamaError) {
      console.error("Ollama evaluation error:", ollamaError);
      // Fallback to basic evaluation
      return {
        overall_score: averageScore,
        total_questions: answers.length,
        completed_questions: answers.length,
        feedback: `You completed the ${role} interview with an average score of ${averageScore}/100. Your responses demonstrate good understanding of the role requirements.`,
        recommendations: [
          "Practice more technical questions specific to your role",
          "Work on your communication skills",
          "Research industry best practices",
          "Prepare specific examples from your experience",
        ],
      };
    }
  } catch (error) {
    console.error("Interview evaluation error:", error);
    return {
      overall_score: 75,
      total_questions: answers.length,
      completed_questions: answers.length,
      feedback:
        "Good interview performance! Keep practicing to improve your skills.",
      recommendations: [
        "Practice more technical questions",
        "Work on communication skills",
        "Research industry best practices",
      ],
    };
  }
};

// Generate a short follow-up question based on the user's answer
const generateFollowUpQuestion = async (question, answer, role) => {
  try {
    if (!answer || typeof answer !== "string" || answer.trim().length === 0) {
      return "";
    }

    // If Ollama not available, return an empty follow-up (frontend may fallback)
    if (!ollama) return "";

    const prompt = `
You are Rick, a professional and friendly AI interviewer.

Role: ${role}
Original question: ${question}
Candidate's answer: ${answer}

Write ONE brief, natural follow-up question that digs deeper into the candidate's experience, tools used, impact, or decision-making. Keep it under 18 words. If the candidate clearly said they don't know, return an empty string.

Respond as JSON only:
{ "follow_up": "<one_short_question_or_empty>" }
`;

    const response = await ollama.chat({
      model: "llama3.1:8b" || "llama2",
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.message.content.trim();
    try {
      const parsed = JSON.parse(text);
      return typeof parsed.follow_up === "string"
        ? parsed.follow_up.trim()
        : "";
    } catch (_) {
      return "";
    }
  } catch (error) {
    console.error("Follow-up generation error:", error);
    return "";
  }
};

// API Routes

// Health check
app.get("/", (req, res) => {
  res.json({ message: "AI Interviewer API is running" });
});

// Get available roles (now from AI agent)
app.get("/api/roles", (req, res) => {
  const roles = getAvailableRoles();
  res.json({ roles });
});
// Generate a context-aware follow-up question
app.post("/api/interview/follow-up", authenticateToken, async (req, res) => {
  try {
    const { question, answer, role } = req.body || {};
    const follow = await generateFollowUpQuestion(
      question || "",
      answer || "",
      role || ""
    );
    return res.json({ follow_up: follow || "" });
  } catch (error) {
    console.error("Follow-up endpoint error:", error);
    return res.status(500).json({ follow_up: "" });
  }
});

// Upload resume (PDF) and extract text/skills
app.post(
  "/api/resume/upload",
  authenticateToken,
  upload.single("resume"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ detail: "No resume file uploaded" });
      }

      // Only PDF supported in this minimal implementation
      const isPdf =
        req.file.mimetype === "application/pdf" ||
        req.file.originalname.endsWith(".pdf");
      if (!isPdf) {
        return res
          .status(415)
          .json({ detail: "Only PDF resumes are supported" });
      }

      if (!pdfParse) {
        return res.status(501).json({
          detail:
            "PDF parsing dependency not installed on server. Please run 'npm install pdf-parse' or proceed without resume.",
        });
      }

      const data = await pdfParse(req.file.buffer);
      const text = (data.text || "").toLowerCase();
      const skills = extractResumeSkills(text);
      const suggested_role = suggestRoleFromSkills(skills);
      return res.json({ text, skills, suggested_role });
    } catch (error) {
      console.error("Resume upload error:", error);
      return res.status(500).json({ detail: "Failed to parse resume" });
    }
  }
);

// User Registration
app.post("/api/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    let existingUser, existingEmail;

    if (db) {
      // Use MongoDB
      existingUser = await db.collection("users").findOne({ username });
      existingEmail = await db.collection("users").findOne({ email });
    } else {
      // Use in-memory storage
      existingUser = inMemoryDB.users.get(username);
      existingEmail = Array.from(inMemoryDB.users.values()).find(
        (user) => user.email === email
      );
    }

    if (existingUser) {
      return res.status(400).json({ detail: "Username already exists" });
    }

    if (existingEmail) {
      return res.status(400).json({ detail: "Email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = {
      _id: db ? undefined : Date.now().toString(), // Generate ID for in-memory
      username,
      email,
      hashed_password: hashedPassword,
      created_at: new Date(),
    };

    if (db) {
      // Store in MongoDB
      const result = await db.collection("users").insertOne(user);
      user._id = result.insertedId;
    } else {
      // Store in memory
      inMemoryDB.users.set(username, user);
    }

    // Create JWT token
    const access_token = createAccessToken(user);

    res.json({
      access_token,
      token_type: "bearer",
      user: {
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ detail: "Registration failed" });
  }
});

// User Login
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    let user;

    if (db) {
      // Use MongoDB
      user = await db.collection("users").findOne({ username });
    } else {
      // Use in-memory storage
      user = inMemoryDB.users.get(username);
    }

    if (!user) {
      return res.status(401).json({ detail: "Invalid credentials" });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(
      password,
      user.hashed_password
    );
    if (!isValidPassword) {
      return res.status(401).json({ detail: "Invalid credentials" });
    }

    // Create JWT token
    const access_token = createAccessToken(user);

    res.json({
      access_token,
      token_type: "bearer",
      user: {
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ detail: "Login failed" });
  }
});

// Start Interview (now with AI agent questions)
app.post("/api/interview/start", authenticateToken, async (req, res) => {
  try {
    const { name, role, resume_text } = req.body;

    // If resume text provided, derive skills for personalization
    let resumeInfo = null;
    if (typeof resume_text === "string" && resume_text.trim().length > 0) {
      const skills = extractResumeSkills(resume_text);
      resumeInfo = { skills };
    }

    // Get role-specific questions, optionally personalized from resume
    const questions = getQuestionsForRole(role, 6, resumeInfo);

    // Create interview session
    const session = {
      session_id: uuidv4(),
      user_id: req.user.username,
      role,
      name,
      questions,
      start_time: new Date(),
      status: "in_progress",
      answers: [],
    };

    if (db) {
      // Store in MongoDB
      await db.collection("sessions").insertOne(session);
    } else {
      // Store in memory
      inMemoryDB.sessions.set(session.session_id, session);
    }

    res.json({
      session_id: session.session_id,
      questions,
      total_questions: questions.length,
    });
  } catch (error) {
    console.error("Start interview error:", error);
    res.status(500).json({ detail: "Failed to start interview" });
  }
});

// Generate and download interview report as PDF
app.get(
  "/api/interview/report/:session_id",
  authenticateToken,
  async (req, res) => {
    try {
      const { session_id } = req.params;

      const session = await db.collection("sessions").findOne({ session_id });
      if (!session) {
        return res.status(404).json({ detail: "Session not found" });
      }
      if (session.user_id !== req.user.username) {
        return res.status(403).json({ detail: "Access denied" });
      }

      const filename = `interview_report_${session.session_id}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=\"${filename}\"`
      );

      const doc = new PDFDocument({ margin: 50 });
      doc.pipe(res);

      // Header
      doc
        .fontSize(20)
        .text("Interview Report - Conducted by Rick", { align: "center" })
        .moveDown(0.5);
      doc
        .fontSize(12)
        .text(`Candidate: ${session.name || session.user_name || "N/A"}`, {
          align: "center",
        })
        .text(
          `Role: ${(session.role || "")
            .replace(/_/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase())}`,
          { align: "center" }
        )
        .text(
          `Date: ${new Date(
            session.end_time || session.start_time
          ).toLocaleString()}`,
          {
            align: "center",
          }
        )
        .moveDown(1.2);

      // Overall evaluation
      const overall = session.overall_evaluation || {};
      const overallFeedback = overall.overall_feedback || overall.feedback;
      if (overallFeedback) {
        doc
          .fontSize(14)
          .text("Overall Evaluation", { underline: true })
          .moveDown(0.3);
        if (typeof overallFeedback === "string") {
          doc.fontSize(12).text(overallFeedback).moveDown(0.6);
        }
        if (overall.recommendations && Array.isArray(overall.recommendations)) {
          doc.fontSize(12).text("Recommendations:");
          overall.recommendations.forEach((rec) => {
            doc.text(`• ${rec}`);
          });
          doc.moveDown(0.8);
        }
      }

      // Questions and answers
      doc
        .fontSize(14)
        .text("Interview Questions and Answers", { underline: true })
        .moveDown(0.5);
      const answers = Array.isArray(session.answers) ? session.answers : [];
      answers.forEach((qa, idx) => {
        doc
          .fontSize(12)
          .text(`Question ${idx + 1}: ${qa.question || "N/A"}`)
          .moveDown(0.2);
        if (qa.answer) {
          doc.fontSize(11).text(`Answer: ${qa.answer}`).moveDown(0.2);
        }
        const fb = qa.feedback;
        const feedbackText =
          typeof fb === "object" ? fb.feedback || JSON.stringify(fb) : fb;
        if (feedbackText) {
          doc
            .fontSize(11)
            .text(`Rick's Feedback: ${feedbackText}`)
            .moveDown(0.6);
        } else {
          doc.moveDown(0.4);
        }
      });

      // Footer
      doc
        .moveDown(1)
        .fontSize(10)
        .fillColor("gray")
        .text("Generated by Rick - Your AI Interview Assistant", {
          align: "center",
        });

      doc.end();
    } catch (error) {
      console.error("PDF report error:", error);
      res.status(500).json({ detail: "Failed to generate report" });
    }
  }
);

// Submit Answer (now with AI evaluation)
app.post(
  "/api/interview/submit-answer/:session_id",
  authenticateToken,
  async (req, res) => {
    try {
      const { question_id, answer } = req.body;

      // Find active session
      const session = await db.collection("sessions").findOne({
        user_id: req.user.username,
        status: "in_progress",
      });

      if (!session) {
        return res
          .status(404)
          .json({ detail: "No active interview session found" });
      }

      // Find the question
      const question = session.questions.find((q) => q.id === question_id);
      if (!question) {
        return res.status(404).json({ detail: "Question not found" });
      }

      // Evaluate the answer using AI agent
      const feedback = await evaluateAnswer(
        question.question,
        answer,
        session.role
      );

      // Store the answer
      const answerRecord = {
        question_id,
        question: question.question,
        answer,
        feedback,
        timestamp: new Date(),
      };

      // Update session
      await db
        .collection("sessions")
        .updateOne({ _id: session._id }, { $push: { answers: answerRecord } });

      res.json({
        feedback,
        question_id,
        total_answered: session.answers.length + 1,
        total_questions: session.questions.length,
      });
    } catch (error) {
      console.error("Submit answer error:", error);
      res.status(500).json({ detail: "Failed to submit answer" });
    }
  }
);

// Complete Interview (now with AI evaluation)
app.post(
  "/api/interview/complete/:session_id",
  authenticateToken,
  async (req, res) => {
    try {
      const { session_id } = req.params;

      // Find session
      const session = await db.collection("sessions").findOne({ session_id });
      if (!session) {
        return res.status(404).json({ detail: "Session not found" });
      }

      if (session.user_id !== req.user.username) {
        return res.status(403).json({ detail: "Access denied" });
      }

      // Generate overall evaluation using AI agent
      const overall_evaluation = await evaluateInterview(
        session.answers,
        session.role
      );

      // Update session
      await db.collection("sessions").updateOne(
        { _id: session._id },
        {
          $set: {
            status: "completed",
            end_time: new Date(),
            overall_evaluation,
          },
        }
      );

      res.json({
        session_id: session.session_id,
        overall_evaluation,
        total_questions: session.questions.length,
        total_answered: session.answers.length,
      });
    } catch (error) {
      console.error("Complete interview error:", error);
      res.status(500).json({ detail: "Failed to complete interview" });
    }
  }
);

// Get Session Details
app.get(
  "/api/interview/session/:session_id",
  authenticateToken,
  async (req, res) => {
    try {
      const { session_id } = req.params;

      const session = await db.collection("sessions").findOne({ session_id });
      // console.log("Session details:", session);
      if (!session) {
        return res.status(404).json({ detail: "Session not found" });
      }

      if (session.user_id !== req.user.username) {
        return res.status(403).json({ detail: "Access denied" });
      }
      // console.log("Session details:", session);
      res.json({
        session: {
          id: session.session_id,
          role: session.role,
          name: session.name,
          status: session.status,
          start_time: session.start_time,
          end_time: session.end_time,
          questions: session.questions,
          answers: session.answers,
          overall_evaluation: session.overall_evaluation,
        },
      });
    } catch (error) {
      console.error("Get session error:", error);
      res.status(500).json({ detail: "Failed to get session" });
    }
  }
);

// Get User Interviews
app.get("/api/user/interviews", authenticateToken, async (req, res) => {
  try {
    const sessions = await db
      .collection("sessions")
      .find({ user_id: req.user.username })
      .sort({ start_time: -1 })
      .toArray();

    const userSessions = sessions.map((session) => ({
      id: session.session_id,
      role: session.role,
      name: session.name,
      status: session.status,
      start_time: session.start_time,
      end_time: session.end_time,
      total_questions: session.questions.length,
      total_answered: session.answers.length,
    }));

    res.status(200).json({ interviews: userSessions });
  } catch (error) {
    console.error("Get user interviews error:", error);
    res.status(500).json({ detail: "Failed to get user interviews" });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({ detail: "Internal server error" });
});

// Start server
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(
      `🚀 AI Interviewer Backend running on http://localhost:${PORT}`
    );
    console.log(`📚 API Documentation available at http://localhost:${PORT}`);
    console.log(
      `🤖 AI Agent integrated with ${getAvailableRoles().length} roles`
    );
  });
};

startServer();
