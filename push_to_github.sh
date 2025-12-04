#!/bin/bash

echo "Setting up GitHub repository..."

# Add the remote repository
git remote add origin git@github.com:iradwatkins/taxgeniusprov1.git

# Push all branches and tags
echo "Pushing to GitHub..."
git push -u origin main --force

echo "Push complete!"
echo ""
echo "Repository URL: https://github.com/iradwatkins/taxgeniusprov1"
echo ""
echo "To clone this repository:"
echo "git clone git@github.com:iradwatkins/taxgeniusprov1.git"