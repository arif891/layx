import { argsObj } from './handle_add.js';
import { downloadFile } from '../download/download.js';
import { log } from 'console';

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

        if (templateInfo.files) {
            templateInfo.files.map(async file => {
                console.log('Downloading:', file.name);
                await downloadFile(templateUrl + templatePath + '/' + file.name, file.path);
                console.log('File added', file.path);
            })
        }


        console.log(`Template '${templateName}' added successfully!`);
    } catch (error) {
        console.error(`Error processing templates: ${error.message}`);
    }
}