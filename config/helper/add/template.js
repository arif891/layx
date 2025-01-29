import { argsObj } from './handle_add.js';
import { downloadFile } from '../download/download.js';
import { readFile, writeFile, extractImportUrls } from '../../util/functions.js';
import { layx } from '../../core/vars.js';

export { templateAdd };

const templateUrl = 'https://raw.githubusercontent.com/arif891/layx_templates/main/';

async function templateAdd(scriptDir) {
    try {
        const info = await fetch(templateUrl + 'info.json').catch(() => {
            throw new Error('Failed to fetch template information');
        });
        const infoObj = await info.json();

        const templateNames = argsObj.values.template.map(t => t.toLowerCase());
        console.log(`\nProcessing ${templateNames.length} templates...\n`);

        for (const templateName of templateNames) {
            try {
                const templateInfo = infoObj[templateName];

                if (!templateInfo?.path) {
                    console.error(`Skipping invalid template: '${templateName}'`);
                    continue;
                }

                console.log(`\nAdding template '${templateName}'...\n`);

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

                console.log(`Template '${templateName}' added successfully!\n`);
            } catch (error) {
                console.error(`Error processing template '${templateName}': ${error.message}`);
            }
        }

        console.log('Template processing completed.');
    } catch (error) {
        console.error(`Error fetching template information: ${error.message}`);
    }
}

async function processDependencies(templateInfo, type, filePath) {
    const deps = templateInfo.dependencies?.[type];
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