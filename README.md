# YouTube Offline Viewer

유튜브 영상을 다운로드하고 서버가 꺼진 상태에서도 오프라인으로 시청할 수 있는 웹 애플리케이션입니다.

## 📱 설치 및 실행 방법 (Termux 환경)

Termux 터미널을 열고 아래 명령어를 순서대로 입력하세요.

### 1. 필수 환경 및 소프트웨어 설치
```bash
# 패키지 목록 업데이트
pkg update && pkg upgrade -y

# 필요한 도구(git, nodejs, ffmpeg, python) 설치
pkg install -y git nodejs ffmpeg python
```

### 2. 프로젝트 내려받기 및 설정
```bash
# 코드 복사
git clone https://github.com/dltpwl0629-a11y/Youtube_offline-Viewer.git
cd Youtube_offline-Viewer

# 의존성 패키지 설치
npm install
```

### 3. 서버 실행
```bash
node server.js
```
- 콘솔에 `YouTube Offline Viewer running at http://localhost:5000` 메시지가 뜨면 서버가 성공적으로 실행된 것입니다.

### 4. 접속 및 사용 방법
1. 브라우저 주소창에 **[http://localhost:5000](http://localhost:5000)** 을 입력하여 접속합니다.
2. 유튜브 영상 주소를 입력하고 다운로드 버튼을 누릅니다.
3. **오프라인 사용**: 서버가 켜져 있을 때 영상을 다운로드하면, 이후 네트워크가 끊기거나 서버를 꺼도 `http://localhost:5000`에 접속하여 보관함의 영상을 시청할 수 있습니다.

---

## 🛠 문제 해결 (Troubleshooting)

- **다운로드가 안 될 때**: `which yt-dlp`를 입력해서 아무것도 나오지 않는다면 `pip install yt-dlp`를 실행하세요.
- **영상이 재생되지 않을 때**: `ffmpeg`가 제대로 설치되었는지 `ffmpeg -version`으로 확인하세요.
- **접속되지 않을 때**: 서버 터미널이 열려 있는지 확인하고, 주소를 다시 확인해 주세요.
