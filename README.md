# YouTube Offline Viewer

유튜브 영상을 다운로드하고 서버가 꺼진 상태에서도 오프라인으로 시청할 수 있는 웹 애플리케이션입니다. PWA(Progressive Web App) 기술을 사용하여 오프라인 접근을 지원합니다.

## 주요 기능

- **유튜브 영상 다운로드**: URL을 입력하여 고화질 영상과 썸네일을 로컬 서버에 저장합니다.
- **오프라인 모드 지원**: Service Worker를 통해 이전에 다운로드한 영상을 인터넷이나 서버 연결 없이도 시청할 수 있습니다.
- **PWA 지원**: 모바일 기기에서 앱처럼 설치하여 사용할 수 있습니다.
- **사용자 친화적 UI**: 다크 모드 기반의 깔끔한 인터페이스와 실시간 다운로드 진행 상태 확인이 가능합니다.

## 설치 및 실행 방법 (Termux 환경)

아래 명령어를 한 줄씩 또는 한꺼번에 복사하여 Termux에 붙여넣으세요.

### 1. 필수 환경 및 소프트웨어 설치
```bash
# 패키지 목록 업데이트 및 필수 도구(git, nodejs, ffmpeg, python) 설치
pkg update && pkg upgrade -y
pkg install -y git nodejs ffmpeg python
```

### 2. 프로젝트 내려받기 및 의존성 설치
```bash
git clone https://github.com/dltpwl0629-a11y/Youtube_offline-Viewer.git
cd Youtube_offline-Viewer
npm install
```

### 3. 서버 실행
```bash
node server.js
```
서버가 실행되면 콘솔에 `YouTube Viewer V2 running at http://localhost:5000` 메시지가 표시됩니다.

### 4. 접속 방법
브라우저 주소창에 아래 주소를 입력하여 접속합니다:
**[http://localhost:5000](http://localhost:5000)**

## 오프라인 사용 가이드

1. 서버가 켜져 있는 상태에서 영상을 최소 한 번 다운로드하고 목록에서 확인합니다.
2. 영상을 클릭하여 재생하면 자동으로 브라우저 캐시에 저장됩니다.
3. 이후 서버가 꺼지거나 네트워크가 연결되지 않은 상태에서도 `http://localhost:5000`에 접속하면 저장된 영상들을 시청할 수 있습니다.
   - 오프라인 상태일 때는 상단에 주황색 알림바가 표시됩니다.

## 기술 스택
- **Backend**: Node.js, Express
- **Frontend**: Vanilla JS, CSS3, HTML5
- **Offline**: Service Worker, Cache API (PWA)
- **Engine**: yt-dlp (via youtube-dl-exec)

---
© 2026 YouTube Offline Viewer Project
