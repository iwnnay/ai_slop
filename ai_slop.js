const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { DateTime } = require('luxon');

// Configuration
const START_DATE = '2013-01-01';
const END_DATE = DateTime.now().toISODate();
const SKIP_PROBABILITY = 0.3;
const MIN_WORDS = 5;
const MAX_WORDS = 10000;
const MODEL = 'qwen3-vl:32b';

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

// Generate story idea prompt
async function generateStoryIdea() {
    const prompt = `Generate a creative and engaging children's story idea. The story should be appropriate for young children (ages 3-8). Include: 1) Main characters, 2) Setting, 3) Simple conflict or problem, 4) Resolution, 5) Moral lesson.`;

    try {
        const response = await fetch(OLLAMA_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: MODEL,
                prompt: prompt,
                stream: false
            })
        });

        const data = await response.json();
        return data.response;
    } catch (error) {
        console.error('Error generating story idea:', error);
        return 'Default story idea: A brave little rabbit goes on an adventure.';
    }
}

// Generate full story based on idea
async function generateStory(storyIdea) {
    const prompt = `Write a children's story based on this idea: ${storyIdea}. The story should be engaging for young children, have a clear beginning, middle, and end, and be appropriate for ages 3-8. Keep it between 5-10000 words.`;

    try {
        const response = await fetch(OLLAMA_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: MODEL,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.7,
                    num_predict: Math.floor(Math.random() * (MAX_WORDS - MIN_WORDS + 1)) + MIN_WORDS
                }
            })
        });

        const data = await response.json();
        return data.response;
    } catch (error) {
        console.error('Error generating story:', error);
        return 'Default story: Once upon a time, there was a little bunny who loved to explore.';
    }
}

// Write story to file
function writeStory(date, story) {
    const filename = `story_${date.replace(/-/g, '')}.txt`;
    const filepath = path.join('stories', filename);

    fs.writeFileSync(filepath, story);
    console.log(`Written story for ${date}`);
}

// Commit to Git with specific date
function commitStory(date) {
    try {
        // Add files to git
        execSync('git add stories/', { stdio: 'ignore' });

        // Commit with specific date using GIT_AUTHOR_DATE and GIT_COMMITTER_DATE
        const commitMessage = `Add children's story for ${date}`;
        const env = {
            ...process.env,
            GIT_AUTHOR_DATE: `${date}T12:00:00Z`,
            GIT_COMMITTER_DATE: `${date}T12:00:00Z`
        };

        execSync(`git commit -m "${commitMessage}"`, {
            stdio: 'ignore',
            env: env
        });

        console.log(`Committed story for ${date} with correct date`);
    } catch (error) {
        console.log(`No changes to commit for ${date}`);
    }
}

// Main execution function
async function runStoryGeneration() {
    if (!checkOllama()) return;

    // Create stories directory
    if (!fs.existsSync('stories')) {
        fs.mkdirSync('stories');
    }

    const startDate = DateTime.fromISO(START_DATE);
    const endDate = DateTime.fromISO(END_DATE);
    let currentDate = startDate;

    console.log(`Starting story generation from ${START_DATE} to ${END_DATE}`);
    console.log('This will take a very long time due to the large date range...');

    while (currentDate <= endDate) {
        const dateStr = currentDate.toISODate();

        // 30% chance to skip
        if (Math.random() < SKIP_PROBABILITY) {
            console.log(`Skipping ${dateStr} (30% chance)`);
            currentDate = currentDate.plus({ days: 1 });
            continue;
        }

        try {
            // Generate story idea
            const idea = await generateStoryIdea();

            // Generate full story
            const story = await generateStory(idea);

            // Write to file
            writeStory(dateStr, story);

            // Commit to Git with correct date
            commitStory(dateStr);

        } catch (error) {
            console.error(`Error processing ${dateStr}:`, error);
        }

        currentDate = currentDate.plus({ days: 1 });
    }

    console.log('Story generation complete!');
    console.log('Your GitHub calendar should now be filled with stories!');
}

// Run the application
runStoryGeneration().catch(console.error);

