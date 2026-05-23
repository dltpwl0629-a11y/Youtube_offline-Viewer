#!/data/data/com.termux/files/usr/bin/bash

# YouTube Viewer V2 자동 시작 스크립트
PROJECT_DIR="/data/data/com.termux/files/home/youtube-viewer-v2"
PORT=5000

echo "[*] YouTube Viewer V2를 확인 중..."

# 서버가 이미 실행 중인지 확인
if curl -s http://localhost:$PORT > /dev/null ; then
    echo "[!] 서버가 이미 실행 중입니다 (Port $PORT)."
else
    echo "[+] 서버를 백그라운드에서 시작합니다..."
    cd $PROJECT_DIR
    nohup node server.js > /dev/null 2>&1 &
    sleep 2 # 서버가 뜨기를 잠시 기다림
fi

# 브라우저로 접속
echo "[+] 브라우저를 엽니다: http://localhost:$PORT"
termux-open-url "http://localhost:$PORT"
