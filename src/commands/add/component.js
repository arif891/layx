import path from 'node:path';
import pc from 'picocolors';
import { downloadFile } from '../../utils/download.js';
import { projectPaths } from '../../core/paths.js';
import { processDependencies } from './utils.js';

export { componentAdd };

const componentUrl = 'https://raw.githubusercontent.com/arif891/layx_components/main/';

async function componentAdd(components) {
    try {
        const info = await fetch(componentUrl + 'info.json').catch(() => {
            throw new Error('Failed to fetch component information');
        });
        const infoObj = await info.json();

        const componentNames = components.map(t => t.toLowerCase());

        console.log(pc.cyan('\nAdding components...\n'));

        for (const componentName of componentNames) {
            try {
                const componentInfo = infoObj[componentName];

                if (!componentInfo?.path) {
                    console.error(pc.yellow(`Skipping invalid component: '${componentName}'`));
                    continue;
                }

                console.log(`Adding component '${componentInfo.name}'...\n`);

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
                                const destPath = path.join(projectPaths.layx, componentInfo.localpath || '', file.path);
                                await downloadFile(componentUrl + componentInfo.path + '/' + file.name, destPath);
                                console.log(`File added: ${file.path}`);
                            } catch (err) {
                                console.error(`Failed to process file ${file.name}:`, err.message);
                            }
                        })
                    );
                }

                // Process dependencies
                await processDependencies(componentInfo, 'css', projectPaths.layxCss);
                await processDependencies(componentInfo, 'js', projectPaths.layxJs);

                console.log(pc.green(`\nComponent '${componentInfo.name}' v${componentInfo.version} added successfully!`));
            } catch (error) {
                console.error(pc.red(`Error processing component '${componentName}': ${error.message}`));
            }
        }

        console.log('\nComponent processing completed.\n');
    } catch (error) {
        console.error(pc.red(`Error processing component: ${error.message}`));
    }
}
