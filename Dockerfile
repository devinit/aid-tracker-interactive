# Use a base image
FROM python:3.8

# Set the working directory
WORKDIR /root

# Mount the current folder as /root/aid-tracker-interactive
COPY . /root/aid-tracker-interactive

# Install r-base-core using apt
RUN apt-get update && \
    apt-get install -y r-base-core && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

