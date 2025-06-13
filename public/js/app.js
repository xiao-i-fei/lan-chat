
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
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

    socket.onopen = () => {
        console.log('WebSocket连接已建立');
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

    socket.onclose = () => {
        console.log('WebSocket连接已关闭');
    };

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
            copyButton.innerHTML = '⎘';
            copyButton.title = '复制消息';
            copyButton.addEventListener('click', () => {
                const textToCopy = message.text;
                
                // 兼容性处理
                const copyToClipboard = (text) => {
                    if (navigator.clipboard) {
                        return navigator.clipboard.writeText(text)
                            .catch(err => {
                                // 如果clipboard API失败，使用备用方法
                                return execCommandCopy(text);
                            });
                    } else {
                        return execCommandCopy(text);
                    }
                };

                // 备用复制方法
                const execCommandCopy = (text) => {
                    return new Promise((resolve, reject) => {
                        const textarea = document.createElement('textarea');
                        textarea.value = text;
                        textarea.style.position = 'fixed';
                        document.body.appendChild(textarea);
                        textarea.select();
                        
                        try {
                            const successful = document.execCommand('copy');
                            if (successful) {
                                resolve();
                            } else {
                                reject(new Error('复制失败'));
                            }
                        } catch (err) {
                            reject(err);
                        } finally {
                            document.body.removeChild(textarea);
                        }
                    });
                };

                copyToClipboard(textToCopy)
                    .then(() => {
                        console.log('复制成功，准备显示通知');
                        
                        // 移除之前的通知（如果有）
                        const oldNotification = messageElement.querySelector('.copy-notification');
                        if (oldNotification) {
                            console.log('移除旧通知');
                            oldNotification.remove();
                        }
                        
                        const notification = document.createElement('div');
                        notification.classList.add('copy-notification');
                        notification.textContent = '已复制到剪贴板';
                        
                        // 确保通知添加到正确位置
                        const messageContent = messageElement.querySelector('.message-content');
                        messageElement.insertBefore(notification, messageContent.nextSibling);
                        console.log('通知已添加到DOM', notification);
                        
                        // 动画结束后自动移除
                        notification.addEventListener('animationend', () => {
                            console.log('通知动画结束，移除通知');
                            notification.remove();
                        });
                    })
                    .catch(err => {
                        console.error('复制失败:', err);
                        alert('复制失败，请手动选择文本复制');
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
