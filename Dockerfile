FROM node:20-alpine AS builder
WORKDIR /app
# Alpine não vem com OpenSSL por padrão; o motor do Prisma (linux-musl) precisa
# dele em runtime pra carregar libssl. Sem isso: "Error loading shared library
# libssl.so.1.1: No such file or directory".
RUN apk add --no-cache openssl
COPY package*.json ./
COPY prisma ./prisma
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
# Mesma correção da etapa de build: a imagem final também precisa de OpenSSL
# pra rodar o Prisma Client em runtime, não só pra gerá-lo no build.
RUN apk add --no-cache openssl
COPY package*.json ./
COPY prisma ./prisma
RUN npm install --omit=dev
RUN npx prisma generate
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main"]
