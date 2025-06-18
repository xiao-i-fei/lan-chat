
document.addEventListener('DOMContentLoaded', () => {
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const clearButton = document.getElementById('clearButton');
    const messagesContainer = document.getElementById('messages');
    const usernameDisplay = document.getElementById('username');

    // 生成随机用户名
    const username = `用户${Math.floor(Math.random() * 1000)}`;
    usernameDisplay.textContent = username;

    // 创建WebSocket连接
    let socket;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;

    function connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        socket = new WebSocket(`${protocol}//${window.location.host}/ws`);
        
        socket.onopen = () => {
            console.log('WebSocket连接已建立');
            reconnectAttempts = 0;
            showConnectionStatus('connected');
        };

        socket.onerror = (error) => {
            console.error('WebSocket错误:', error);
            showConnectionStatus('error');
        };

        socket.onclose = () => {
            console.log('WebSocket连接已关闭');
            showConnectionStatus('disconnected');
            
            // 自动重连机制
            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                const delay = Math.min(3000, 500 * Math.pow(2, reconnectAttempts));
                console.log(`将在 ${delay}ms 后尝试重连...`);
                setTimeout(connectWebSocket, delay);
                reconnectAttempts++;
            }
        };

        socket.onmessage = async (event) => {
            let data = event.data;
            if (data instanceof Blob) {
                data = await data.text();
            }
            try {
                const payload = JSON.parse(data);
                if (payload.type === 'history') {
                    // 处理历史消息
                    payload.messages.forEach(message => {
                        displayMessage(message);
                    });
                } else if (payload.type === 'message') {
                    // 处理实时消息
                    displayMessage(payload);
                } else if (payload.type === 'system' && payload.text.includes('清空')) {
                    // 处理清空系统通知
                    messagesContainer.innerHTML = '';
                    displayMessage(payload);
                }
            } catch (error) {
                console.error('消息解析错误:', error);
            }
        };
    }

    // 显示连接状态
    function showConnectionStatus(status) {
        const statusElement = document.getElementById('connectionStatus');
        if (!statusElement) return;
        
        statusElement.textContent = {
            connected: '✓ 已连接',
            disconnected: '⚠ 连接断开',
            error: '⚠ 连接错误'
        }[status] || '';
        
        statusElement.className = `connection-status ${status}`;
    }

    // 创建状态显示元素
    function createStatusElement() {
        const statusEl = document.createElement('div');
        statusEl.id = 'connectionStatus';
        statusEl.className = 'connection-status';
        document.querySelector('.header-controls').prepend(statusEl);
    }

    // 优化复制功能
    function copyToClipboard(text) {
        return new Promise((resolve, reject) => {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text).then(resolve).catch(reject);
            } else {
                // 兼容旧浏览器
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                document.body.appendChild(textarea);
                textarea.select();
                
                try {
                    document.execCommand('copy') ? resolve() : reject();
                } catch (err) {
                    reject(err);
                } finally {
                    document.body.removeChild(textarea);
                }
            }
        });
    }

    // 显示通知（优化位置和动画）
    function showNotification(message) {
        const existing = document.querySelector('.copy-notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.className = 'copy-notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // 自动消失
        setTimeout(() => {
            notification.style.animation = 'fadeInOut 0.5s ease-in-out forwards';
            setTimeout(() => notification.remove(), 500);
        }, 1500);
    }

    // 初始化时创建状态元素
    createStatusElement();
    connectWebSocket();

    function displayMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        
        if (message.type === 'system') {
            messageElement.classList.add('system');
            const messageContent = document.createElement('div');
            messageContent.classList.add('message-content');
            messageContent.textContent = message.text;
            messageElement.appendChild(messageContent);
        } else {
            messageElement.classList.add(message.sender === username ? 'sent' : 'received');
            const messageInfo = document.createElement('div');
            messageInfo.classList.add('message-info');
            messageInfo.textContent = `${message.sender} - ${new Date(message.timestamp).toLocaleTimeString()}`;

            const messageContent = document.createElement('div');
            messageContent.classList.add('message-content');
            messageContent.textContent = message.text;

            // 添加复制按钮
            const copyButton = document.createElement('button');
            copyButton.classList.add('copy-button');
            copyButton.innerHTML = '📋';
            copyButton.title = '复制消息';
            copyButton.addEventListener('click', () => {
                copyToClipboard(message.text)
                    .then(() => showNotification('已复制到剪贴板'))
                    .catch(err => {
                        console.error('复制失败:', err);
                        showNotification('复制失败，请手动选择文本');
                    });
            });

            messageElement.appendChild(messageInfo);
            messageElement.appendChild(messageContent);
            messageElement.appendChild(copyButton);
        }
        
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    async function clearMessages() {
        try {
            const response = await fetch('/clear-messages', {
                method: 'POST'
            });
            if (!response.ok) {
                throw new Error('清空请求失败');
            }
        } catch (error) {
            console.error('清空消息失败:', error);
            displayMessage({
                type: 'system',
                text: '清空聊天记录失败: ' + error.message
            });
        }
    }

    function sendMessage() {
        const text = messageInput.value.trim();
        if (text && socket.readyState === WebSocket.OPEN) {
            const message = {
                sender: username,
                text: text,
                timestamp: new Date().toISOString()
            };
            socket.send(JSON.stringify(message));
            messageInput.value = '';
        }
    }

    sendButton.addEventListener('click', sendMessage);
    clearButton.addEventListener('click', clearMessages);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
});
