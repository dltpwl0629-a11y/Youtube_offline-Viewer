document.addEventListener('DOMContentLoaded', () => {
    const urlInput = document.getElementById('urlInput');
    const downloadBtn = document.getElementById('downloadBtn');
    const statusMessage = document.getElementById('statusMessage');
    const progressBarContainer = document.getElementById('progressBarContainer');
    const progressBar = document.getElementById('progressBar');
    const libraryList = document.getElementById('libraryList');
    const offlineIndicator = document.getElementById('offlineIndicator');

    const videoModal = document.getElementById('videoModal');
    const videoPlayer = document.getElementById('videoPlayer');
    const modalTitle = document.getElementById('modalTitle');
    const closeBtn = document.querySelector('.close-btn');

    loadLibrary();

    window.addEventListener('online', () => {
        offlineIndicator.classList.add('hidden');
        loadLibrary();
    });
    window.addEventListener('offline', () => {
        offlineIndicator.classList.remove('hidden');
    });

    downloadBtn.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        if (!url) return showStatus('URL을 입력해 주세요.', 'error');

        showStatus('준비 중...', 'info');
        downloadBtn.disabled = true;
        progressBarContainer.classList.remove('hidden');
        progressBar.style.width = '0%';
        progressBar.textContent = '0%';

        try {
            const response = await fetch('/api/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });

            const result = await response.json();
            if (!result.success) throw new Error(result.error);

            // SSE 연결
            const eventSource = new EventSource(`/api/download-progress?url=${encodeURIComponent(url)}`);

            eventSource.onmessage = (event) => {
                const data = JSON.parse(event.data);

                if (data.type === 'progress') {
                    progressBar.style.width = `${data.percent}%`;
                    progressBar.textContent = `${data.percent}%`;
                    showStatus(`다운로드 중... (남은 시간: ${data.eta})`, 'info');
                } else if (data.type === 'complete') {
                    eventSource.close();
                    showStatus('완료!', 'success');
                    progressBar.style.width = '100%';
                    progressBar.textContent = '100%';
                    urlInput.value = '';
                    downloadBtn.disabled = false;
                    setTimeout(() => progressBarContainer.classList.add('hidden'), 3000);
                    loadLibrary();
                } else if (data.type === 'error') {
                    eventSource.close();
                    showStatus(`오류: ${data.error}`, 'error');
                    downloadBtn.disabled = false;
                    progressBarContainer.classList.add('hidden');
                }
            };
        } catch (error) {
            showStatus(error.message, 'error');
            downloadBtn.disabled = false;
            progressBarContainer.classList.add('hidden');
        }
    });

    async function loadLibrary() {
        try {
            const res = await fetch('/api/library');
            const library = await res.json();
            renderLibrary(library);
            // 라이브러리 로드 후 미디어 캐싱 시도
            cacheMedia(library);
            offlineIndicator.classList.add('hidden');
        } catch (e) { 
            console.error('로드 실패', e);
            offlineIndicator.classList.remove('hidden');
            showStatus('오프라인 모드: 저장된 데이터를 표시합니다.', 'info');
        }
    }

    async function cacheMedia(library) {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            library.forEach(video => {
                // 썸네일과 비디오를 fetch하여 Service Worker가 캐싱하도록 유도
                fetch(`/thumbnails/${video.thumbnailName}`);
                // 비디오는 용량이 클 수 있으므로 선택적으로 하거나, 
                // 여기서는 오프라인 접근이 목적이므로 fetch를 시도합니다.
                // 브라우저 캐시 정책에 따라 중복 다운로드는 피하게 됩니다.
                fetch(`/videos/${video.fileName}`);
            });
        }
    }

    function renderLibrary(library) {
        if (library.length === 0) {
            libraryList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; opacity: 0.5;">저장된 영상이 없습니다.</p>';
            return;
        }
        libraryList.innerHTML = library.map(video => `
            <div class="video-card" onclick="playVideo('${video.id}', '${video.title.replace(/'/g, "\\'")}', '${video.fileName}')">
                <div class="thumbnail-container">
                    <img src="/thumbnails/${video.thumbnailName}" alt="${video.title}" onerror="this.src='https://via.placeholder.com/320x180?text=Thumbnail'">
                    <button class="delete-btn" onclick="event.stopPropagation(); deleteVideo('${video.id}')">삭제</button>
                </div>
                <div class="video-info">
                    <h3>${video.title}</h3>
                    <p>${video.uploader} • ${formatDuration(video.duration)}</p>
                </div>
            </div>
        `).join('');
    }

    window.playVideo = (id, title, fileName) => {
        videoPlayer.src = `/videos/${fileName}`;
        modalTitle.textContent = title;
        videoModal.classList.remove('hidden');
        videoPlayer.play();
    };

    window.deleteVideo = async (id) => {
        if (!confirm('정말로 삭제하시겠습니까?')) return;
        try {
            const res = await fetch(`/api/video/${id}`, { method: 'DELETE' });
            if (res.ok) loadLibrary();
        } catch (e) { alert('삭제 실패'); }
    };

    closeBtn.onclick = () => {
        videoModal.classList.add('hidden');
        videoPlayer.pause();
        videoPlayer.src = "";
    };

    function showStatus(msg, type) {
        statusMessage.textContent = msg;
        statusMessage.style.color = type === 'error' ? '#ff4444' : (type === 'success' ? '#44ff44' : '#ffffff');
    }

    function formatDuration(sec) {
        if (!sec) return "00:00";
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m}:${s.toString().padStart(2, '0')}`;
    }
});
