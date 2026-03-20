import os
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import pandas as pd
import pdfplumber
from model.recommender import recommend_jobs

app = Flask(__name__)
CORS(app) # Enable CORS for frontend

# Load dataset
jobs = pd.read_csv("data/jobs.csv")

@app.route("/", methods=["GET"])
def index():
    return render_template("index.html")

@app.route("/api/recommend", methods=["POST"])
def get_recommendations():
    data = request.json
    user_skills = data.get("skills", "")
    
    if not user_skills:
        return jsonify({"error": "No skills provided"}), 400
        
    results = recommend_jobs(user_skills, jobs)
    return jsonify({"results": results})

@app.route("/api/parse-resume", methods=["POST"])
def parse_resume():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
        
    file = request.files["file"]
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    if file and file.filename.endswith('.pdf'):
        try:
            with pdfplumber.open(file) as pdf:
                text = ""
                for page in pdf.pages:
                    extracted = page.extract_text()
                    if extracted:
                        text += extracted + " "
            
            # Simple keyword extraction: find known skills from jobs.csv in the resume text
            all_skills = set()
            for desc in jobs['description']:
                for skill in desc.split(' '):
                    if len(skill.strip()) > 2:
                        all_skills.add(skill.strip().lower())
                        
            extracted_skills = []
            text_lower = text.lower()
            for skill in all_skills:
                # Use word boundaries to match exact skills
                import re
                if re.search(r'\b' + re.escape(skill) + r'\b', text_lower):
                    extracted_skills.append(skill)
                    
            return jsonify({
                "skills": list(set(extracted_skills))
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500
            
    return jsonify({"error": "Invalid file type. Only PDF accepted."}), 400

if __name__ == "__main__":
    app.run(debug=True, port=5000)