import { argsObj } from './handle_add.js';
import { downloadFile } from '../download/download.js';
import { extractImportUrls } from '../../util/functions.js';

export { templateAdd };

const templateUrl = 'https://raw.githubusercontent.com/arif891/layx_templates/main/';

async function templateAdd(scriptDir) {
    try {
        const info = await fetch(templateUrl + 'info.json');
        const infoObj = await info.json();

        const templateName = argsObj.values.template[0].toLowerCase();
        const templateInfo = infoObj[templateName];
        const templatePath = templateInfo.path;

        if (!templateInfo) {
            console.error(`Template '${templateName}' not found!`);
            return;
        }

        console.log(`\nAdding template '${templateName}'...\n`);

        if (templateInfo.files) {
            await Promise.all(
                templateInfo.files.map(async file => {
                    console.log('Downloading:', file.name);
                    await downloadFile(templateUrl + templatePath + '/' + file.name, file.path);
                    console.log('File added', file.path);
                })
            );
        }


        console.log(`\nTemplate '${templateName}' added successfully!\n`);
    } catch (error) {
        console.error(`Error processing templates: ${error.message}`);
    }
}