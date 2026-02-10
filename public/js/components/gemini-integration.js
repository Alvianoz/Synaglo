/**
 * Gemini AI Integration
 * Uses Google Gemini API to generate personal health recommendations
 * API Key: AIzaSyAY-m56jzGmR83jJlMYAT82y41FRtdo78Q
 * Model: gemini-1.5-flash (stable model)
 */

const GEMINI_API_KEY = "AIzaSyAY-m56jzGmR83jJlMYAT82y41FRtdo78Q";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

/**
 * Get health data from Firestore for the current user
 * Retrieves detailed recording data from Firestore (last 7 days)
 */
async function getUserHealthData(userId) {
    try {
        const { collection, query, getDocs, where, limit } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");

        // Load Firebase config from centralized file
        const { initializeFirebase } = await import("./firebase-loader.js");
        const { db } = await initializeFirebase();

        // Get recordings from last 7 days
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const sevenDaysAgoISO = sevenDaysAgo.toISOString();

        const recordingsRef = collection(db, 'users', userId, 'recordings');
        const q = query(
            recordingsRef,
            where('isComplete', '==', true),
            limit(100) // Get up to 100 recordings to filter in memory
        );
        const querySnapshot = await getDocs(q);

        const recordings = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.isComplete && data.statistics && data.startTime && data.startTime >= sevenDaysAgoISO) {
                // Include detailed recording data
                recordings.push({
                    date: data.formattedDate || new Date(data.startTime).toLocaleDateString('en-US'),
                    startTime: data.startTime,
                    duration: data.duration || 0, // Duration in milliseconds
                    dataPoints: data.dataPoints || 0,
                    statistics: {
                        avgBPM: data.statistics.avgBPM || 0,
                        avgSpO2: data.statistics.avgSpO2 || 0,
                        avgGSR: data.statistics.avgGSR || 0,
                        avgTemp: data.statistics.avgTemp || 0
                    },
                    // Include sample data points if available (first 10 and last 10 for trend analysis)
                    sampleData: data.data && Array.isArray(data.data) ? {
                        first: data.data.slice(0, 10).map(d => ({
                            heartRate: d.heartRate,
                            spo2: d.spo2,
                            gsr: d.gsr,
                            temperature: d.temperature,
                            timestamp: d.timestamp
                        })),
                        last: data.data.slice(-10).map(d => ({
                            heartRate: d.heartRate,
                            spo2: d.spo2,
                            gsr: d.gsr,
                            temperature: d.temperature,
                            timestamp: d.timestamp
                        }))
                    } : null
                });
            }
        });

        // Sort by date (newest first)
        recordings.sort((a, b) => {
            const dateA = new Date(a.startTime).getTime();
            const dateB = new Date(b.startTime).getTime();
            return dateB - dateA;
        });

        // Calculate averages from all recordings
        if (recordings.length > 0) {
            const avgBPM = recordings.reduce((sum, r) => sum + (r.statistics.avgBPM || 0), 0) / recordings.length;
            const avgSpO2 = recordings.reduce((sum, r) => sum + (r.statistics.avgSpO2 || 0), 0) / recordings.length;
            const avgGSR = recordings.reduce((sum, r) => sum + (r.statistics.avgGSR || 0), 0) / recordings.length;
            const avgTemp = recordings.reduce((sum, r) => sum + (r.statistics.avgTemp || 0), 0) / recordings.length;

            // Calculate trends (comparing first half vs second half of recordings)
            const midPoint = Math.floor(recordings.length / 2);
            const recentRecordings = recordings.slice(0, midPoint);
            const olderRecordings = recordings.slice(midPoint);
            
            const recentAvgBPM = recentRecordings.length > 0 
                ? recentRecordings.reduce((sum, r) => sum + (r.statistics.avgBPM || 0), 0) / recentRecordings.length 
                : 0;
            const olderAvgBPM = olderRecordings.length > 0 
                ? olderRecordings.reduce((sum, r) => sum + (r.statistics.avgBPM || 0), 0) / olderRecordings.length 
                : 0;
            
            const recentAvgGSR = recentRecordings.length > 0 
                ? recentRecordings.reduce((sum, r) => sum + (r.statistics.avgGSR || 0), 0) / recentRecordings.length 
                : 0;
            const olderAvgGSR = olderRecordings.length > 0 
                ? olderRecordings.reduce((sum, r) => sum + (r.statistics.avgGSR || 0), 0) / olderRecordings.length 
                : 0;

            return {
                recordings: recordings,
                averages: {
                    avgBPM: Math.round(avgBPM),
                    avgSpO2: Math.round(avgSpO2),
                    avgGSR: Math.round(avgGSR),
                    avgTemp: parseFloat(avgTemp.toFixed(1))
                },
                trends: {
                    bpmTrend: recentAvgBPM > olderAvgBPM ? 'increasing' : recentAvgBPM < olderAvgBPM ? 'decreasing' : 'stable',
                    gsrTrend: recentAvgGSR > olderAvgGSR ? 'increasing' : recentAvgGSR < olderAvgGSR ? 'decreasing' : 'stable',
                    bpmChange: Math.round(recentAvgBPM - olderAvgBPM),
                    gsrChange: Math.round(recentAvgGSR - olderAvgGSR)
                },
                totalRecordings: recordings.length,
                dateRange: {
                    oldest: recordings[recordings.length - 1]?.date || '',
                    newest: recordings[0]?.date || ''
                }
            };
        }

        return null;
    } catch (error) {
        console.error('Error getting user health data:', error);
        return null;
    }
}

