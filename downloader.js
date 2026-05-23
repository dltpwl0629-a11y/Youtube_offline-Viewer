const { create } = require('youtube-dl-exec');
const path = require('path');
const fs = require('fs-extra');
const { spawn } = require('child_process');

const PYTHON_PATH = '/data/data/com.termux/files/usr/bin/python3';
const YTDLP_PATH = '/data/data/com.termux/files/usr/bin/yt-dlp';
const FFMPEG_PATH = 'ffmpeg';

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
                YTDLP_PATH,
                url,
                '--dump-single-json',
                '--no-check-certificates',
                '--no-warnings',
                '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                '--add-header', 'referer:https://www.youtube.com/'
            ];
            
            const child = spawn(PYTHON_PATH, args);
            let stdoutChunks = [];
            let stderr = '';

            child.stdout.on('data', (data) => stdoutChunks.push(data));
            child.stderr.on('data', (data) => stderr += data.toString());

            child.on('close', (code) => {
                if (code === 0) {
                    try {
                        const stdout = Buffer.concat(stdoutChunks).toString();
                        resolve(JSON.parse(stdout));
                    } catch (e) {
                        console.error('[DOWNLOADER] JSON Parse Error:', e.message);
                        reject(new Error('Failed to parse video info'));
                    }
                } else {
                    console.error('[DOWNLOADER] Info fetch failed (code ' + code + '):', stderr);
                    reject(new Error(`yt-dlp info fetch failed`));
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

            // 폰 환경에서 가장 안정적인 H.264/MP4 고화질 설정
            const args = [
                YTDLP_PATH,
                url,
                '-o', filePath,
                '-f', 'bestvideo[vcodec^=avc1][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4][height<=1080]',
                '--no-check-certificates',
                '--no-warnings',
                '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                '--add-header', 'referer:https://www.youtube.com/'
            ];

            return new Promise((resolve, reject) => {
                const child = spawn(PYTHON_PATH, args);

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
