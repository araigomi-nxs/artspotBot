/**
 * Daily Streak Renderer - generates streak visualizations as SVG
 * Shows current streaks, best streaks, and daily activity calendar
 */

/**
 * Generate a daily streak calendar as SVG (7 rows x 8 columns grid)
 * Shows the last 56 days of streak activity
 * @param {string} username - Discord username
 * @param {Object} streakData - { current, best, lastDate, activityMap }
 * @param {Map} activityMap - Daily activity data { dateStr: boolean }
 * @returns {string} SVG string
 */
const generateStreakCalendarSVG = (username, streakData, activityMap) => {
  if (!streakData) {
    return null;
  }

  const cellSize = 56;
  const cellSpacing = 6;
  const padding = 80;
  const sidePadding = 100;
  const topPadding = 120;
  const weeksToShow = 26; // 6 months
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Calculate the Sunday of TODAY (right side of calendar - week 25)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayDayOfWeek = today.getUTCDay(); // 0 = Sunday, 6 = Saturday
  const todaySunday = new Date(today);
  todaySunday.setUTCDate(today.getUTCDate() - todayDayOfWeek);
  todaySunday.setUTCHours(0, 0, 0, 0);
  
  // Calculate exactly 25 weeks back from today's Sunday (left side of calendar - week 0)
  const firstSunday = new Date(todaySunday);
  firstSunday.setUTCDate(todaySunday.getUTCDate() - ((weeksToShow - 1) * 7)); // Go back 25 weeks

  // Color scheme for activity
  const getActivityColor = (hasPosted) => {
    if (hasPosted) return '#ff6b35'; // Orange for posted
    return '#374151'; // Gray for not posted
  };

  const getActivityOpacity = (hasPosted) => {
    return hasPosted ? '1.0' : '0.3';
  };

  // Build grid 7 rows (days) x 26 columns (weeks / 6 months)
  const width = sidePadding + (weeksToShow * (cellSize + cellSpacing)) + sidePadding + 40;
  const height = padding + topPadding + (7 * (cellSize + cellSpacing)) + 120;

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .label { font-family: Arial, sans-serif; font-size: 16px; fill: #999; }
    .title { font-family: Arial, sans-serif; font-size: 28px; font-weight: bold; fill: #ff8c42; }
    .stat-label { font-family: Arial, sans-serif; font-size: 18px; fill: #aaa; }
    .stat-value { font-family: Arial, sans-serif; font-size: 36px; font-weight: bold; fill: #ff6b35; }
    .stat-best { fill: #DC143C; }
    .cell { stroke: #555; stroke-width: 2; }
    .posted { fill: #ff6b35; }
    .not-posted { fill: #374151; opacity: 0.3; }
  </style>
  
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="transparent"/>
  
  <!-- Title -->
  <text x="${width/2}" y="50" class="title" text-anchor="middle">${username}'s Art Streak Calendar (Last 6 Months)</text>
  
  <!-- Current & Best Streak Stats -->
  <g>
    <!-- Current Streak -->
    <text x="200" y="100" class="stat-label">Current Streak</text>
    <text x="200" y="140" class="stat-value">${streakData.current} days</text>
    
    <!-- Best Streak -->
    <text x="625" y="100" class="stat-label">Best Streak</text>
    <text x="625" y="140" class="stat-value stat-best">${streakData.best}</text>
    
    <!-- Last Posted -->
    <text x="1050" y="100" class="stat-label">Last Posted</text>
    <text x="1050" y="140" class="stat-value">${streakData.lastDate instanceof Date ? streakData.lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : streakData.lastDate || 'Never'}</text>
  </g>
  
  <!-- Day labels -->`;
  
  dayLabels.forEach((label, i) => {
    svg += `\n  <text x="${sidePadding - 30}" y="${padding + topPadding + (i * (cellSize + cellSpacing)) + cellSize / 2 + 8}" class="label" text-anchor="end" font-size="16">${label}</text>`;
  });

  // Week labels - show date for each Sunday (start of week)
  for (let week = 0; week < weeksToShow; week++) {
    const labelDate = new Date(firstSunday);
    labelDate.setUTCDate(firstSunday.getUTCDate() + (week * 7)); // Sunday of that week
    const dayOfMonth = labelDate.getUTCDate();
    const monthAbbr = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][labelDate.getUTCMonth()];
    const dateLabel = `${monthAbbr} ${dayOfMonth}`;
    const xOffset = sidePadding + (week * (cellSize + cellSpacing));
    svg += `\n  <text x="${xOffset + cellSize / 2}" y="${padding + topPadding - 20}" class="label" text-anchor="middle" font-size="16">${dateLabel}</text>`;
  }

  // Draw activity grid
  svg += '\n  <!-- Activity grid -->';
  
  // Calculate the Saturday of the current week (end of current week)
  const saturdayOfCurrentWeek = new Date(todaySunday);
  saturdayOfCurrentWeek.setUTCDate(todaySunday.getUTCDate() + 6); // Add 6 days to get Saturday
  
  // Iterate through each date from firstSunday through the end of current week
  let currentDate = new Date(firstSunday);
  while (currentDate <= saturdayOfCurrentWeek) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayOfWeek = currentDate.getUTCDay(); // 0 = Sunday
    
    // Calculate which Sunday this date belongs to
    const datesSunday = new Date(currentDate);
    datesSunday.setUTCDate(currentDate.getUTCDate() - dayOfWeek);
    
    // Calculate weeks since firstSunday
    const weeksDiff = Math.floor((datesSunday.getTime() - firstSunday.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const week = weeksDiff;
    
    if (week >= 0 && week < weeksToShow) {
      const hasPosted = activityMap && activityMap.get(dateStr);
      const x = sidePadding + (week * (cellSize + cellSpacing));
      const y = padding + topPadding + (dayOfWeek * (cellSize + cellSpacing));
      const className = hasPosted ? 'posted' : 'not-posted';
      
      svg += `\n  <rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="4" ry="4" class="cell ${className}"/>`;
      
      // Add day number only if posted
      if (hasPosted) {
        const dayNum = currentDate.getUTCDate();
        svg += `\n  <text x="${x + cellSize / 2}" y="${y + cellSize / 2 + 6}" font-family="Arial" font-size="14" font-weight="bold" fill="#fff" text-anchor="middle">${dayNum}</text>`;
      }
    }
    
    // Move to next day
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  // Legend
  svg += `\n  <!-- Legend -->
  <rect x="${sidePadding}" y="${height - 50}" width="20" height="20" rx="3" fill="#ff6b35"/>
  <text x="${sidePadding + 30}" y="${height - 32}" class="label" font-size="16">Posted</text>
  
  <rect x="${sidePadding + 180}" y="${height - 50}" width="20" height="20" rx="3" fill="#374151" opacity="0.3"/>
  <text x="${sidePadding + 210}" y="${height - 32}" class="label" font-size="16">No Post</text>
  
  </svg>`;
  
  return svg;
};

/**
 * Generate a streak statistics card as SVG
 * Shows current streak, best streak, and milestone progress
 * @param {string} username - Discord username
 * @param {Object} streakData - { current, best, lastDate, milestones[] }
 * @returns {string} SVG string
 */
const generateStreakStatsCardSVG = (username, streakData) => {
  if (!streakData) {
    return null;
  }

  const width = 500;
  const height = 350;
  const glowColor = '#ff6b35';
  const accentColor = '#DC143C';

  // Calculate milestone progress
  const milestones = [
    { day: 7, label: '1 Week' },
    { day: 14, label: '2 Weeks' },
    { day: 30, label: '1 Month' },
    { day: 60, label: '2 Months' },
    { day: 100, label: '100 Days' },
  ];

  const nextMilestone = milestones.find(m => streakData.current < m.day) || milestones[milestones.length - 1];
  const progress = Math.min((streakData.current / nextMilestone.day) * 100, 100);

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fireGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#ff6b35;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#ff8c42;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <style>
    .bg-card { fill: #1e1e1e; }
    .title { font-family: Arial, sans-serif; font-size: 20px; font-weight: bold; fill: #ffffff; }
    .label { font-family: Arial, sans-serif; font-size: 12px; fill: #999999; }
    .value { font-family: Arial, sans-serif; font-size: 32px; font-weight: bold; fill: #ff6b35; }
    .best-value { fill: #DC143C; }
    .milestone-label { font-family: Arial, sans-serif; font-size: 11px; fill: #aaa; }
    .progress-bar { fill: #374151; }
    .progress-fill { fill: url(#fireGradient); }
  </style>
  
  <!-- Background -->
  <rect width="${width}" height="${height}" rx="10" class="bg-card" stroke="#ff6b35" stroke-width="2" opacity="0.9"/>
  
  <!-- Title -->
  <text x="25" y="35" class="title">${username}'s Streak</text>
  
  <!-- Current Streak Section -->
  <g>
    <text x="25" y="70" class="label">CURRENT STREAK</text>
    <text x="25" y="115" class="value">${streakData.current} days</text>
    <text x="25" y="140" class="label">Last posted: ${streakData.lastDate || 'N/A'}</text>
  </g>
  
  <!-- Best Streak Section -->
  <g>
    <text x="280" y="70" class="label">BEST STREAK</text>
    <text x="280" y="115" class="value best-value">${streakData.best} days</text>
  </g>
  
  <!-- Next Milestone -->
  <g>
    <text x="25" y="180" class="label">NEXT MILESTONE</text>
    <text x="25" y="205" class="milestone-label" font-size="14">${nextMilestone.label} (${nextMilestone.day} days)</text>
    
    <!-- Progress Bar -->
    <rect x="25" y="215" width="450" height="20" rx="5" class="progress-bar"/>
    <rect x="25" y="215" width="${Math.min(450, 450 * progress / 100)}" height="20" rx="5" class="progress-fill"/>
    <text x="260" y="232" font-family="Arial" font-size="12" fill="#fff" text-anchor="middle" font-weight="bold">${Math.round(progress)}%</text>
  </g>
  
  <!-- Motivational Message -->
  <g>
    <text x="25" y="280" class="label">KEEP IT UP!</text>
    <text x="25" y="305" font-family="Arial" font-size="14" fill="#22c55e" font-weight="bold">Post your art today to continue your streak!</text>
  </g>
  
</svg>`;

  return svg;
};

/**
 * Convert SVG string to PNG buffer using Sharp
 * @param {string} svgString - SVG XML string
 * @param {Object} options - Conversion options { width, height, density }
 * @returns {Promise<Buffer>} PNG image buffer
 */
const svgToPngBuffer = async (svgString, options = {}) => {
  try {
    const sharp = require('sharp');
    
    if (!svgString) {
      console.error('❌ No SVG string provided for PNG conversion');
      return null;
    }

    const { skipResize = false, density = 200 } = options;

    console.log(`Converting Streak SVG to PNG (density: ${density}dpi)...`);

    // Convert SVG to PNG using Sharp
    let pipeline = sharp(Buffer.from(svgString), { 
      density: density
    }).png({ quality: 100, compressionLevel: 6, progressive: false });

    // Don't resize - let it render at natural SVG dimensions
    if (skipResize !== true) {
      // Just apply density, no resizing
      console.log('✅ Rendering at natural SVG dimensions...');
    }

    const pngBuffer = await pipeline.toBuffer();

    console.log(`✅ Streak PNG generated successfully (${pngBuffer.length} bytes)`);
    
    return pngBuffer;
  } catch (error) {
    console.error(`❌ Error converting SVG to PNG: ${error.message}`);
    return null;
  }
};

/**
 * Generate streak calendar SVG and convert to PNG buffer
 * @param {string} username - Discord username
 * @param {Object} streakData - Streak tracking data
 * @param {Map} activityMap - Daily activity data
 * @returns {Promise<{png: Buffer, svg: string}>} PNG buffer and SVG string
 */
const generateStreakCalendarPNG = async (username, streakData, activityMap) => {
  try {
    // Generate SVG first
    const svgString = generateStreakCalendarSVG(username, streakData, activityMap);
    
    if (!svgString) {
      console.warn(`⚠️ Failed to generate streak calendar SVG for ${username}`);
      return { png: null, svg: null };
    }

    // Convert to PNG - render at natural SVG dimensions for full calendar view
    const pngBuffer = await svgToPngBuffer(svgString, { 
      density: 200
    });

    return { png: pngBuffer, svg: svgString };
  } catch (error) {
    console.error(`❌ Error generating streak calendar PNG: ${error.message}`);
    return { png: null, svg: null };
  }
};

/**
 * Generate streak stats card SVG and convert to PNG buffer
 * @param {string} username - Discord username
 * @param {Object} streakData - Streak tracking data
 * @returns {Promise<{png: Buffer, svg: string}>} PNG buffer and SVG string
 */
const generateStreakStatsPNG = async (username, streakData) => {
  try {
    // Generate SVG first
    const svgString = generateStreakStatsCardSVG(username, streakData);
    
    if (!svgString) {
      console.warn(`⚠️ Failed to generate streak stats SVG for ${username}`);
      return { png: null, svg: null };
    }

    // Convert to PNG with dimensions
    const pngBuffer = await svgToPngBuffer(svgString, { 
      width: 600, 
      height: 420,
      density: 400
    });

    return { png: pngBuffer, svg: svgString };
  } catch (error) {
    console.error(`❌ Error generating streak stats PNG: ${error.message}`);
    return { png: null, svg: null };
  }
};

/**
 * Generate a text-based streak summary
 * @param {Object} streakData - { current, best, lastDate }
 * @returns {string} Formatted text summary
 */
const generateStreakSummary = (streakData) => {
  if (!streakData) {
    return 'No streak data available';
  }

  const flame = '-';
  const star = '*';
  
  return `
**${flame} Current Streak:** ${streakData.current} days
**${star} Best Streak:** ${streakData.best} days
**Date:** Last Posted: ${streakData.lastDate || 'Never'}
  `.trim();
};

module.exports = {
  generateStreakCalendarSVG,
  generateStreakStatsCardSVG,
  generateStreakCalendarPNG,
  generateStreakStatsPNG,
  generateStreakSummary,
  svgToPngBuffer,
};
