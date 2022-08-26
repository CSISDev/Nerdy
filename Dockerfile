FROM node:alpine
WORKDIR /usr/nerdy-bot
COPY package.json .
RUN npm install
COPY . .
RUN npx tsc
CMD ["node", "./dist/Nerdy.js"]