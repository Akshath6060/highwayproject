// Local Storage Service to simulate backend functionality
class LocalStorageService {
    constructor() {
        // Initialize storage with default data if empty
        if (!localStorage.getItem('users')) {
            localStorage.setItem('users', JSON.stringify([]));
        }
        if (!localStorage.getItem('hazards')) {
            localStorage.setItem('hazards', JSON.stringify([]));
        }
        if (!localStorage.getItem('speedRecords')) {
            localStorage.setItem('speedRecords', JSON.stringify([]));
        }
    }

    // User Management
    async signup(username, email, password) {
        const users = JSON.parse(localStorage.getItem('users'));
        if (users.find(u => u.username === username)) {
            throw new Error('Username already exists');
        }

        const newUser = {
            id: Date.now(),
            username,
            email,
            password, // In a real app, this should be hashed
            points: 0,
            level: 'Bronze',
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
        return { userId: newUser.id, username: newUser.username };
    }

    async login(username, password) {
        const users = JSON.parse(localStorage.getItem('users'));
        const user = users.find(u => u.username === username && u.password === password);
        if (!user) {
            throw new Error('Invalid credentials');
        }
        return { userId: user.id, username: user.username };
    }

    // Hazard Reporting
    async reportHazard(userId, hazardType, location) {
        const hazards = JSON.parse(localStorage.getItem('hazards'));
        const users = JSON.parse(localStorage.getItem('users'));

        const newHazard = {
            id: Date.now(),
            userId,
            hazardType,
            location,
            timestamp: new Date().toISOString(),
            status: 'active'
        };

        hazards.push(newHazard);
        localStorage.setItem('hazards', JSON.stringify(hazards));

        // Award points to user
        const user = users.find(u => u.id === userId);
        if (user) {
            user.points += 50;
            this.updateUserLevel(user);
            localStorage.setItem('users', JSON.stringify(users));
        }

        return newHazard;
    }

    // Speed Recording
    async recordSpeed(userId, speed) {
        const speedRecords = JSON.parse(localStorage.getItem('speedRecords'));
        const newRecord = {
            id: Date.now(),
            userId,
            speed,
            timestamp: new Date().toISOString()
        };
        speedRecords.push(newRecord);
        localStorage.setItem('speedRecords', JSON.stringify(speedRecords));
        return newRecord;
    }

    // Rewards Management
    async getRewards(userId) {
        const users = JSON.parse(localStorage.getItem('users'));
        const user = users.find(u => u.id === userId);
        if (!user) {
            throw new Error('User not found');
        }

        const availableRewards = [
            { id: 1, description: 'Free Car Wash', points: 500 },
            { id: 2, description: '$10 Gas Card', points: 1000 },
            { id: 3, description: 'Oil Change', points: 2000 }
        ];

        return {
            userPoints: user.points,
            userLevel: user.level,
            availableRewards
        };
    }

    async redeemReward(userId, rewardId) {
        const users = JSON.parse(localStorage.getItem('users'));
        const user = users.find(u => u.id === userId);
        if (!user) {
            throw new Error('User not found');
        }

        const rewards = {
            1: { description: 'Free Car Wash', points: 500 },
            2: { description: '$10 Gas Card', points: 1000 },
            3: { description: 'Oil Change', points: 2000 }
        };

        const reward = rewards[rewardId];
        if (!reward) {
            throw new Error('Reward not found');
        }

        if (user.points < reward.points) {
            throw new Error('Insufficient points');
        }

        user.points -= reward.points;
        this.updateUserLevel(user);
        localStorage.setItem('users', JSON.stringify(users));

        return {
            message: `Successfully redeemed ${reward.description}`,
            remainingPoints: user.points
        };
    }

    // Helper Methods
    updateUserLevel(user) {
        if (user.points >= 2000) {
            user.level = 'Platinum';
        } else if (user.points >= 1000) {
            user.level = 'Gold';
        } else if (user.points >= 500) {
            user.level = 'Silver';
        }
    }

    // Get recent hazards
    async getRecentHazards() {
        const hazards = JSON.parse(localStorage.getItem('hazards'));
        return hazards
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 5);
    }
}

// Create a global instance
const storageService = new LocalStorageService();

// Export for use in other scripts
window.storageService = storageService;

