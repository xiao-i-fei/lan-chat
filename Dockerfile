# 使用官方 Node.js 20 Alpine 镜像
FROM node:20-alpine

# 设置工作目录
WORKDIR /chat

# 先复制 package.json 文件（利用 Docker 缓存层）
COPY package*.json ./

# 安装依赖（使用国内镜像加速）
RUN npm install --registry https://registry.npmmirror.com

# 复制应用源代码
COPY . .

# 暴露端口（仅声明作用，实际映射在运行时指定）
EXPOSE 3000

# 直接启动 Node.js 应用
CMD ["node", "server.js"]