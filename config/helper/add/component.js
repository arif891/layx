import { argsObj } from './handle_add.js';
import { downloadFile } from '../download/download.js';
import { readFile, writeFile, extractImportUrls } from '../../util/functions.js';
import { layx } from '../../core/vars.js';

export { componentAdd }

const componentUrl = 'https://raw.githubusercontent.com/arif891/layx_components/main/';

async function componentAdd(scriptDir) {

    try {
        const info = await fetch(componentUrl + 'info.json').catch(() => {
            throw new Error('Failed to fetch component information');
        });
        const infoObj = await info.json();

        const componentNames = argsObj.values.component.map(t => t.toLowerCase());

        for (const componentName of componentNames) {
            try {
                const componentInfo = infoObj[componentName];

                if (!componentInfo?.path) {
                    console.error(`Skipping invalid component: '${componentName}'`);
                    continue;
                }

                // Process component files
                if (componentInfo.files?.length) {
                    await Promise.all(
                        componentInfo.files.map(async file => {
                            if (!file.name || !file.path) {
                                console.warn(`Skipping invalid file entry in component ${componentName}`);
                                return;
                            }

                            try {
                                console.log(`Downloading: ${file.name}`);
                                await downloadFile(componentUrl + componentInfo.path + '/' + file.name, 'layx/' + componentInfo.localpath + '/' + file.path);
                                console.log(`File added: ${file.path}`);
                            } catch (err) {
                                console.error(`Failed to process file ${file.name}:`, err.message);
                            }
                        })
                    );
                }

                // Process dependencies
                await processDependencies(componentInfo, 'css', layx.files.layxCss);
                await processDependencies(componentInfo, 'js', layx.files.layxJs);

                console.log(`Component '${componentName}' added successfully!\n`);
            } catch (error) {
                console.error(`Error processing component '${componentName}': ${error.message}`);
            }
        }

        console.log('Component processing completed.');
    } catch (error) {
        console.error(`Error processing component: ${error.message}`);
    }
}

async function processDependencies(componentInfo, type, filePath) {
    const deps = componentInfo.dependencies?.[type];
    if (!deps?.length) return;

    try {
        let content = await readFile(filePath);
        const importUrls = extractImportUrls(content, type);

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