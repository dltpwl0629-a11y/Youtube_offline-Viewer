const express = require('express');
const cors = require('cors');
const path = require('path');
const Downloader = require('./downloader');

const app = express();
const port = 5000; // 사용자 요청에 따라 5000번 사용
const downloader = new Downloader(__dirname);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/videos', express.static(path.join(__dirname, 'data', 'videos')));
app.use('/thumbnails', express.static(path.join(__dirname, 'data', 'thumbnails')));

// 진행 상태 구독 관리
const activeDownloads = new Map();

// [GET] 다운로드 진행 상황 SSE 연결
app.get('/api/download-progress', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const downloadUrl = req.query.url;
    activeDownloads.set(downloadUrl, (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    });

    req.on('close', () => {
        activeDownloads.delete(downloadUrl);
    });
});

// [POST] 다운로드 시작 요청
app.post('/api/download', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL이 필요합니다.' });

    try {
        console.log(`[SERVER] Download request: ${url}`);
        
        // 다운로드 프로세스 시작 (비동기)
        downloader.downloadVideo(url, (progress) => {
            const updateFunc = activeDownloads.get(url);
            if (updateFunc) updateFunc({ type: 'progress', ...progress });
        }).then(videoData => {
            const updateFunc = activeDownloads.get(url);
            if (updateFunc) updateFunc({ type: 'complete', data: videoData });
        }).catch(error => {
            const updateFunc = activeDownloads.get(url);
            if (updateFunc) updateFunc({ type: 'error', error: error.message });
        });

        res.json({ success: true, message: '다운로드 시작됨' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// [GET] 라이브러리 목록 조회
app.get('/api/library', async (req, res) => {
    try {
        const library = await downloader.getLibrary();
        res.json(library);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// [DELETE] 영상 삭제
app.delete('/api/video/:id', async (req, res) => {
    try {
        const success = await downloader.deleteVideo(req.params.id);
        res.json({ success });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`YouTube Viewer V2 running at http://localhost:${port}`);
});

// 서버 다운 방지 전역 핸들러
process.on('uncaughtException', (err) => console.error('[CRITICAL] Uncaught:', err));
process.on('unhandledRejection', (reason) => console.error('[CRITICAL] Unhandled:', reason));
