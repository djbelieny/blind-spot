FROM node:22-alpine AS base
WORKDIR /app

# Native build deps for sharp (SVG→PNG rendering)
RUN apk add --no-cache vips-dev fftw-dev gcc g++ make python3

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Runtime: sharp needs vips, video generation needs ffmpeg
RUN apk add --no-cache vips ffmpeg

COPY --from=base /app/.next/standalone ./
COPY --from=base /app/.next/static ./.next/static
COPY --from=base /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
