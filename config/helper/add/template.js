import { argsObj } from './handle_add.js';
import { downloadFile } from '../download/download.js';
import { readFile, writeFile, extractImportUrls } from '../../util/functions.js';
import { layx } from '../../core/vars.js';

export { templateAdd };

const templateUrl = 'https://raw.githubusercontent.com/arif891/layx_templates/main/';

async function templateAdd(scriptDir) {
    try {
        const info = await fetch(templateUrl + 'info.json');
        const infoObj = await info.json();

        const templateName = argsObj.values.template[0].toLowerCase();
        const templateInfo = infoObj[templateName];
        const templatePath = templateInfo?.path;

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

        if (templateInfo.dependencies.css) {
            let content = await readFile(layx.files.layxCss);
            const importUrls = extractImportUrls(content, 'css');

            templateInfo.dependencies.css.map(async css => {
                if (!importUrls.includes(css)) {
                    console.log('Adding template dependencies CSS:', css);
                    content += `\n@import url(${css});`;
                    writeFile(layx.files.layxCss, content);
                    console.log(`${css} added at ${layx.files.layxCss}.`);
                } 
            });
        }

        if (templateInfo.dependencies.js) {
            let content = await readFile(layx.files.layxJs);
            const importUrls = extractImportUrls(content, 'js');

            templateInfo.dependencies.js.map(async js => {
                if (!importUrls.includes(js.path)) {
                    console.log('Adding template dependencies JS:',js.path);
                    content += `\nimport ${js.name} from '${js}';`;
                    writeFile(layx.files.layxJs, content);
                    console.log(`${js} added at ${layx.files.layxJs}.`);
                } 
            });
        }

        console.log(`\nTemplate '${templateName}' added successfully!\n`);
    } catch (error) {
        console.error(`Error processing templates: ${error}`);
        throw error;
    }
}