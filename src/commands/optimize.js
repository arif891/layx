import { optimizeImages as runOptimization } from '../engine/image-optimizer.js';

export { optimizeImages };

async function optimizeImages(options = {}) {
    const format = typeof options === 'string' ? options : (options.format || 'avif');
    await runOptimization(format);
}
