const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { DateTime } = require('luxon');

// Configuration
const START_DATE = '2013-05-23';
const END_DATE = '2013-12-31';
const SKIP_PROBABILITY = 0.3;
const MIN_WORDS = 5;
const MAX_WORDS = 10000;

// Story types
const STORY_TYPES = [
    'child_story',
    'action_comedy',
    'sports_story',
    'mystery_story'
];

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

// Generate story idea prompt based on type
async function generateStoryIdea(storyType) {
    const prompts = {
        child_story: `Generate a creative and engaging children's story idea. The story should be appropriate for young children (ages 3-8). Include: 1) Main characters, 2) Setting, 3) Simple conflict or problem, 4) Resolution, 5) Moral lesson.`,
        action_comedy: `Generate an action-comedy story idea. The story should be entertaining with elements of adventure, humor, and excitement. Include: 1) Main characters, 2) Setting, 3) Conflict or challenge, 4) Action elements, 5) Comedic elements, 6) Resolution.`,
        sports_story: `Generate a sports story idea. The story should be about athletic competition or sports themes. Include: 1) Sport or athletic activity, 2) Main characters (athletes or team members), 3) Challenge or competition, 4) Sports-related conflict, 5) Resolution with victory or learning.`,
        mystery_story: `Generate a mystery story idea. The story should be engaging with elements of suspense and investigation. Include: 1) Main characters (detective or suspect), 2) Setting, 3) Mystery or crime to solve, 4) Clues, 5) Resolution with revelation of truth.`
    };

    try {
        const response = await fetch(OLLAMA_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama3',
                prompt: prompts[storyType],
                stream: false
            })
        });

        const data = await response.json();
        return data.response;
    } catch (error) {
        console.error('Error generating story idea:', error);
        return `Default ${storyType} idea: A thrilling adventure awaits!`;
    }
}

// Generate full story based on idea and type
async function generateStory(storyIdea, storyType) {
    const prompts = {
        child_story: `Write a children's story based on this idea: ${storyIdea}. The story should be engaging for young children, have a clear beginning, middle, and end, and be appropriate for ages 3-8. Keep it between 5-10000 words.`,
        action_comedy: `Write an action-comedy story based on this idea: ${storyIdea}. The story should be entertaining with elements of adventure, humor, and excitement. Keep it between 5-10000 words.`,
        sports_story: `Write a sports story based on this idea: ${storyIdea}. The story should be about athletic competition or sports themes. Keep it between 5-10000 words.`,
        mystery_story: `Write a mystery story based on this idea: ${storyIdea}. The story should be engaging with elements of suspense and investigation. Keep it between 5-10000 words.`
    };

    try {
        const response = await fetch(OLLAMA_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama3',
                prompt: prompts[storyType],
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
        return 'Default story: Once upon a time, there was an adventure.';
    }
}

// Write story to file with type information
function writeStory(date, story, storyType) {
    const filename = `${storyType}_story_${date.replace(/-/g, '')}.txt`;
    const filepath = path.join('stories', filename);

    fs.writeFileSync(filepath, story);
    console.log(`Written ${storyType} story for ${date}`);
}

// Commit to Git with specific date
function commitStory(date, storyType) {
    try {
        // Add files to git
        execSync('git add stories/', { stdio: 'ignore' });

        // Commit with specific date using GIT_AUTHOR_DATE and GIT_COMMITTER_DATE
        const commitMessage = `Add ${storyType.replace('_', ' ')} story for ${date}`;
        const env = {
            ...process.env,
            GIT_AUTHOR_DATE: `${date}T12:00:00Z`,
            GIT_COMMITTER_DATE: `${date}T12:00:00Z`
        };

        execSync(`git commit -m "${commitMessage}"`, {
            stdio: 'ignore',
            env: env
        });

        console.log(`Committed ${storyType} story for ${date} with correct date`);
    } catch (error) {
        console.log(`No changes to commit for ${date}`);
    }
}

// Randomly select story type
function getRandomStoryType() {
    return STORY_TYPES[Math.floor(Math.random() * STORY_TYPES.length)];
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
    console.log('Stories will be randomly generated as: child story, action/comedy, sports story, or mystery story');

    while (currentDate <= endDate) {
        const dateStr = currentDate.toISODate();

        // 30% chance to skip
        if (Math.random() < SKIP_PROBABILITY) {
            console.log(`Skipping ${dateStr} (30% chance)`);
            currentDate = currentDate.plus({ days: 1 });
            continue;
        }

        try {
            // Randomly select story type
            const storyType = getRandomStoryType();

            // Generate story idea
            const idea = await generateStoryIdea(storyType);

            // Generate full story
            const story = await generateStory(idea, storyType);

            // Write to file
            writeStory(dateStr, story, storyType);

            // Commit to Git with correct date
            commitStory(dateStr, storyType);

        } catch (error) {
            console.error(`Error processing ${dateStr}:`, error);
        }

        currentDate = currentDate.plus({ days: 1 });
    }

    console.log('Story generation complete!');
    console.log('Your GitHub calendar should now be filled with diverse stories!');
}

// Run the application
runStoryGeneration().catch(console.error);

