# Try SDR-Kit on any computer, no Raspberry Pi or RTL-SDR needed (demo mode):
#   docker build -t sdrkit-demo . && docker run --rm -p 8080:8080 sdrkit-demo
# Open http://localhost:8080
FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends multimon-ng \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY files/ ./files/
COPY VERSION sdrkit.conf ./
ENV SDRKIT_STATE=/tmp/sdrkit-state
EXPOSE 8080
CMD ["python3", "files/sdrkit_server.py", "--demo", "--port", "8080", "--bind", "0.0.0.0", "--conf", "/nonexistent"]
