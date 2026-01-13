#!/bin/bash

# ============================================
# Electostatica - GitHub Setup Script
# ============================================
# This script initializes a git repository,
# commits all files, and pushes to GitHub.
# ============================================

# Exit on error
set -e

# Configuration - UPDATE THESE VALUES
GITHUB_USERNAME="cayetanomarmur"       # <-- Replace with your GitHub username
REPO_NAME="Electostatica"             # <-- Your repository name

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Electostatica GitHub Setup ===${NC}"

# Step 1: Initialize git if not already initialized
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}Initializing Git repository...${NC}"
    git init
else
    echo "Git already initialized."
fi

# Step 2: Add all files
echo -e "${YELLOW}Adding files...${NC}"
git add .

# Step 3: Create initial commit
echo -e "${YELLOW}Creating commit...${NC}"
git commit -m "Initial commit: Electostatica - Spanish Electoral Data Visualization"

# Step 4: Rename branch to main (if needed)
git branch -M main

# Step 5: Add remote origin
echo -e "${YELLOW}Adding remote origin...${NC}"
git remote add origin "https://github.com/${GITHUB_USERNAME}/${REPO_NAME}.git" 2>/dev/null || \
git remote set-url origin "https://github.com/${GITHUB_USERNAME}/${REPO_NAME}.git"

# Step 6: Push to GitHub
echo -e "${YELLOW}Pushing to GitHub...${NC}"
git push -u origin main

echo -e "${GREEN}=== Done! ===${NC}"
echo ""
echo "Your repository is now at: https://github.com/${GITHUB_USERNAME}/${REPO_NAME}"
echo ""
echo "Next steps for Vercel deployment:"
echo "1. Go to https://vercel.com/new"
echo "2. Import your GitHub repository"
echo "3. Vercel will auto-detect Vite and deploy!"
