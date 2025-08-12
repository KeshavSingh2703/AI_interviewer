# Parse resume PDF into keywords
import PyPDF2
import re
from typing import Dict, List, Any
import os

class ResumeParser:
    def __init__(self):
        self.skills_keywords = {
            'cloud_engineer': [
                'aws', 'azure', 'gcp', 'kubernetes', 'docker', 'terraform', 'ansible', 
                'jenkins', 'ci/cd', 'microservices', 'serverless', 'lambda', 'ec2', 
                's3', 'rds', 'vpc', 'cloudformation', 'elasticsearch', 'redis'
            ],
            'backend_engineer': [
                'python', 'java', 'node.js', 'go', 'c++', 'c#', 'spring', 'django', 
                'flask', 'express', 'postgresql', 'mysql', 'mongodb', 'redis', 
                'kafka', 'rabbitmq', 'rest api', 'graphql', 'microservices', 'docker'
            ],
            'frontend_engineer': [
                'javascript', 'typescript', 'react', 'vue', 'angular', 'html', 'css', 
                'sass', 'webpack', 'babel', 'redux', 'vuex', 'next.js', 'nuxt.js', 
                'responsive design', 'accessibility', 'seo', 'pwa'
            ],
            'ui_ux_designer': [
                'figma', 'sketch', 'adobe xd', 'invision', 'prototyping', 'wireframing', 
                'user research', 'usability testing', 'design systems', 'typography', 
                'color theory', 'interaction design', 'information architecture'
            ],
            'sde': [
                'data structures', 'algorithms', 'leetcode', 'system design', 'distributed systems',
                'python', 'java', 'c++', 'javascript', 'sql', 'nosql', 'git', 'agile', 'scrum'
            ],
            'data_analyst': [
                'sql', 'python', 'r', 'excel', 'tableau', 'power bi', 'pandas', 'numpy', 
                'matplotlib', 'seaborn', 'statistics', 'machine learning', 'data visualization',
                'etl', 'data warehousing', 'business intelligence'
            ],
            'ai_engineer': [
                'python', 'tensorflow', 'pytorch', 'scikit-learn', 'keras', 'numpy', 'pandas',
                'machine learning', 'deep learning', 'neural networks', 'nlp', 'computer vision',
                'reinforcement learning', 'mlops', 'model deployment', 'data preprocessing'
            ]
        }
    
    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """Extract text from PDF file."""
        try:
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text = ""
                for page in pdf_reader.pages:
                    text += page.extract_text()
                return text.lower()
        except Exception as e:
            print(f"Error reading PDF: {e}")
            return ""
    
    def extract_skills(self, text: str) -> Dict[str, List[str]]:
        """Extract skills from resume text based on role categories."""
        found_skills = {}
        
        for role, keywords in self.skills_keywords.items():
            found_skills[role] = []
            for keyword in keywords:
                if keyword.lower() in text:
                    found_skills[role].append(keyword)
        
        return found_skills
    
    def extract_experience(self, text: str) -> Dict[str, Any]:
        """Extract experience information from resume."""
        experience_info = {
            'years_experience': 0,
            'companies': [],
            'education': [],
            'certifications': []
        }
        
        # Extract years of experience
        experience_patterns = [
            r'(\d+)\s*(?:years?|yrs?)\s*(?:of\s*)?experience',
            r'experience[:\s]*(\d+)\s*(?:years?|yrs?)',
        ]
        
        for pattern in experience_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                experience_info['years_experience'] = max([int(m) for m in matches])
                break
        
        # Extract company names (basic pattern)
        company_patterns = [
            r'(?:at|with|worked\s+at)\s+([A-Z][a-zA-Z\s&]+(?:Inc|LLC|Ltd|Corp|Company))',
            r'([A-Z][a-zA-Z\s&]+(?:Inc|LLC|Ltd|Corp|Company))',
        ]
        
        for pattern in company_patterns:
            matches = re.findall(pattern, text)
            experience_info['companies'].extend(matches)
        
        # Extract education
        education_patterns = [
            r'(?:bachelor|master|phd|b\.?s\.?|m\.?s\.?|mba)[\s\w]*?(?:university|college|institute)',
            r'(?:university|college|institute)[\s\w]*?(?:bachelor|master|phd|b\.?s\.?|m\.?s\.?|mba)',
        ]
        
        for pattern in education_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            experience_info['education'].extend(matches)
        
        return experience_info
    
    def suggest_role(self, skills: Dict[str, List[str]], experience: Dict[str, Any]) -> str:
        """Suggest the most suitable role based on skills and experience."""
        role_scores = {}
        
        for role, found_skills in skills.items():
            score = len(found_skills)
            # Bonus for experience
            if experience['years_experience'] > 0:
                score += min(experience['years_experience'], 5)
            role_scores[role] = score
        
        if not role_scores:
            return 'sde'  # Default role
        
        return max(role_scores, key=role_scores.get)
    
    def parse_resume(self, pdf_path: str) -> Dict[str, Any]:
        """Main method to parse resume and return structured data."""
        if not os.path.exists(pdf_path):
            return {"error": "Resume file not found"}
        
        text = self.extract_text_from_pdf(pdf_path)
        if not text:
            return {"error": "Could not extract text from resume"}
        
        skills = self.extract_skills(text)
        experience = self.extract_experience(text)
        suggested_role = self.suggest_role(skills, experience)
        
        return {
            "text": text,
            "skills": skills,
            "experience": experience,
            "suggested_role": suggested_role,
            "parsed_successfully": True
        }

# Global instance
resume_parser = ResumeParser()