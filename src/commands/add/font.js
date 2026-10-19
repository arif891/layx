import path from 'node:path';
import pc from 'picocolors';
import { ensureDirectoryExists, readFile, writeFile } from '../../utils/fs.js';
import { downloadFile } from '../../utils/download.js';
import { projectPaths, packagePaths } from '../../core/paths.js';

export { fontAdd };

async function fontAdd(fonts) {
    try {
        const fontInfoGF = await readFile(packagePaths.fontInfo);
        const fontInfoObj = JSON.parse(fontInfoGF);

        console.log(pc.yellow(`Last font info update: ${fontInfoObj.lastUpdate}`));

        await Promise.all(
            fonts.map(font => processFontFamily(font, fontInfoObj))
        );
    } catch (error) {
        console.error(pc.red(`Error processing fonts: ${error.message}`));
    }
}

async function processFontFamily(fontName, fontInfoObj) {
    const result = searchFont(fontInfoObj, fontName.toLowerCase());

    if (!result.found) {
        console.warn(result.message);
        return;
    }

    const formattedFamilyName = result.family.replace(/\s+/g, '_');
    const fontDir = path.join(projectPaths.font, formattedFamilyName);
    const isVariable = isVariableFont(result.axes);

    try {
        console.log(pc.cyan(`Adding "${result.family}" ${isVariable ? 'variable' : 'static'} font family...`));

        // Ensure the font directory exists
        await ensureDirectoryExists(fontDir);

        // Generate font-face declarations for all variants
        const fontFaces = Object.keys(result.files).map(variant =>
            createFontFaceDeclaration(result, variant)
        );

        if (isVariable) {
            console.log(pc.yellow(`Variable font available axes: ${result.axes.map(axis =>
                `${axis.tag} (${axis.start}-${axis.end})`
            ).join(', ')}`));
        } else {
            console.log(pc.yellow(`Available variants: ${result.variants.join(', ')}`));
        }

        // Download all font files in parallel
        await Promise.all(
            Object.entries(result.files).map(async ([variant, url]) => {
                const fileName = `${formattedFamilyName}_${variant}_${isVariable ? 'variable_' : ''}${result.version}.woff2`;
                const filePath = path.join(fontDir, fileName);
                console.log(`Downloading ${variant} variant...`);
                await downloadFile(url, filePath);
            })
        );

        // Save fontFaces to CSS
        await writeFile(path.join(fontDir, 'font-face.css'), fontFaces.join('\n\n'));
        const typoCssPath = path.join(projectPaths.layx, 'main/typography/typography.css');
        await writeFile(typoCssPath, `\n\n/*<${result.family}>*/\n${fontFaces.join('\n')}\n/*</${result.family}>*/`, 'a');

        console.log(pc.green(`Added "${result.family}" font family successfully.`));
    } catch (error) {
        console.error(pc.red(`Failed to add "${result.family}": ${error.message}`));
    }
}

function findFontByFamily(fontsData, familyName) {
    const searchName = familyName.toLowerCase();
    return fontsData.items?.find(font => font.family.toLowerCase() === searchName);
}

function searchFont(fontsData, familyName) {
    const font = findFontByFamily(fontsData, familyName);

    if (!font) {
        return {
            found: false,
            message: `Font family "${familyName}" not found`
        };
    }

    return {
        found: true,
        family: font.family,
        variants: font.variants,
        files: font.files,
        axes: font.axes,
        version: font.version,
    };
}

function isVariableFont(axes) {
    return Array.isArray(axes) && axes.length > 0;
}

function createFontFaceDeclaration(fontInfo, variant) {
    const family = fontInfo.family;
    const formattedFamily = family.replace(/\s+/g, '_');
    const isVariable = isVariableFont(fontInfo.axes);
    const fileName = `${formattedFamily}_${variant}_${isVariable ? 'variable_' : ''}${fontInfo.version}.woff2`;
    const fontPath = `/assets/font/${formattedFamily}/${fileName}`;

    let weight = 'normal';
    let style = 'normal';

    if (variant === 'regular') {
        weight = '400';
    } else if (variant === 'italic') {
        style = 'italic';
        weight = '400';
    } else if (variant.endsWith('italic')) {
        style = 'italic';
        weight = variant.replace('italic', '');
    } else {
        weight = variant;
    }

    if (isVariable) {
        const wghtAxis = fontInfo.axes?.find(axis => axis.tag === 'wght');
        if (wghtAxis) {
            weight = `${wghtAxis.start} ${wghtAxis.end}`;
        }
    }

    return `@font-face {
  font-family: '${family}';
  font-style: ${style};
  font-weight: ${weight};
  font-display: swap;
  src: url('${fontPath}') format('woff2');
}`;
}
