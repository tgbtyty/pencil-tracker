#!/bin/bash

# Enhanced deployment script for the furniture tracking system
echo "Starting deployment process..."

# Define directories
BACKEND_DIR=~/furniture-tracking-app/backend
FRONTEND_DIR=~/furniture-tracking-app/frontend

# Create directories if they don't exist
mkdir -p $BACKEND_DIR
mkdir -p $FRONTEND_DIR

# Backend deployment
echo "Deploying backend..."
cd $BACKEND_DIR
git pull origin main

# Install backend dependencies
echo "Installing backend dependencies..."
npm install

# Frontend deployment
echo "Deploying frontend..."
cd $FRONTEND_DIR
git pull origin main

# Install frontend dependencies
echo "Installing frontend dependencies..."
npm install

# Build frontend
echo "Building frontend..."
npm run build

# Start or restart the backend server
echo "Starting/restarting server..."
cd $BACKEND_DIR
pm2 describe server > /dev/null
if [ $? -eq 0 ]; then
  # Server exists, restart it
  pm2 restart server
else
  # Server doesn't exist, start it
  pm2 start server.js --name server
fi

echo "Deployment complete!"