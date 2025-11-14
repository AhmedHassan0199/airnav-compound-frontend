FROM node:20-alpine

WORKDIR /app

# Build arg for Next.js public env
ARG NEXT_PUBLIC_API_BASE
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

# If your package.json has "start": "next start"
CMD ["npm", "start"]
