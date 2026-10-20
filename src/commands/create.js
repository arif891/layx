import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { packagePaths } from '../core/paths.js';
import { registryConfig } from '../config/registry.js';
import { registerCssImport, registerJsImport } from './add/wire.js';

export { createProject };

async function createProject(targetName, isInteractive = true) {
    let projectName = targetName;

    if (!projectName) {
        if (!isInteractive || !process.stdin.isTTY) {
            projectName = 'my-layx-site';
        } else {
            const inputName = await p.text({
                message: 'Enter your project name:',
                placeholder: 'my-layx-site',
                initialValue: 'my-layx-site',
                validate(val) {
                    if (!val || !val.trim()) return 'Project name cannot be empty';
                }
            });

            if (p.isCancel(inputName)) {
                p.cancel('Project creation cancelled.');
                return;
            }
            projectName = inputName;
        }
    }

    projectName = projectName.trim();
    const targetDir = path.resolve(process.cwd(), projectName);
    const sanitizedName = projectName.toLowerCase().replace(/[^a-z0-9-_]/g, '-');

    // Handle existing non-empty directory
    if (existsSync(targetDir)) {
        const files = await fs.readdir(targetDir);
        if (files.length > 0) {
            if (isInteractive && process.stdin.isTTY) {
                const overwrite = await p.confirm({
                    message: `Target directory "${projectName}" is not empty. Continue and overwrite?`,
                    initialValue: false
                });

                if (p.isCancel(overwrite) || !overwrite) {
                    p.cancel('Project creation cancelled.');
                    return;
                }
            }
        }
    } else {
        await fs.mkdir(targetDir, { recursive: true });
    }

    const s = (isInteractive && process.stdin.isTTY) ? p.spinner() : null;
    if (s) {
        s.start(`Scaffolding LayX landing page in ${pc.cyan(projectName)}...`);
    } else {
        console.log(`Scaffolding LayX landing page in ${projectName}...`);
    }

    try {
        const templateDir = packagePaths.template;
        const frameworkDir = packagePaths.framework;
        const componentsBase = path.join(frameworkDir, 'components');
        const othersBase = path.join(frameworkDir, 'others');

        // 1. Copy starter template files (assets, pages, index.html, .htaccess, .vscode)
        if (existsSync(templateDir)) {
            await fs.cp(templateDir, targetDir, {
                recursive: true,
                filter: (src) => {
                    const base = path.basename(src);
                    return base !== 'node_modules' && base !== '.git' && base !== '_package.json';
                }
            });
        }

        // 2. Copy framework directory (layx/) with selective default components and others
        if (existsSync(frameworkDir)) {
            await fs.cp(frameworkDir, path.join(targetDir, 'layx'), {
                recursive: true,
                filter: (src) => {
                    const base = path.basename(src);
                    if (base === 'node_modules' || base === '.git') return false;

                    // Filter components so only defaultComponents are initially copied
                    const relComp = path.relative(componentsBase, src);
                    if (!relComp.startsWith('..') && relComp !== '') {
                        const compName = relComp.split(/[/\\]/)[0];
                        if (compName && !registryConfig.defaultComponents.includes(compName)) {
                            return false;
                        }
                    }

                    // Filter others so only defaultOthers are initially copied
                    const relOther = path.relative(othersBase, src);
                    if (!relOther.startsWith('..') && relOther !== '') {
                        const otherName = relOther.split(/[/\\]/)[0];
                        if (otherName && !registryConfig.defaultOthers.includes(otherName)) {
                            return false;
                        }
                    }

                    return true;
                }
            });
        }

        // 3. Auto-wire default components and others in the project's layx.css and layx.js
        const projectLayxCss = path.join(targetDir, 'layx/layx.css');
        const projectLayxJs = path.join(targetDir, 'layx/layx.js');
        for (const comp of registryConfig.defaultComponents) {
            const mapping = registryConfig.components[comp];
            if (mapping?.css) {
                await registerCssImport(mapping.css, projectLayxCss);
            }
            if (mapping?.js) {
                await registerJsImport(mapping.js, projectLayxJs);
            }
        }

        for (const other of registryConfig.defaultOthers) {
            const mapping = registryConfig.others?.[other];
            if (mapping?.css) {
                await registerCssImport(mapping.css, projectLayxCss);
            }
            if (mapping?.js) {
                await registerJsImport(mapping.js, projectLayxJs);
            }
        }

        // 4. Ensure .vscode snippets exist in project
        const vscodeDir = path.join(targetDir, '.vscode');
        await fs.mkdir(vscodeDir, { recursive: true });
        if (existsSync(packagePaths.snippets)) {
            await fs.copyFile(packagePaths.snippets, path.join(vscodeDir, 'layx.code-snippets'));
        }

        // 5. Generate customized package.json
        const templatePkgPath = path.join(templateDir, '_package.json');
        let pkgContent;
        if (existsSync(templatePkgPath)) {
            const rawTemplate = await fs.readFile(templatePkgPath, 'utf8');
            pkgContent = rawTemplate.replace('{{PROJECT_NAME}}', sanitizedName);
        } else {
            pkgContent = JSON.stringify({
                name: sanitizedName,
                version: '1.0.0',
                private: true,
                type: 'module',
                scripts: {
                    build: 'layx build',
                    unbuild: 'layx unbuild',
                    optimize: 'layx optimize'
                },
                devDependencies: {
                    'layx-css': '^0.1.0'
                }
            }, null, 2);
        }

        await fs.writeFile(path.join(targetDir, 'package.json'), pkgContent, 'utf8');

        if (s) {
            s.stop(pc.green('Project scaffolded successfully!'));
        } else {
            console.log('Project created successfully!');
        }

        const nextSteps = [
            `cd ${pc.cyan(projectName)}`,
            `npm install`,
            `npm run build     ${pc.dim('# build and bundle for production')}`,
            `npm run unbuild   ${pc.dim('# restore development files')}`,
            `npx layx add -c accordion ${pc.dim('# add additional components anytime')}`
        ].join('\n');

        if (isInteractive && process.stdin.isTTY) {
            p.note(nextSteps, 'Next steps:');
            p.outro(pc.green('Happy coding with LayX! 🚀'));
        } else {
            console.log('\nNext steps:');
            console.log(`  cd ${projectName}`);
            console.log('  npm install');
            console.log('  npm run build');
            console.log('\nHappy coding with LayX!\n');
        }

    } catch (error) {
        if (s) s.stop(pc.red('Failed to scaffold project'));
        console.error(pc.red(`Error: ${error.message}`));
        throw error;
    }
}
