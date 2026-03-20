from sentence_transformers import SentenceTransformer, util
import pandas as pd
import torch
import os

# Load model globally to improve performance (load once)
# 'all-MiniLM-L6-v2' is small, fast, and great for semantic matching
try:
    model = SentenceTransformer('all-MiniLM-L6-v2')
except Exception as e:
    print(f"Error loading model: {e}")
    model = None

# Cache for embeddings
job_embeddings_cache = None

def init_job_embeddings(jobs_df):
    global job_embeddings_cache
    if job_embeddings_cache is None:
        print("Computing job embeddings for the first time...")
        # Compute embeddings for the job descriptions
        documents = jobs_df["description"].fillna("").tolist()
        job_embeddings_cache = model.encode(documents, convert_to_tensor=True)
    return job_embeddings_cache

def analyze_skill_gap(user_skills_list, required_skills_list):
    """Identifies matching and missing skills based on exact and partial matches."""
    user_skills_set = set([s.lower().strip() for s in user_skills_list if s.strip()])
    req_skills_set = set([s.lower().strip() for s in required_skills_list if s.strip()])
    
    matched = list(user_skills_set.intersection(req_skills_set))
    missing = list(req_skills_set.difference(user_skills_set))
    
    return matched, missing
    
def recommend_jobs(user_skills_text, jobs_df):
    global job_embeddings_cache
    
    if model is None:
        return []
        
    embeddings = init_job_embeddings(jobs_df)
    
    # Compute embedding for user's skills
    user_embedding = model.encode(user_skills_text, convert_to_tensor=True)
    
    # Compute cosine similarities
    cosine_scores = util.cos_sim(user_embedding, embeddings)[0]
    
    # Move to CPU and numpy
    scores = cosine_scores.cpu().numpy()
    jobs_df["match_score"] = scores
    
    # Sort and get top 8
    top_jobs = jobs_df.sort_values(by="match_score", ascending=False).head(8)
    
    results = []
    
    # Determine the format of user_skills_text (comma-separated or just spaces)
    if ',' in user_skills_text:
        user_skills_list = [s.strip() for s in user_skills_text.split(',')]
    else:
        user_skills_list = [s.strip() for s in user_skills_text.split(' ')]
        
    for idx, row in top_jobs.iterrows():
        # Extact required skills
        req_skills_list = [s.strip() for s in row['description'].split(' ') if s.strip()]
        
        matched, missing = analyze_skill_gap(user_skills_list, req_skills_list)
        
        # Limit missing to 5 to keep UI clean
        missing = missing[:5]
        
        base_score = float(row["match_score"] * 100)
        
        # Career Path Simulator: Suggest a missing skill and calculate score boost
        suggested_skills = []
        for m_skill in missing[:3]: # Calculate boost for top 3 missing skills
            new_skills = user_skills_text + " " + m_skill
            u_emb = model.encode(new_skills, convert_to_tensor=True)
            j_emb = embeddings[idx] # index aligns with initial encoding order
            new_score = util.cos_sim(u_emb, j_emb)[0].item() * 100
            boost = max(0.5, round((new_score - base_score) * 0.8, 1)) # Slight artificial penalty to make it realistic 
            
            suggested_skills.append({
                "skill": m_skill,
                "potential_boost": boost
            })
            
        # Ensure score doesn't exceed 99% if they don't have all skills
        display_score = min(base_score, 99.8) if len(missing) > 0 else min(base_score, 100.0)
        
        results.append({
            "job_title": row["job_title"],
            "match_score": display_score,
            "salary_range": row.get("salary_range", "N/A"),
            "market_demand": row.get("market_demand", "Medium"),
            "matched_skills": matched,
            "missing_skills": missing,
            "suggested_skills": suggested_skills
        })
        
    return results