/**
 * Generate health recommendations using Gemini AI
 * Creates personal health recommendations using Gemini AI
 */
async function generateHealthRecommendations(userId) {
    try {
        // Get user health data
        const healthData = await getUserHealthData(userId);

        // Prepare prompt for Gemini with detailed recording data
        let prompt = `You are an experienced mental and physical health expert. Provide personal health recommendations based on the following detailed recording data:\n\n`;

        if (healthData && healthData.recordings.length > 0) {
            prompt += `=== HEALTH DATA SUMMARY (Last 7 Days) ===\n`;
            prompt += `Total Recordings: ${healthData.totalRecordings}\n`;
            prompt += `Date Range: ${healthData.dateRange.oldest} to ${healthData.dateRange.newest}\n\n`;
            
            prompt += `Overall Averages:\n`;
            prompt += `- Average Heart Rate: ${healthData.averages.avgBPM} BPM (Normal range: 60-100 BPM)\n`;
            prompt += `- Average Oxygen Saturation: ${healthData.averages.avgSpO2}% (Normal range: 95-100%)\n`;
            prompt += `- Average Sweat Activity (GSR): ${healthData.averages.avgGSR} Ohm (Lower = higher stress)\n`;
            prompt += `- Average Body Temperature: ${healthData.averages.avgTemp}°C (Normal range: 36.1-37.2°C)\n\n`;
            
            if (healthData.trends) {
                prompt += `Trends (Recent vs Older Recordings):\n`;
                prompt += `- Heart Rate Trend: ${healthData.trends.bpmTrend} (${healthData.trends.bpmChange > 0 ? '+' : ''}${healthData.trends.bpmChange} BPM change)\n`;
                prompt += `- GSR Trend: ${healthData.trends.gsrTrend} (${healthData.trends.gsrChange > 0 ? '+' : ''}${healthData.trends.gsrChange} Ohm change)\n\n`;
            }
            
            // Include detailed recording data
            prompt += `=== DETAILED RECORDING DATA ===\n`;
            healthData.recordings.slice(0, 10).forEach((rec, index) => {
                prompt += `\nRecording ${index + 1} (${rec.date}):\n`;
                prompt += `  - Duration: ${Math.round(rec.duration / 1000)} seconds\n`;
                prompt += `  - Data Points: ${rec.dataPoints}\n`;
                prompt += `  - Heart Rate: ${rec.statistics.avgBPM} BPM\n`;
                prompt += `  - SpO2: ${rec.statistics.avgSpO2}%\n`;
                prompt += `  - GSR: ${rec.statistics.avgGSR} Ohm\n`;
                prompt += `  - Temperature: ${rec.statistics.avgTemp}°C\n`;
                
                // Include sample data if available
                if (rec.sampleData && rec.sampleData.first && rec.sampleData.last) {
                    prompt += `  - Sample Data (First 3 points): `;
                    rec.sampleData.first.slice(0, 3).forEach((d, i) => {
                        prompt += `HR:${d.heartRate || 'N/A'}, SpO2:${d.spo2 || 'N/A'}, GSR:${d.gsr || 'N/A'}`;
                        if (i < 2) prompt += ` | `;
                    });
                    prompt += `\n`;
                    prompt += `  - Sample Data (Last 3 points): `;
                    rec.sampleData.last.slice(-3).forEach((d, i) => {
                        prompt += `HR:${d.heartRate || 'N/A'}, SpO2:${d.spo2 || 'N/A'}, GSR:${d.gsr || 'N/A'}`;
                        if (i < 2) prompt += ` | `;
                    });
                    prompt += `\n`;
                }
            });
            
            if (healthData.recordings.length > 10) {
                prompt += `\n... and ${healthData.recordings.length - 10} more recordings\n`;
            }
            
            prompt += `\n`;
        } else {
            prompt += `Health data is not available yet. Provide general recommendations for maintaining mental and physical health.\n\n`;
        }

        prompt += `Provide 4-6 specific and actionable personal health recommendations in English. `;
        prompt += `Each recommendation must include:\n`;
        prompt += `1. Clear recommendation title\n`;
        prompt += `2. Brief explanation of why this recommendation is important\n`;
        prompt += `3. Concrete steps that can be taken\n`;
        prompt += `4. Expected benefits\n\n`;
        prompt += `Format output as JSON array with structure:\n`;
        prompt += `[\n`;
        prompt += `  {\n`;
        prompt += `    "title": "Recommendation Title",\n`;
        prompt += `    "description": "Complete recommendation explanation",\n`;
        prompt += `    "priority": "high" | "medium" | "low",\n`;
        prompt += `    "icon": "fontawesome-icon-name",\n`;
        prompt += `    "benefits": ["Benefit 1", "Benefit 2"],\n`;
        prompt += `    "duration": "Time required"\n`;
        prompt += `  }\n`;
        prompt += `]\n\n`;
        prompt += `Ensure recommendations are realistic, easy to implement, and focused on mental and physical health.`;

        // Call Gemini API
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        
        // Extract text from response
        let recommendationsText = '';
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            recommendationsText = data.candidates[0].content.parts[0].text;
        }

        // Try to parse JSON from response
        // Gemini might return JSON wrapped in markdown code blocks
        let recommendations = null;
        
        // Try to extract JSON from markdown code blocks
        const jsonMatch = recommendationsText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
            try {
                recommendations = JSON.parse(jsonMatch[1]);
            } catch (e) {
                console.error('Error parsing JSON from code block:', e);
            }
        }
        
        // If no code block, try parsing the whole text
        if (!recommendations) {
            try {
                recommendations = JSON.parse(recommendationsText);
            } catch (e) {
                console.error('Error parsing JSON directly:', e);
                // Fallback: create recommendations from text
                recommendations = createFallbackRecommendations(recommendationsText);
            }
        }

        return recommendations;

    } catch (error) {
        console.error('Error generating recommendations:', error);
        // Return fallback recommendations
        return getFallbackRecommendations();
    }
}

