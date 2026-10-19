import { readFile, writeFile } from '../../utils/fs.js';
import { extractImportUrls } from '../../utils/helpers.js';

export { processDependencies };

async function processDependencies(info, type, filePath) {
    const deps = info.dependencies?.[type];
    if (!deps?.length) return;

    try {
        let content = await readFile(filePath);
        const importUrls = extractImportUrls(content, type);
        let additions = '';

        for (const dep of deps) {
            const depPath = type === 'js' ? dep.path : dep;
            if (importUrls.includes(depPath)) continue;

            console.log(`Adding ${type.toUpperCase()} dependency:`, depPath);
            additions += type === 'js'
                ? `\nimport ${dep.name} from '${depPath}';`
                : `\n@import url(${depPath});`;
        }

        if (additions) {
            content += `\n\n/* ${info.name} dependencies */` + additions;
            await writeFile(filePath, content);
            console.log(`Added ${type.toUpperCase()} dependencies to ${filePath}`);
        }
    } catch (err) {
        console.error(`Failed to process ${type} dependencies:`, err.message);
    }
}
