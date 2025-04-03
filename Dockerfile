FROM oven/bun:1
 WORKDIR /app
 COPY . .
 RUN bun install
  
 ARG PORT
 EXPOSE ${PORT:-7860}
  
 CMD ["bun", "server.js"]