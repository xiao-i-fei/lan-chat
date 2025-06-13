
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const messageHistory = []; // 存储历史消息
const MAX_HISTORY = 50; // 最大历史消息数
const CLEAR_INTERVAL = 5 * 60 * 1000; // 5分钟清空一次

// 定时清空消息
setInterval(() => {
    messageHistory.length = 0;
    console.log('已自动清空历史消息');
}, CLEAR_INTERVAL);

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// 根路径路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// WebSocket连接处理
wss.on('connection', (ws) => {
    console.log('新客户端已连接');
    
    // 发送历史消息给新连接
    if (messageHistory.length > 0) {
        ws.send(JSON.stringify({
            type: 'history',
            messages: messageHistory.slice(-50) // 最多发送50条历史消息
        }));
    }

    ws.on('message', (message) => {
        // 解析并存储消息
        let parsedMessage;
        try {
            parsedMessage = JSON.parse(message);
            parsedMessage.timestamp = new Date().toISOString();
            messageHistory.push(parsedMessage);
            
            // 广播消息给所有客户端
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'message',
                        ...parsedMessage
                    }));
                }
            });
        } catch (error) {
            console.error('消息解析错误:', error);
        }
    });

    ws.on('close', () => {
        console.log('客户端已断开连接');
    });
});

// 添加清空消息API
app.post('/clear-messages', (req, res) => {
    messageHistory.length = 0;
    // 通知所有客户端消息已清空
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'system',
                text: '管理员已清空聊天记录'
            }));
        }
    });
    res.sendStatus(200);
});

// 启动服务器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`服务器已启动，访问地址: http://localhost:${PORT}`);
    console.log(`局域网内其他设备可通过您的IP地址访问: http://${getLocalIP()}:${PORT}`);
});

// 获取本地IP地址
function getLocalIP() {
    const interfaces = require('os').networkInterfaces();
    for (const devName in interfaces) {
        const iface = interfaces[devName];
        for (let i = 0; i < iface.length; i++) {
            const alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return 'localhost';
}
