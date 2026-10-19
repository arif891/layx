import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { packagePaths } from '../core/paths.js';

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

        // 1. Copy starter template files (assets, pages, index.html, config.mjs, .htaccess, .vscode)
        if (existsSync(templateDir)) {
            await fs.cp(templateDir, targetDir, {
                recursive: true,
                filter: (src) => {
                    const base = path.basename(src);
                    return base !== 'node_modules' && base !== '.git' && base !== '_package.json';
                }
            });
        }

        // 2. Copy core framework directory (layx/)
        if (existsSync(frameworkDir)) {
            await fs.cp(frameworkDir, path.join(targetDir, 'layx'), {
                recursive: true,
                filter: (src) => {
                    const base = path.basename(src);
                    return base !== 'node_modules' && base !== '.git';
                }
            });
        }

        // 3. Ensure .vscode snippets exist in project
        const vscodeDir = path.join(targetDir, '.vscode');
        await fs.mkdir(vscodeDir, { recursive: true });
        if (existsSync(packagePaths.snippets)) {
            await fs.copyFile(packagePaths.snippets, path.join(vscodeDir, 'layx.code-snippets'));
        }

        // 4. Generate customized package.json
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
            `npm run unbuild   ${pc.dim('# restore development files')}`
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
