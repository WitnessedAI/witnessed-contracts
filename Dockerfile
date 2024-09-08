# Use the official Node.js 18 image as the base image
FROM node:18
LABEL maintainer="Syed <syed@bcw.group>"

# Install tini and other dependencies using apt
RUN apt-get update && apt-get install -y \
    curl \
    software-properties-common \
    build-essential \
    git \
    wget \
    ca-certificates \
    libssl-dev \
    tini \
    && rm -rf /var/lib/apt/lists/*

# Install Foundry and Anvil (using Foundry's installation script)
RUN curl -L https://foundry.paradigm.xyz | bash

# Add Foundry to PATH
ENV PATH="/root/.foundry/bin:${PATH}"

# Run foundryup to ensure Anvil and Foundry binaries are installed
RUN /root/.foundry/bin/foundryup

# Set the working directory
WORKDIR /app

# Copy the repository files into the container
COPY . .

# Initialize git submodules
RUN git submodule update --init --recursive

# Install dependencies for each submodule
# RUN cd prereq/safe-singleton-factory && npm install
# RUN cd prereq/safe-smart-account && yarn install

# Make the run.sh script executable
RUN chmod +x /app/run.sh

# Expose Anvil ports
EXPOSE 8545

# Use tini as the init system to handle signals properly
ENTRYPOINT ["/usr/bin/tini", "--"]

# Run your shell script after everything is set up
CMD ["/app/run.sh"]
