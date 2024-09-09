#!/bin/bash

# Stop and remove any running containers based on the old image
docker ps -q --filter "ancestor=safe-poc" | grep -q . && docker stop $(docker ps -q --filter "ancestor=safe-poc")
docker ps -a -q --filter "ancestor=safe-poc" | grep -q . && docker rm $(docker ps -a -q --filter "ancestor=safe-poc")

# Remove the old Docker image
docker rmi safe-poc --force

# Build the Docker image again
docker build -t safe-poc .

# Run the Docker container
docker run -p 8545:8545 -p 3000:3000 safe-poc
