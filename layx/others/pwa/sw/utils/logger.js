export class Logger {
    constructor(isDebug = false) {
        this.isDebug = isDebug;
        this.logQueue = [];
        this.maxQueueSize = 100;
    }

    log(...args) {
        this._addToQueue('log', ...args);
        console.log('[SW]', ...args);
    }

    error(...args) {
        this._addToQueue('error', ...args);
        console.error('[SW][ERROR]', ...args);
    }

    warn(...args) {
        this._addToQueue('warn', ...args);
        console.warn('[SW][WARN]', ...args);
    }

    debug(...args) {
        if (!this.isDebug) return;
        this._addToQueue('debug', ...args);
        console.debug('[SW][DEBUG]', ...args);
    }

    _addToQueue(level, ...args) {
        this.logQueue.push({
            timestamp: new Date().toISOString(),
            level,
            message: args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ')
        });

        if (this.logQueue.length > this.maxQueueSize) {
            this.logQueue.shift();
        }
    }

    getRecentLogs(count = 50) {
        return this.logQueue.slice(-count);
    }

    clearLogs() {
        this.logQueue = [];
    }
}
