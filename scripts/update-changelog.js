#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

/**
 * Updates the CHANGELOG.md file with new entries based on git commits
 * since the last version tag.
 */

function getLastVersionTag() {
  try {
    return execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
  } catch (error) {
    // If no tags exist, return null to get all commits
    return null;
  }
}

function getCommitsSinceLastTag(lastTag) {
  const command = lastTag 
    ? `git log ${lastTag}..HEAD --oneline --no-merges`
    : 'git log --oneline --no-merges';
  
  try {
    const output = execSync(command, { encoding: 'utf8' });
    return output.trim().split('\n').filter(line => line.trim());
  } catch (error) {
    console.warn('No new commits found since last tag');
    return [];
  }
}

function parseCommits(commits) {
  const categories = {
    Added: [],
    Fixed: [],
    Changed: [],
    Removed: [],
    Security: []
  };

  commits.forEach(commit => {
    const message = commit.substring(8); // Remove commit hash
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.startsWith('feat') || lowerMessage.startsWith('feature')) {
      categories.Added.push(message.replace(/^(feat|feature):?\s*/i, ''));
    } else if (lowerMessage.startsWith('fix')) {
      categories.Fixed.push(message.replace(/^fix:?\s*/i, ''));
    } else if (lowerMessage.startsWith('refactor') || lowerMessage.includes('优化')) {
      categories.Changed.push(message.replace(/^refactor:?\s*/i, ''));
    } else if (lowerMessage.startsWith('remove') || lowerMessage.startsWith('delete')) {
      categories.Removed.push(message.replace(/^(remove|delete):?\s*/i, ''));
    } else if (lowerMessage.includes('security') || lowerMessage.includes('安全')) {
      categories.Security.push(message);
    } else {
      // Default to Changed for other commits
      categories.Changed.push(message);
    }
  });

  return categories;
}

function getCurrentVersion() {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  return packageJson.version;
}

function formatChangelogEntry(version, categories) {
  const date = new Date().toISOString().split('T')[0];
  let entry = `\n## [${version}] - ${date}\n`;

  Object.entries(categories).forEach(([category, items]) => {
    if (items.length > 0) {
      entry += `\n### ${category}\n`;
      items.forEach(item => {
        entry += `- ${item}\n`;
      });
    }
  });

  return entry;
}

function updateChangelog(newEntry) {
  const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
  
  if (!fs.existsSync(changelogPath)) {
    console.error('CHANGELOG.md not found. Please create it first.');
    process.exit(1);
  }

  const changelog = fs.readFileSync(changelogPath, 'utf8');
  
  // Find the position to insert new entry (after [Unreleased] section)
  const unreleasedIndex = changelog.indexOf('## [Unreleased]');
  if (unreleasedIndex === -1) {
    console.error('Could not find [Unreleased] section in CHANGELOG.md');
    process.exit(1);
  }

  // Find the next section after Unreleased
  const nextSectionIndex = changelog.indexOf('\n## [', unreleasedIndex + 1);
  const insertPosition = nextSectionIndex === -1 ? changelog.length : nextSectionIndex;

  const updatedChangelog = 
    changelog.slice(0, insertPosition) + 
    newEntry + 
    changelog.slice(insertPosition);

  fs.writeFileSync(changelogPath, updatedChangelog);
  console.log(`✅ CHANGELOG.md updated with version ${getCurrentVersion()}`);
}

function main() {
  console.log('🔍 Checking for new commits...');
  
  const lastTag = getLastVersionTag();
  console.log(lastTag ? `📋 Last version tag: ${lastTag}` : '📋 No previous tags found');
  
  const commits = getCommitsSinceLastTag(lastTag);
  
  if (commits.length === 0) {
    console.log('ℹ️  No new commits to add to changelog');
    return;
  }

  console.log(`📝 Found ${commits.length} new commits`);
  
  const categories = parseCommits(commits);
  const version = getCurrentVersion();
  const changelogEntry = formatChangelogEntry(version, categories);
  
  updateChangelog(changelogEntry);
}

if (require.main === module) {
  main();
}

module.exports = {
  getLastVersionTag,
  getCommitsSinceLastTag,
  parseCommits,
  formatChangelogEntry
};