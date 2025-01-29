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
            await Promise.all(
                templateInfo.files.map(file => {
                    downloadFile(templateUrl + templatePath + '/' + file.name, file.path)
                })
            );
            console.log('Template files downloaded successfully!');
        }


        console.log('Template Info:', templateInfo);
    } catch (error) {
        console.error(`Error processing templates: ${error.message}`);
    }
}