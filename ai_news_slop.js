const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { DateTime } = require('luxon');

// Configuration
const START_DATE = '2014-01-01';
const END_DATE = '2014-12-31';

// Ollama API endpoint
const OLLAMA_URL = 'http://localhost:11434/api/generate';

// Ensure Ollama is running
function checkOllama() {
    try {
        const result = execSync('curl -s http://localhost:11434/api/tags', { encoding: 'utf8' });
        console.log('Ollama is running');
        return true;
    } catch (error) {
        console.error('Ollama is not running. Please start Ollama first.');
        return false;
    }
}

// Generate important event for a specific date
async function generateImportantEvent(date) {
    const prompt = `What were the most important global events that happened on ${date}? Please list 10 major events that occurred on this date in 2014. Include significant news, sports, cultural, or historical events. Format at as a mardown file`;

    try {
        const response = await fetch(OLLAMA_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama3',
                prompt: prompt,
                stream: false
            })
        });

        const data = await response.json();
        return data.response;
    } catch (error) {
        console.error('Error generating important events:', error);
        return 'Error generating events for this date.';
    }
}

// Save events to file
function saveEvents(date, events) {
    const filename = `${date.replace(/-/g, '')}.md`;
    const filepath = path.join('news', filename);

    const content = `Important Events for ${date}:\n\n${events}\n`;
    fs.writeFileSync(filepath, content);
    console.log(`Saved events for ${date}`);
}

// Commit to Git with specific date
function commitEvents(date) {
    try {
        // Add files to git
        execSync('git add news/', { stdio: 'ignore' });

        // Commit with specific date using GIT_AUTHOR_DATE and GIT_COMMITTER_DATE
        const commitMessage = `Add important events for ${date}`;
        const env = {
            ...process.env,
            GIT_AUTHOR_DATE: `${date}T12:00:00Z`,
            GIT_COMMITTER_DATE: `${date}T12:00:00Z`
        };

        execSync(`git commit -m "${commitMessage}"`, {
            stdio: 'ignore',
            env: env
        });

        console.log(`Committed events for ${date} with correct date`);
    } catch (error) {
        console.log(`No changes to commit for ${date}`);
    }
}

// Main execution function
async function runEventGeneration() {
    if (!checkOllama()) return;

    // Create news directory
    if (!fs.existsSync('news')) {
        fs.mkdirSync('news');
    }

    const startDate = DateTime.fromISO(START_DATE);
    const endDate = DateTime.fromISO(END_DATE);
    let currentDate = startDate;

    console.log(`Starting event generation for 2014 from ${START_DATE} to ${END_DATE}`);
    console.log('This will take some time to process all dates...');

    while (currentDate <= endDate) {
        const dateStr = currentDate.toISODate();

        try {
            // Generate important events for the date
            const events = await generateImportantEvent(dateStr);

            // Save events to file
            saveEvents(dateStr, events);

            // Commit with correct date
            commitEvents(dateStr);

        } catch (error) {
            console.error(`Error processing ${dateStr}:`, error);
        }

        currentDate = currentDate.plus({ days: 1 });
    }

    console.log('Event generation and commit complete!');
    console.log('All commits are properly dated for 2014.');
}

// Run the application
runEventGeneration().catch(console.error);

