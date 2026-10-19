import pc from 'picocolors';
import { downloadFile } from '../../utils/download.js';
import { projectPaths } from '../../core/paths.js';
import { processDependencies } from './utils.js';

export { templateAdd };

const templateUrl = 'https://raw.githubusercontent.com/arif891/layx_templates/main/';

async function templateAdd(templates) {
    try {
        const info = await fetch(templateUrl + 'info.json').catch(() => {
            throw new Error('Failed to fetch template information');
        });
        const infoObj = await info.json();

        const templateNames = templates.map(t => t.toLowerCase());

        console.log(pc.cyan('\nAdding templates...\n'));

        for (const templateName of templateNames) {
            try {
                const templateInfo = infoObj[templateName];

                if (!templateInfo?.path) {
                    console.error(pc.yellow(`Skipping invalid template: '${templateName}'`));
                    continue;
                }

                console.log(`Adding template '${templateInfo.name}'...\n`);

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
                await processDependencies(templateInfo, 'css', projectPaths.layxCss);
                await processDependencies(templateInfo, 'js', projectPaths.layxJs);

                console.log(pc.green(`\nTemplate '${templateInfo.name}' v${templateInfo.version} added successfully!`));
            } catch (error) {
                console.error(pc.red(`Error processing template '${templateName}': ${error.message}`));
            }
        }

        console.log('\nTemplate processing completed.\n');
    } catch (error) {
        console.error(pc.red(`Error fetching template information: ${error.message}`));
    }
}
