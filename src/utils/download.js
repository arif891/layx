import fs from 'node:fs/promises';
import path from 'node:path';

export { downloadFile };

async function downloadFile(url, outputPath, options = {}) {
    const {
        onProgress,
        retries = 3,
        retryDelay = 1000,
        signal,
    } = options;

    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Download speed calculation helpers
    let startTime = Date.now();
    let lastUpdate = startTime;
    let lastBytes = 0;
    let lastProgressUpdate = 0; // Throttle progress updates

    const calculateSpeed = (downloadedSize) => {
        const now = Date.now();
        const timeDiff = (now - lastUpdate) / 1000;
        const bytesDiff = downloadedSize - lastBytes;
        const speedBps = bytesDiff / timeDiff;

        lastUpdate = now;
        lastBytes = downloadedSize;

        return speedBps;
    };

    const formatSpeed = (bps) => {
        if (bps >= 1024 * 1024) return `${(bps / (1024 * 1024)).toFixed(2)} MB/s`;
        if (bps >= 1024) return `${(bps / 1024).toFixed(2)} KB/s`;
        return `${bps.toFixed(2)} B/s`;
    };

    const formatBytes = (bytes) => {
        if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
        if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
        return `${bytes} B`;
    };

    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const dir = path.dirname(outputPath);
            try {
                await fs.access(dir);
            } catch {
                await fs.mkdir(dir, { recursive: true });
            }

            const response = await fetch(url, { signal });

            if (!response.ok) {
                throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
            }

            const totalSize = parseInt(response.headers.get('content-length') || '0');
            let downloadedSize = 0;

            const fileHandle = await fs.open(outputPath, 'w');
            const writer = fileHandle.createWriteStream();

            try {
                const reader = response.body.getReader();

                while (true) {
                    if (signal?.aborted) {
                        throw new Error('Download aborted');
                    }

                    const { done, value } = await reader.read();

                    if (done) {
                        break;
                    }

                    writer.write(Buffer.from(value));
                    downloadedSize += value.length;

                    // Throttle progress updates to every 100ms
                    const now = Date.now();
                    if (now - lastProgressUpdate >= 100) {
                        const speed = calculateSpeed(downloadedSize);
                        const progress = {
                            totalSize,
                            downloadedSize,
                            percent: totalSize ? (downloadedSize / totalSize) * 100 : 0,
                            speed,
                            formattedSpeed: formatSpeed(speed),
                            formattedDownloaded: formatBytes(downloadedSize),
                            formattedTotal: totalSize ? formatBytes(totalSize) : 'Unknown'
                        };

                        if (onProgress) {
                            onProgress(progress);
                        } else {
                            // Clear the line before writing new progress
                            process.stdout.write('\r\x1b[K');
                            process.stdout.write(
                                `Downloading... ${progress.percent.toFixed(2)}% | ` +
                                `${progress.formattedDownloaded}/${progress.formattedTotal} | ` +
                                `${progress.formattedSpeed}`
                            );
                        }
                        lastProgressUpdate = now;
                    }
                }

                writer.end();
                await new Promise((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });

                await fileHandle.close();
                // Clear the line and show completion message
                if (!onProgress) {
                    process.stdout.write('\r\x1b[K');
                    console.log('Download completed!');
                }

                return true;

            } catch (error) {
                writer.end();
                await fileHandle.close();
                await fs.unlink(outputPath);
                throw error;
            }

        } catch (error) {
            try {
                await fs.access(outputPath);
                await fs.unlink(outputPath);
            } catch { }

            if (error.name === 'AbortError' || signal?.aborted) {
                throw new Error('Download aborted');
            }

            if (attempt === retries - 1) {
                throw error;
            }

            const delayTime = retryDelay * Math.pow(2, attempt);
            console.log(`\nAttempt ${attempt + 1} failed, retrying in ${delayTime / 1000}s...`);
            await wait(delayTime);
        }
    }
}