/**
 * Create fallback recommendations from text response
 */
function createFallbackRecommendations(text) {
    // Simple parsing if JSON parsing fails
    // This is a basic fallback
    const recommendations = [];
    const lines = text.split('\n');
    
    let currentRec = null;
    for (const line of lines) {
        if (line.includes('title') || line.includes('Title')) {
            // Extract title
            const titleMatch = line.match(/["']([^"']+)["']/);
            if (titleMatch) {
                if (currentRec) recommendations.push(currentRec);
                currentRec = {
                    title: titleMatch[1],
                    description: '',
                    priority: 'medium',
                    icon: 'fa-heart',
                    benefits: [],
                    duration: ''
                };
            }
        } else if (line.includes('description') || line.includes('Description')) {
            const descMatch = line.match(/["']([^"']+)["']/);
            if (descMatch && currentRec) {
                currentRec.description = descMatch[1];
            }
        }
    }
    if (currentRec) recommendations.push(currentRec);
    
    return recommendations.length > 0 ? recommendations : getFallbackRecommendations();
}

/**
 * Get fallback recommendations if API fails
 */
function getFallbackRecommendations() {
    return [
        {
            title: "Optimize Sleep Pattern",
            description: "Sufficient and quality sleep is essential for mental and physical health. Aim for 7-9 hours of sleep every night at consistent times.",
            priority: "high",
            icon: "fa-moon",
            benefits: ["Improves mood", "Reduces stress", "Enhances concentration"],
            duration: "7-9 hours per night"
        },
        {
            title: "Practice Mindfulness",
            description: "Meditation or mindfulness practice for 10-15 minutes daily can help reduce stress and improve mental well-being.",
            priority: "medium",
            icon: "fa-spa",
            benefits: ["Reduces anxiety", "Improves focus", "Enhances well-being"],
            duration: "10-15 minutes per day"
        },
        {
            title: "Regular Physical Activity",
            description: "Light to moderate exercise for 30 minutes daily can significantly improve both physical and mental health.",
            priority: "medium",
            icon: "fa-running",
            benefits: ["Boosts energy", "Reduces stress", "Improves mood"],
            duration: "30 minutes per day"
        },
        {
            title: "Stay Hydrated",
            description: "Drinking enough water is crucial for brain and body function. Aim for at least 8 glasses of water per day.",
            priority: "low",
            icon: "fa-tint",
            benefits: ["Improves cognitive function", "Boosts energy", "Maintains health"],
            duration: "8 glasses per day"
        }
    ];
}

