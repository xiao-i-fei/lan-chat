#!/bin/bash

# 要检测的端口（根据你的 server.js 设置）
PORT=3000

# 获取 PID 的函数：找出含有 npm start 或 node server.js 的进程
get_pids() {
    local pids=()
    # BusyBox ps 输出格式：PID USER VSZ STAT COMMAND
    while read -r pid cmd; do
        if echo "$cmd" | grep -qE "npm start|node server\.js"; then
            pids+=("$pid")
        fi
    done < <(ps | awk 'NR>1 {print $1, $5}')
    echo "${pids[@]}"
}


# 查找占用端口的 PID
get_port_pids() {
    lsof -i :$PORT -t 2>/dev/null
}

# 启动服务
start_service() {
    echo "检查已有 npm start 或 node server.js 进程..."
    pids=$(get_pids)
    if [ -n "$pids" ]; then
        echo "发现旧进程，准备杀死：$pids"
        kill -9 $pids
    fi

    # 检查端口占用
    port_pids=$(get_port_pids)
    if [ -n "$port_pids" ]; then
        echo "发现端口占用（$PORT），准备杀死：$port_pids"
        kill -9 $port_pids
    fi

    echo "启动服务..."
    nohup npm start > npm_service.log 2>&1 &
    echo "服务已启动，日志写入 npm_service.log"
}

# 停止服务
stop_service() {
    echo "停止服务..."
    pids=$(get_pids)
    if [ -n "$pids" ]; then
        echo "发现进程，准备杀死：$pids"
        kill -9 $pids
    fi

    port_pids=$(get_port_pids)
    if [ -n "$port_pids" ]; then
        echo "发现端口占用（$PORT），准备杀死：$port_pids"
        kill -9 $port_pids
    fi

    echo "服务已停止"
}

# 帮助信息
usage() {
    echo "用法: $0 {start|stop}"
}

case "$1" in
    start)
        start_service
        ;;
    stop)
        stop_service
        ;;
    *)
        start_service
        ;;
esac

