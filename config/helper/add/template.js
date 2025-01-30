import { argsObj } from './handle_add.js';
import { downloadFile } from '../download/download.js';
import { layx } from '../../core/vars.js';

import { processDependencies } from './function.js';

export { templateAdd };

const templateUrl = 'https://raw.githubusercontent.com/arif891/layx_templates/main/';

async function templateAdd(scriptDir) {
    try {
        const info = await fetch(templateUrl + 'info.json').catch(() => {
            throw new Error('Failed to fetch template information');
        });
        const infoObj = await info.json();

        const templateNames = argsObj.values.template.map(t => t.toLowerCase());

        console.log('\n\nAdding templates...\n\n');

        for (const templateName of templateNames) {
            try {
                const templateInfo = infoObj[templateName];

                if (!templateInfo?.path) {
                    console.error(`Skipping invalid template: '${templateName}'`);
                    continue;
                }

                console.log(`\nAdding template '${templateInfo.name}'...\n`);

                // Process template files
                if (templateInfo.files?.length) {
                    await Promise.all(
                        templateInfo.files.map(async file => {
                            if (!file.name || !file.path) {
                                console.warn(`Skipping invalid file entry in template ${templateName}`);
                                return;
                            }
                            
                            try {
                                console.log(`Downloading: ${file.name}`);
                                await downloadFile(templateUrl + templateInfo.path + '/' + file.name, file.path);
                                console.log(`File added: ${file.path}`);
                            } catch (err) {
                                console.error(`Failed to process file ${file.name}:`, err.message);
                            }
                        })
                    );
                }

                // Process dependencies
                await processDependencies(templateInfo, 'css', layx.files.layxCss);
                await processDependencies(templateInfo, 'js', layx.files.layxJs);

                console.log(`\nTemplate '${templateInfo.name}' version: ${templateInfo.version} added successfully!\n`);
            } catch (error) {
                console.error(`Error processing template '${templateName}': ${error.message}`);
            }
        }

        console.log('Template processing completed.');
    } catch (error) {
        console.error(`Error fetching template information: ${error.message}`);
    }
}