/**
 * Display recommendations in the UI
 */
function displayRecommendations(recommendations, containerId = 'recommendationsList') {
    const container = document.getElementById(containerId) || document.querySelector('.recommendations-list');
    if (!container) {
        console.error('Recommendations container not found');
        return;
    }

    // Clear existing recommendations
    container.innerHTML = '';

    // Add each recommendation
    recommendations.forEach((rec, index) => {
        const recItem = document.createElement('div');
        recItem.className = `recommendation-item priority-${rec.priority || 'medium'}`;
        
        // Map icon names to available Font Awesome icons or emoji
        // For meditation, use emoji instead of icon
        const iconMap = {
            'fa-meditation': '🧘', // Use meditation emoji (white color via CSS)
            'fa-heart': 'fa-heart',
            'fa-moon': 'fa-moon',
            'fa-running': 'fa-running',
            'fa-tint': 'fa-tint'
        };
        
        const iconValue = iconMap[rec.icon] || rec.icon || 'fa-heart';
        const benefits = rec.benefits || [];
        const duration = rec.duration || '';
        
        // Check if it's an emoji (contains non-ASCII characters) or Font Awesome icon
        const isEmoji = /[\u{1F300}-\u{1F9FF}]/u.test(iconValue);
        const iconDisplay = isEmoji
            ? `<span class="rec-emoji-icon" style="color: white; font-size: 1.5rem; display: block; line-height: 1;">${iconValue}</span>`
            : `<i class="fas ${iconValue}"></i>`;

        recItem.innerHTML = `
            <div class="rec-content-wrapper">
                <div class="rec-icon-wrapper">
                    ${iconDisplay}
                </div>
                <div class="rec-text-content">
                    <h4>${rec.title}</h4>
                    <p>${rec.description}</p>
                    <div class="rec-stats">
                        ${duration ? `<span class="rec-stat"><i class="fas fa-clock"></i> ${duration}</span>` : ''}
                        ${benefits.map(benefit => `<span class="rec-stat"><i class="fas fa-check-circle"></i> ${benefit}</span>`).join('')}
                    </div>
                </div>
            </div>
        `;

        container.appendChild(recItem);
    });
}

// Export functions
window.geminiIntegration = {
    generateHealthRecommendations,
    displayRecommendations,
    getUserHealthData
};
