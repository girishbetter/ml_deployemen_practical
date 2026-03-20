// State
let skills = [];
let savedJobs = JSON.parse(localStorage.getItem('savedJobs') || '[]');

// DOM Elements
const skillInput = document.getElementById('skillInput');
const tagContainer = document.getElementById('tagContainer');
const scanBtn = document.getElementById('scanBtn');
const resumeUpload = document.getElementById('resumeUpload');
const uploadStatus = document.getElementById('uploadStatus');
const themeToggle = document.getElementById('themeToggle');
const resultsArea = document.getElementById('resultsArea');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.getElementById('loadingText');
const loadingSubtext = document.getElementById('loadingSubtext');
const jobCardsContainer = document.getElementById('jobCardsContainer');
const resultsHeader = document.getElementById('resultsHeader');
const showSavedBtn = document.getElementById('showSavedBtn');
const exportBtn = document.getElementById('exportBtn');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Check theme
    if (localStorage.getItem('theme') === 'light') {
        document.body.classList.replace('dark', 'light');
        document.documentElement.classList.remove('dark');
        themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
    
    // Auto-resize textarea logic removed in favor of input tag system
});

// --- Theme Toggle ---
themeToggle.addEventListener('click', () => {
    const isDark = document.body.classList.contains('dark');
    if (isDark) {
        document.body.classList.replace('dark', 'light');
        document.documentElement.classList.remove('dark');
        themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
        localStorage.setItem('theme', 'light');
    } else {
        document.body.classList.replace('light', 'dark');
        document.documentElement.classList.add('dark');
        themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
        localStorage.setItem('theme', 'dark');
    }
});

// --- Tag Input Logic ---
function renderTags() {
    // Remove existing tags
    document.querySelectorAll('.tag').forEach(el => el.remove());
    
    // Create new tags
    skills.forEach((skill, index) => {
        const tag = document.createElement('div');
        tag.className = 'tag font-mono';
        tag.innerHTML = `${skill} <span class="remove-tag" onclick="removeTag(${index})"><i class="fa-solid fa-xmark"></i></span>`;
        tagContainer.insertBefore(tag, skillInput);
    });
}

function addTag(skill) {
    const cleanSkill = skill.trim().toLowerCase();
    if (cleanSkill && !skills.includes(cleanSkill)) {
        skills.push(cleanSkill);
        renderTags();
        skillInput.value = '';
    }
}

function removeTag(index) {
    skills.splice(index, 1);
    renderTags();
}

window.addSuggestedSkill = (skill) => addTag(skill);

skillInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        addTag(skillInput.value);
    } else if (e.key === 'Backspace' && skillInput.value === '' && skills.length > 0) {
        skills.pop();
        renderTags();
    }
});

// Avoid triggering form submission on enter
skillInput.parentElement.addEventListener('submit', e => e.preventDefault());

// --- Resume Upload ---
resumeUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    uploadStatus.classList.remove('hidden');
    uploadStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analyzing Neural Pathways...';
    
    try {
        const res = await fetch('/api/parse-resume', {
            method: 'POST',
            body: formData
        });
        
        const data = await res.json();
        
        if (data.error) {
            uploadStatus.textContent = 'Error: ' + data.error;
            uploadStatus.classList.add('text-red-500');
        } else {
            uploadStatus.textContent = `Extracted ${data.skills.length} skills!`;
            data.skills.forEach(addTag);
            setTimeout(() => uploadStatus.classList.add('hidden'), 3000);
            
            if (data.skills.length > 0) {
                confetti({
                    particleCount: 50,
                    spread: 60,
                    origin: { y: 0.6 }
                });
            }
        }
    } catch (err) {
        uploadStatus.textContent = 'Connection failed.';
        console.error(err);
    }
});

