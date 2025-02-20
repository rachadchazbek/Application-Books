#!/bin/bash

# Set container and image names
CONTAINER_NAME="client-container"
IMAGE_NAME="angular-docker"

# Stop and remove the existing container
echo "Stopping and removing existing container..."
sudo docker stop $CONTAINER_NAME
sudo docker rm $CONTAINER_NAME

# Remove the existing image
echo "Removing existing image..."
sudo docker rmi $IMAGE_NAME

# Pull the latest code from GitHub
echo "Pulling latest code from GitHub..."
sudo git pull 
cd client

# Build the Docker image
echo "Building the Docker image..."
sudo docker build -t $IMAGE_NAME .

# Run the Docker container
echo "Running the Docker container..."
sudo docker run -d --name $CONTAINER_NAME -p 8080:80 $IMAGE_NAME

echo "Deployment complete!"