// Event Listeners for Forms
document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signup-form');
    const loginForm = document.getElementById('login-form');
    const hazardButtons = document.querySelectorAll('.hazard-btn');

    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            try {
                const result = await storageService.signup(username, username + '@example.com', password);
                localStorage.setItem('currentUser', JSON.stringify(result));
                window.location.href = 'index.html';
            } catch (error) {
                alert(error.message);
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            try {
                const result = await storageService.login(username, password);
                localStorage.setItem('currentUser', JSON.stringify(result));
                window.location.href = 'index.html';
            } catch (error) {
                alert(error.message);
            }
        });
    }

    // Mobile Menu Toggle
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            hamburger.querySelectorAll('span').forEach(span => 
                span.classList.toggle('active')
            );
        });
    }

    // Hazard Reporting
    if (hazardButtons) {
        hazardButtons.forEach(button => {
            button.addEventListener('click', async () => {
                const currentUser = JSON.parse(localStorage.getItem('currentUser'));
                if (!currentUser) {
                    alert('Please log in to report hazards');
                    return;
                }

                const hazardType = button.dataset.hazard;
                const location = 'Current Location'; // In a real app, use geolocation
                try {
                    await storageService.reportHazard(currentUser.userId, hazardType, location);
                    updateRecentHazards();
                    alert('Hazard reported successfully');
                } catch (error) {
                    alert(error.message);
                }
            });
        });
    }

    // Initialize rewards if on rewards page
    const rewardsContainer = document.querySelector('.rewards-content');
    if (rewardsContainer) {
        updateRewardsDisplay();
    }

    // Initialize recent hazards if on main page
    const recentReportsList = document.getElementById('recentReports');
    if (recentReportsList) {
        updateRecentHazards();
    }

    // Add event listeners for reward redemption
    const redeemButtons = document.querySelectorAll('.redeem-btn');
    if (redeemButtons) {
        redeemButtons.forEach(button => {
            button.addEventListener('click', async () => {
                const currentUser = JSON.parse(localStorage.getItem('currentUser'));
                if (!currentUser) {
                    alert('Please log in to redeem rewards');
                    return;
                }

                const rewardId = button.dataset.rewardId;
                try {
                    const result = await storageService.redeemReward(currentUser.userId, rewardId);
                    alert(result.message);
                    updateRewardsDisplay();
                } catch (error) {
                    alert(error.message);
                }
            });
        });
    }
});

// Update rewards display
async function updateRewardsDisplay() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;

    try {
        const rewards = await storageService.getRewards(currentUser.userId);
        // Update points and level
        document.querySelector('.points').textContent = rewards.userPoints;
        document.querySelector('.level').textContent = rewards.userLevel;
        
        // Update progress bar
        const progressPercentage = (rewards.userPoints / 3000) * 100;
        document.querySelector('.progress').style.width = `${progressPercentage}%`;
    } catch (error) {
        console.error('Error updating rewards:', error);
    }
}

// Update recent hazards
async function updateRecentHazards() {
    const recentReportsList = document.getElementById('recentReports');
    if (!recentReportsList) return;

    try {
        const recentHazards = await storageService.getRecentHazards();
        recentReportsList.innerHTML = recentHazards.map(hazard => `
            <div class="report-item">
                <svg class="report-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 8v4m0 4h.01"/>
                </svg>
                <div class="report-details">
                    <div>${hazard.hazardType.charAt(0).toUpperCase() + hazard.hazardType.slice(1)}</div>
                    <div class="report-time">${new Date(hazard.timestamp).toLocaleString()} at ${hazard.location}</div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error updating recent hazards:', error);
    }
}

// Simulated Speed Updates
const speedValue = document.querySelector('.speed-value');
if (speedValue) {
    let currentSpeed = 45;
    setInterval(() => {
        const variation = Math.random() * 2 - 1;
        currentSpeed = Math.min(Math.max(currentSpeed + variation, 40), 50);
        speedValue.textContent = Math.round(currentSpeed);
        
        // Record speed if user is logged in
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (currentUser) {
            storageService.recordSpeed(currentUser.userId, currentSpeed);
        }
    }, 2000);
}

async function updateRewardPointsFromServer() {
    const user = storageService.getCurrentUser();
    if (!user) return;

    try {
        const response = await fetch(`http://127.0.0.1:8000/user/${user.username}`);
        if (!response.ok) throw new Error('Failed to fetch user data');

        const data = await response.json();
        document.getElementById('points').innerText = data.rewards;
    } catch (err) {
        console.error('Error fetching rewards:', err);
    }
}

if (window.location.pathname.endsWith('rewards.html')) {
    updateRewardPointsFromServer();
}