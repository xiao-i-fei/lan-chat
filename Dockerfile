
# 使用官方Node.js镜像作为基础
FROM node:18-alpine

# 设置工作目录
WORKDIR /usr/src/app

COPY ./* /usr/src/app/

# 安装依赖
RUN npm install

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["npm", "start"]
