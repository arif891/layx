import { readFile, writeFile } from '../../utils/fs.js';
import { projectPaths } from '../../core/paths.js';

export { registerCssImport, registerJsImport };

async function registerCssImport(cssRelativePath, targetFile = projectPaths.layxCss) {
    try {
        let content = await readFile(targetFile);
        const importStatement = `@import url(${cssRelativePath});`;

        if (content.includes(cssRelativePath)) {
            return false; // Already registered
        }

        const isOther = cssRelativePath.startsWith('others/');
        const sectionHeader = isOther ? '/* Other */' : '/* Components */';

        if (content.includes(sectionHeader)) {
            content = content.replace(
                sectionHeader,
                `${sectionHeader}\n${importStatement}`
            );
        } else if (content.includes('/* Components */')) {
            content = content.replace(
                '/* Components */',
                `/* Components */\n${importStatement}`
            );
        } else {
            content += `\n${importStatement}`;
        }

        await writeFile(targetFile, content);
        return true;
    } catch (error) {
        console.error(`Failed to register CSS import for ${cssRelativePath}:`, error.message);
        return false;
    }
}

async function registerJsImport(jsRelativePath, targetFile = projectPaths.layxJs) {
    try {
        let content = await readFile(targetFile);
        const normalized = jsRelativePath.startsWith('./') ? jsRelativePath : `./${jsRelativePath}`;
        const importStatement = `import '${normalized}';`;

        if (content.includes(normalized) || content.includes(jsRelativePath)) {
            return false; // Already registered
        }

        const isOther = jsRelativePath.includes('others/');
        const sectionHeader = isOther ? '/* Other */' : '/* Components */';

        if (content.includes(sectionHeader)) {
            content = content.replace(
                sectionHeader,
                `${sectionHeader}\n${importStatement}`
            );
        } else if (content.includes('/* Components */')) {
            content = content.replace(
                '/* Components */',
                `/* Components */\n${importStatement}`
            );
        } else {
            content += `\n${importStatement}`;
        }

        await writeFile(targetFile, content);
        return true;
    } catch (error) {
        console.error(`Failed to register JS import for ${jsRelativePath}:`, error.message);
        return false;
    }
}
