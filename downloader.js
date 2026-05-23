const { create } = require('youtube-dl-exec');
const path = require('path');
const fs = require('fs-extra');
const { spawn } = require('child_process');

// 시스템 환경에 따른 바이너리 경로 설정
const YT_DLP_PATH = process.platform === 'android' 
    ? '/data/data/com.termux/files/usr/bin/yt-dlp' 
    : 'yt-dlp';
const FFMPEG_PATH = process.platform === 'android'
    ? '/data/data/com.termux/files/usr/bin/ffmpeg'
    : 'ffmpeg';

const ytdlp = create(YT_DLP_PATH);

class Downloader {
    constructor(baseDir) {
        this.baseDir = baseDir;
        this.videosDir = path.join(baseDir, 'data', 'videos');
        this.thumbnailsDir = path.join(baseDir, 'data', 'thumbnails');
        this.libraryPath = path.join(baseDir, 'data', 'library.json');
        
        fs.ensureDirSync(this.videosDir);
        fs.ensureDirSync(this.thumbnailsDir);
    }

    async getVideoInfo(url) {
        console.log(`[DOWNLOADER] Fetching info for: ${url}`);
        return new Promise((resolve, reject) => {
            const args = [
                url,
                '--dump-single-json',
                '--no-check-certificates',
                '--no-warnings',
                '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                '--add-header', 'referer:https://www.youtube.com/'
            ];
            
            const child = spawn(YT_DLP_PATH, args);
            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => stdout += data.toString());
            child.stderr.on('data', (data) => stderr += data.toString());

            child.on('close', (code) => {
                if (code === 0) {
                    try {
                        resolve(JSON.parse(stdout));
                    } catch (e) {
                        reject(new Error('Failed to parse video info'));
                    }
                } else {
                    console.error('[DOWNLOADER] Info fetch failed:', stderr);
                    reject(new Error(`yt-dlp info fetch exited with code ${code}`));
                }
            });
        });
    }

    async downloadVideo(url, onProgress = () => {}) {
        console.log(`[DOWNLOADER] Starting download process for: ${url}`);
        
        try {
            const info = await this.getVideoInfo(url);
            const videoId = info.id;
            const title = info.title;
            const fileName = `${videoId}.mp4`;
            const filePath = path.join(this.videosDir, fileName);
            const thumbnailName = `${videoId}.jpg`;

            // 기존 임시 파일 정리
            const files = await fs.readdir(this.videosDir);
            for (const file of files) {
                if (file.includes(videoId) && file.endsWith('.part')) {
                    await fs.remove(path.join(this.videosDir, file));
                }
            }

            // 고화질 (1080p 60fps MP4) 설정
            const args = [
                url,
                '-o', filePath,
                '-f', 'bestvideo[height<=1080][fps>=60][ext=mp4][vcodec^=avc1]+bestaudio[ext=m4a]/bestvideo[height<=1080][ext=mp4][vcodec^=avc1]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best[ext=mp4]/best',
                '--no-check-certificates',
                '--ffmpeg-location', FFMPEG_PATH,
                '--newline',
                '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                '--add-header', 'referer:https://www.youtube.com/'
            ];

            return new Promise((resolve, reject) => {
                const child = spawn(YT_DLP_PATH, args);

                child.stdout.on('data', (data) => {
                    const line = data.toString();
                    const progressMatch = line.match(/\[download\]\s+([\d.]+)%\s+of\s+.*\s+at\s+.*\s+ETA\s+([\d:]+)/);
                    if (progressMatch) {
                        onProgress({ percent: progressMatch[1], eta: progressMatch[2] });
                    }
                });

                child.on('close', async (code) => {
                    if (code === 0) {
                        // 썸네일 다운로드
                        if (info.thumbnail) {
                            const { exec } = require('child_process');
                            const thumbnailPath = path.join(this.thumbnailsDir, thumbnailName);
                            await new Promise(r => exec(`curl -L "${info.thumbnail}" -o "${thumbnailPath}"`, r));
                        }

                        const videoData = {
                            id: videoId,
                            title: title,
                            fileName: fileName,
                            thumbnailName: thumbnailName,
                            duration: info.duration,
                            uploader: info.uploader,
                            downloadedAt: new Date().toISOString()
                        };

                        await this.updateLibrary(videoData);
                        resolve(videoData);
                    } else {
                        reject(new Error(`yt-dlp exited with code ${code}`));
                    }
                });
            });

        } catch (error) {
            console.error('[DOWNLOADER] Download failed:', error.message);
            throw error;
        }
    }

    async updateLibrary(videoData) {
        let library = [];
        if (fs.existsSync(this.libraryPath)) {
            library = await fs.readJson(this.libraryPath);
        }
        const index = library.findIndex(v => v.id === videoData.id);
        if (index > -1) library[index] = videoData;
        else library.push(videoData);
        await fs.writeJson(this.libraryPath, library, { spaces: 2 });
    }

    async getLibrary() {
        if (fs.existsSync(this.libraryPath)) return await fs.readJson(this.libraryPath);
        return [];
    }

    async deleteVideo(videoId) {
        const library = await this.getLibrary();
        const video = library.find(v => v.id === videoId);
        if (video) {
            await fs.remove(path.join(this.videosDir, video.fileName)).catch(() => {});
            await fs.remove(path.join(this.thumbnailsDir, video.thumbnailName)).catch(() => {});
            const updatedLibrary = library.filter(v => v.id !== videoId);
            await fs.writeJson(this.libraryPath, updatedLibrary, { spaces: 2 });
            return true;
        }
        return false;
    }
}

module.exports = Downloader;
