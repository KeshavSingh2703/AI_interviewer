# Role-specific interview questions
QUESTIONS = {
    'cloud_engineer': [
        "Tell me about your experience with cloud platforms like AWS, Azure, or GCP.",
        "How would you design a highly available system in the cloud?",
        "What's your experience with containerization and orchestration tools?",
        "How do you handle security in cloud environments?",
        "Describe a time when you had to troubleshoot a production issue in the cloud.",
        "What's your experience with Infrastructure as Code tools?",
        "How do you approach cost optimization in cloud environments?",
        "Tell me about your experience with CI/CD pipelines."
    ],
    'backend_engineer': [
        "Tell me about your experience with backend technologies and frameworks.",
        "How would you design a scalable database architecture?",
        "What's your experience with API design and development?",
        "How do you handle data consistency in distributed systems?",
        "Describe a challenging backend problem you solved.",
        "What's your experience with microservices architecture?",
        "How do you approach performance optimization?",
        "Tell me about your experience with testing strategies."
    ],
    'frontend_engineer': [
        "Tell me about your experience with frontend frameworks and libraries.",
        "How do you approach responsive design and cross-browser compatibility?",
        "What's your experience with state management in frontend applications?",
        "How do you optimize frontend performance?",
        "Describe a complex UI component you built.",
        "What's your experience with modern JavaScript and TypeScript?",
        "How do you approach accessibility in web applications?",
        "Tell me about your experience with build tools and bundlers."
    ],
    'ui_ux_designer': [
        "Walk me through your design process from research to final design.",
        "How do you approach user research and usability testing?",
        "Tell me about a design challenge you faced and how you solved it.",
        "How do you ensure your designs are accessible and inclusive?",
        "What's your experience with design systems and component libraries?",
        "How do you collaborate with developers and product managers?",
        "Describe a project where you had to balance user needs with business requirements.",
        "What design tools and software are you most comfortable with?"
    ],
    'sde': [
        "Tell me about your experience with data structures and algorithms.",
        "How would you approach solving a complex programming problem?",
        "Describe a time when you had to optimize code for performance.",
        "What's your experience with system design and architecture?",
        "How do you approach debugging and troubleshooting?",
        "Tell me about a challenging project you worked on.",
        "What's your experience with version control and collaboration?",
        "How do you stay updated with new technologies and best practices?"
    ],
    'data_analyst': [
        "Tell me about your experience with data analysis and visualization tools.",
        "How do you approach cleaning and preprocessing data?",
        "Describe a time when you had to present complex data insights to stakeholders.",
        "What's your experience with SQL and database querying?",
        "How do you ensure data quality and accuracy in your analysis?",
        "Tell me about a data-driven decision you helped make.",
        "What's your experience with statistical analysis and modeling?",
        "How do you approach storytelling with data?"
    ],
    'ai_engineer': [
        "Tell me about your experience with machine learning frameworks and libraries.",
        "How do you approach feature engineering and model selection?",
        "Describe a machine learning project you worked on from start to finish.",
        "What's your experience with deep learning and neural networks?",
        "How do you handle overfitting and model validation?",
        "Tell me about your experience with MLOps and model deployment.",
        "What's your experience with natural language processing or computer vision?",
        "How do you stay updated with the latest AI research and developments?"
    ]
}

# General questions for all roles
GENERAL_QUESTIONS = [
    "Tell me about yourself and your background.",
    "What are your greatest strengths?",
    "What areas are you looking to improve?",
    "Where do you see yourself in five years?",
    "Why are you interested in this role?",
    "Describe a challenging situation you faced at work and how you handled it.",
    "What's your experience working in teams?",
    "How do you handle stress and pressure?"
]

def get_questions_for_role(role: str, num_questions: int = 5) -> list:
    """Get role-specific questions for the interview."""
    role_questions = QUESTIONS.get(role.lower(), QUESTIONS['sde'])
    general_questions = GENERAL_QUESTIONS[:3]  # Include 3 general questions
    
    # Combine role-specific and general questions
    all_questions = role_questions + general_questions
    
    # Return a subset of questions
    return all_questions[:num_questions]

def get_available_roles() -> list:
    """Get list of available roles."""
    return list(QUESTIONS.keys())