// --- Scan / Recommend Jobs ---
scanBtn.addEventListener('click', async () => {
    if (skills.length === 0) {
        alert("Please enter at least one skill or upload a resume.");
        return;
    }

    // Show loading
    loadingOverlay.classList.remove('hidden');
    resultsHeader.classList.add('hidden');
    jobCardsContainer.innerHTML = '';
    
    // Simulate complex AI sequence strings text changes
    const messages = ["Calibrating Model Weights...", "Computing Semantic Embeddings...", "Matching Global Job Market..."];
    let msgIdx = 0;
    const msgInterval = setInterval(() => {
        loadingSubtext.textContent = `[ ${messages[msgIdx]} ]`;
        msgIdx = (msgIdx + 1) % messages.length;
    }, 500);

    try {
        const response = await fetch('/api/recommend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ skills: skills.join(', ') })
        });
        
        const data = await response.json();
        
        // Minimum delay for dramatic effect
        setTimeout(() => {
            clearInterval(msgInterval);
            loadingOverlay.classList.add('hidden');
            renderJobs(data.results);
            resultsHeader.classList.remove('hidden');
        }, 1500);
        
    } catch (err) {
        clearInterval(msgInterval);
        loadingOverlay.classList.add('hidden');
        jobCardsContainer.innerHTML = `<div class="text-red-500">System Error: Data stream interrupted.</div>`;
        console.error(err);
    }
});

// --- Rendering Job Cards ---
let lastResults = [];

function renderJobs(jobsList) {
    lastResults = jobsList;
    jobCardsContainer.innerHTML = '';
    
    if (!jobsList || jobsList.length === 0) {
        jobCardsContainer.innerHTML = '<div class="text-gray-400">No matching missions found.</div>';
        return;
    }

    jobsList.forEach((job, index) => {
        const score = job.match_score.toFixed(1);
        let strokeColor = "color-green";
        let textColor = "text-green";
        if (score < 60) {
            strokeColor = "color-red";
            textColor = "text-red";
        } else if (score < 80) {
            strokeColor = "color-yellow";
            textColor = "text-yellow";
        }

        const isSaved = savedJobs.some(sj => sj.job_title === job.job_title);
        const saveIconClass = isSaved ? "fa-solid fa-bookmark text-cyberNeonP" : "fa-regular fa-bookmark text-gray-400";

        // HTML for the card
        const cardHtml = `
        <div class="flip-card cursor-pointer" onclick="this.classList.toggle('flipped')">
            <div class="flip-card-inner">
                <!-- FRONT -->
                <div class="flip-card-front glass-card shadow-lg bg-gray-900 border border-gray-800 hover:border-cyberNeonP transition group">
                    
                    <div class="flex justify-between items-start w-full mb-4">
                        <h3 class="text-xl font-bold orbitron text-white group-hover:text-cyberNeonP transition">${job.job_title}</h3>
                        <button class="text-xl hover:scale-110 transition z-10" onclick="event.stopPropagation(); toggleSave('${job.job_title}', ${index})">
                            <i id="bookmark-${index}" class="${saveIconClass}"></i>
                        </button>
                    </div>

                    <div class="grid grid-cols-2 gap-4 w-full h-full">
                        <div class="flex flex-col justify-center items-center">
                             <!-- SVG Circle Score -->
                            <svg viewBox="0 0 36 36" class="circular-chart ${strokeColor} w-24 h-24">
                              <path class="circle-bg"
                                d="M18 2.0845
                                  a 15.9155 15.9155 0 0 1 0 31.831
                                  a 15.9155 15.9155 0 0 1 0 -31.831"
                              />
                              <path class="circle"
                                stroke-dasharray="${score}, 100"
                                d="M18 2.0845
                                  a 15.9155 15.9155 0 0 1 0 31.831
                                  a 15.9155 15.9155 0 0 1 0 -31.831"
                              />
                              <text x="18" y="20.35" class="percentage ${textColor}">${score}%</text>
                            </svg>
                            <p class="text-xs text-gray-400 mt-2 tracking-widest uppercase">Match Index</p>
                        </div>
                        
                        <div class="flex flex-col justify-center gap-4 border-l border-gray-700 pl-4">
                            <div>
                                <p class="text-xs text-gray-500 uppercase tracking-wide">Est. Salary</p>
                                <p class="font-mono text-neon-text-primary text-sm">${job.salary_range}</p>
                            </div>
                            <div>
                                <p class="text-xs text-gray-500 uppercase tracking-wide">Market Demand</p>
                                <p class="font-mono text-sm ${job.market_demand==='High'?'text-green-400':'text-yellow-400'}">
                                    <i class="fa-solid fa-arrow-${job.market_demand==='High'?'trend-up':'right'}"></i> ${job.market_demand}
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mt-auto w-full pt-4 border-t border-gray-800 text-center">
                        <span class="text-xs text-cyberNeonP uppercase tracking-widest"><i class="fa-solid fa-rotate-right"></i> Click to View Insights</span>
                    </div>

                </div>
                
                <!-- BACK -->
                <div class="flip-card-back glass-card shadow-lg bg-gray-900 border border-cyberNeonS">
                    <h3 class="text-lg font-bold orbitron text-cyberNeonS mb-3 border-b border-gray-700 pb-2">Analysis: ${job.job_title}</h3>
                    
                    <div class="mb-4">
                        <p class="text-xs text-gray-400 uppercase tracking-widest mb-1"><i class="fa-solid fa-check text-green-500"></i> Matched Assets</p>
                        <div class="flex flex-wrap gap-1">
                            ${job.matched_skills.map(s => `<span class="bg-green-900/50 text-green-300 text-xs px-2 py-1 rounded font-mono">${s}</span>`).join('')}
                            ${job.matched_skills.length === 0 ? '<span class="text-sm text-gray-500">None detected</span>' : ''}
                        </div>
                    </div>

                    <div class="mb-4">
                        <p class="text-xs text-gray-400 uppercase tracking-widest mb-1"><i class="fa-solid fa-xmark text-red-500"></i> Missing Assets</p>
                        <div class="flex flex-wrap gap-1">
                            ${job.missing_skills.map(s => `<span class="bg-red-900/50 text-red-300 text-xs px-2 py-1 rounded font-mono">${s}</span>`).join('')}
                            ${job.missing_skills.length === 0 ? '<span class="text-sm text-gray-500">Fully equipped!</span>' : ''}
                        </div>
                    </div>

                    <div class="mb-2">
                        <p class="text-xs text-cyberNeonP uppercase tracking-widest mb-2"><i class="fa-solid fa-route"></i> Career Path Simulator</p>
                        <ul class="text-sm font-mono space-y-2">
                           ${job.suggested_skills.map(s => `
                               <li class="flex justify-between border-b border-gray-800 pb-1">
                                    <span class="text-gray-300">+ Learn ${s.skill}</span>
                                    <span class="text-green-400">+${s.potential_boost.toFixed(1)}% Boost</span>
                               </li>
                           `).join('')}
                           ${job.suggested_skills.length === 0 ? '<span class="text-sm text-gray-500">No further boosts necessary.</span>' : ''}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
        `;
        jobCardsContainer.innerHTML += cardHtml;
    });
}

