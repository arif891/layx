import { readFile, writeFile } from '../../utils/fs.js';
import { extractImportUrls } from '../../utils/helpers.js';

export { processDependencies };

async function processDependencies(info, type, filePath) {
    const deps = info.dependencies?.[type];
    if (!deps?.length) return;

    try {
        let content = await readFile(filePath);
        const importUrls = extractImportUrls(content, type);

        content += '\n\n/* ' + info.name + ' dependencies */';

        for (const dep of deps) {
            const path = type === 'js' ? dep.path : dep;
            if (importUrls.includes(path)) continue;

            console.log(`Adding ${type.toUpperCase()} dependency:`, path);
            content += type === 'js'
                ? `\nimport ${dep.name} from '${path}';`
                : `\n@import url(${path});`;

            await writeFile(filePath, content);
            console.log(`Added ${type.toUpperCase()} dependency to ${filePath}`);
        }
    } catch (err) {
        console.error(`Failed to process ${type} dependencies:`, err.message);
    }
}
