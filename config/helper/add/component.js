import { argsObj } from './handle_add.js';
import { downloadFile } from '../download/download.js';
import { readFile, writeFile, extractImportUrls } from '../../util/functions.js';

export {componentAdd}

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
                                await downloadFile(componentUrl + componentInfo.path + '/' + file.name, componentInfo.localpath + '/layx/' + file.path);
                                console.log(`File added: ${file.path}`);
                            } catch (err) {
                                console.error(`Failed to process file ${file.name}:`, err.message);
                            }
                        })
                    );
                }

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