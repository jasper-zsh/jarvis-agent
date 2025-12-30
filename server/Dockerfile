# Use Python 3.12 slim as base image
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system libraries required by OpenCV
# libgl1: Provides libGL.so.1 (OpenGL library)
# libglib2.0-0: GLib library
# libsm6: X11 Session Management library
# libxext6: X11 miscellaneous extensions library
# libxrender1: X Rendering Extension library
# libgomp1: GNU OpenMP library
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install uv for dependency management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies using uv sync
# This will create a .venv directory with all dependencies
RUN uv sync --frozen

# Copy the rest of the application files
COPY . .

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Environment variables should be passed at runtime.
# Example usage:
#   docker run -e VAR=value -e ANOTHER_VAR=value myimage
#   docker run --env-file .env myimage
# The application reads environment variables using os.getenv() or os.environ

# Add the virtual environment to PATH so Python from venv is used first
# The .venv/bin directory contains the Python executable
ENV PATH="/app/.venv/bin:$PATH"

# Expose port 7860 (default port for the application)
EXPOSE 7860

# Run the bot using Python from the virtual environment with support for command-line arguments
# ENTRYPOINT allows additional arguments to be passed to bot.py at runtime
#
# Docker usage with arguments:
#   docker run myimage arg1 arg2 arg3
#   docker run myimage --config config.yaml --debug
#
# Kubernetes usage with arguments:
#   spec:
#     containers:
#     - name: bot
#       image: myimage
#       args: ["arg1", "arg2", "arg3"]
#
# Running without arguments still works (backward compatible)
ENTRYPOINT ["python", "server.py"]
