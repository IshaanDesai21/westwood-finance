import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// 🛠️ Config
const NODE_PATH = '/usr/local/bin/node';
const NPM_PATH = '/usr/local/bin/npm';
const AGENT_ID = 'com.westwood.deploy.later';
const PLIST_PATH = path.join(os.homedir(), 'Library', 'LaunchAgents', `${AGENT_ID}.plist`);

function scheduleDeploy() {
    const timeArg = process.argv[2];
    
    if (!timeArg) {
        console.error('❌ Usage: npm run deploy:later HH:MM  OR  npm run deploy:later [minutes]');
        process.exit(1);
    }

    const now = new Date();
    let targetDate = new Date();

    if (!isNaN(Number(timeArg))) {
        // Mode: Minutes from now
        const mins = parseInt(timeArg);
        targetDate.setMinutes(now.getMinutes() + mins);
        console.log(`⏱️  Scheduling for ${mins} minutes from now...`);
    } else if (timeArg.includes(':')) {
        // Mode: Absolute time (HH:MM)
        const [hours, minutes] = timeArg.split(':').map(Number);
        targetDate.setHours(hours, minutes, 0, 0);

        // If time has already passed today, schedule for tomorrow
        if (targetDate <= now) {
            targetDate.setDate(targetDate.getDate() + 1);
        }
    } else {
        console.error('❌ Invalid format. Use HH:MM or a number of minutes.');
        process.exit(1);
    }

    const diffMs = targetDate.getTime() - now.getTime();
    const diffHours = (diffMs / (1000 * 60 * 60)).toFixed(1);

    // 🗓️ Format for pmset: "MM/DD/YYYY HH:MM:SS"
    const pad = (n) => n.toString().padStart(2, '0');
    const pmsetDate = `${pad(targetDate.getMonth() + 1)}/${pad(targetDate.getDate())}/${targetDate.getFullYear()} ${pad(targetDate.getHours())}:${pad(targetDate.getMinutes())}:00`;

    console.log(`\n⏰ Preparing scheduled deployment...`);
    console.log(`📍 Target: ${targetDate.toLocaleString()}`);
    console.log(`⏳ Timer: Deployment will trigger in ${diffHours} hours.`);

    // 📄 1. Create LaunchAgent Plist
    const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${AGENT_ID}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${NPM_PATH}</string>
        <string>--prefix</string>
        <string>${projectRoot}</string>
        <string>run</string>
        <string>deploy</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>${targetDate.getHours()}</integer>
        <key>Minute</key>
        <integer>${targetDate.getMinutes()}</integer>
    </dict>
    <key>RunAtLoad</key>
    <false/>
    <key>StandardOutPath</key>
    <string>${path.join(projectRoot, 'deploy-later.log')}</string>
    <key>StandardErrorPath</key>
    <string>${path.join(projectRoot, 'deploy-later.log')}</string>
</dict>
</plist>`;

    try {
        // 💾 Save Plist
        fs.writeFileSync(PLIST_PATH, plistContent);
        
        // 🚀 2. Load the Agent
        try {
            execSync(`launchctl unload ${PLIST_PATH}`, { stdio: 'ignore' });
        } catch (e) {}
        execSync(`launchctl load ${PLIST_PATH}`);

        // ⚡ 3. Schedule Hardware Wake (Requires sudo)
        console.log(`\n🔑 [PRIVILEGE] Scheduling hardware wake...`);
        console.log(`💡 You may be prompted for your Mac password.`);
        
        const pmsetCmd = `sudo pmset schedule wake "${pmsetDate}"`;
        execSync(pmsetCmd);

        console.log(`\n✅ SUCCESS!`);
        console.log(`🏁 Your Mac will wake up and deploy at ${timeArg}.`);
        console.log(`📝 Log file will be created at: ${path.join(projectRoot, 'deploy-later.log')}`);
        console.log(`⚠️  Note: Keep your Mac connected to power for best results.`);

    } catch (error) {
        console.error(`\n❌ FAILED to schedule:`, error.message);
        process.exit(1);
    }
}

scheduleDeploy();
