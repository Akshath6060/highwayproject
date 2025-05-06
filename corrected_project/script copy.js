// Mobile Menu Toggle
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    
    // Animate hamburger
    const spans = hamburger.querySelectorAll('span');
    spans.forEach(span => span.classList.toggle('active'));
});

// Smooth Scroll for Navigation Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
            // Close mobile menu if open
            navLinks.classList.remove('active');
        }
    });
});

// Simulated Speed Updates
const speedValue = document.querySelector('.speed-value');
let currentSpeed = 45;

function updateSpeed() {
    // Simulate speed changes between 40 and 50 MPH
    const variation = Math.random() * 2 - 1; // Random value between -1 and 1
    currentSpeed = Math.min(Math.max(currentSpeed + variation, 40), 50);
    speedValue.textContent = Math.round(currentSpeed);
}

// Update speed every 2 seconds
setInterval(updateSpeed, 2000);

// Rewards Section Interactions
document.querySelectorAll('.redeem-btn').forEach(button => {
    button.addEventListener('click', function() {
        const rewardName = this.parentElement.querySelector('h4').textContent;
        const pointsCost = this.parentElement.querySelector('p').textContent;
        alert(`Redeeming ${rewardName} for ${pointsCost}`);
    });
});

// Hazard Reporting System
const hazardButtons = document.querySelectorAll('.hazard-btn');
const recentReportsList = document.getElementById('recentReports');

// Store recent reports
let recentReports = [];

hazardButtons.forEach(button => {
    button.addEventListener('click', function() {
        const hazardType = this.dataset.hazard;
        reportHazard(hazardType);
    });
});

function reportHazard(hazardType) {
    const time = new Date().toLocaleTimeString();
    const report = {
        type: hazardType,
        time: time,
        location: 'Current Location' // In a real app, this would use GPS coordinates
    };

    // Add to recent reports
    recentReports.unshift(report);
    if (recentReports.length > 5) {
        recentReports.pop(); // Keep only 5 most recent reports
    }

    // Update the UI
    updateRecentReports();

    // Show confirmation
    const hazardName = hazardType.charAt(0).toUpperCase() + hazardType.slice(1);
    alert(`${hazardName} reported successfully at ${time}`);
}

function updateRecentReports() {
    recentReportsList.innerHTML = '';
    
    recentReports.forEach(report => {
        const reportElement = document.createElement('div');
        reportElement.className = 'report-item';
        
        reportElement.innerHTML = `
            <svg class="report-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4m0 4h.01"/>
            </svg>
            <div class="report-details">
                <div>${report.type.charAt(0).toUpperCase() + report.type.slice(1)}</div>
                <div class="report-time">${report.time} at ${report.location}</div>
            </div>
        `;
        
        recentReportsList.appendChild(reportElement);
    });
}