// --- Bookmarking ---
window.toggleSave = (title, index) => {
    let saved = JSON.parse(localStorage.getItem('savedJobs') || '[]');
    const idx = saved.findIndex(j => j.job_title === title);
    
    if (idx > -1) {
        // Remove
        saved.splice(idx, 1);
        document.getElementById(`bookmark-${index}`).className = "fa-regular fa-bookmark text-gray-400";
    } else {
        // Add
        const jobData = lastResults[index];
        saved.push(jobData);
        document.getElementById(`bookmark-${index}`).className = "fa-solid fa-bookmark text-cyberNeonP";
        
        confetti({
            particleCount: 30,
            spread: 40,
            origin: { y: 0.8 },
            colors: ['#00f3ff']
        });
    }
    
    localStorage.setItem('savedJobs', JSON.stringify(saved));
    savedJobs = saved;
};

showSavedBtn.addEventListener('click', () => {
    savedJobs = JSON.parse(localStorage.getItem('savedJobs') || '[]');
    renderJobs(savedJobs);
    resultsHeader.classList.remove('hidden');
    document.querySelector('#resultsHeader h2').innerHTML = '<i class="fa-solid fa-bookmark text-cyberNeonP"></i> Saved Missions';
});

// --- Export ---
exportBtn.addEventListener('click', () => {
    if (lastResults.length === 0) return;
    
    let content = "NXM Career AI - Mission Report\n\n";
    content += "Profile Skills: " + skills.join(', ') + "\n";
    content += "=========================================\n\n";
    
    lastResults.forEach(j => {
        content += `Target: ${j.job_title}\n`;
        content += `Match Index: ${j.match_score.toFixed(1)}%\n`;
        content += `Salary: ${j.salary_range} | Demand: ${j.market_demand}\n`;
        content += `Matched Skills: ${j.matched_skills.join(', ')}\n`;
        content += `Missing Target Skills: ${j.missing_skills.join(', ')}\n`;
        content += "-----------------------------------------\n";
    });
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'NXM_Mission_Report.txt';
    a.click();
    URL.revokeObjectURL(url);
});