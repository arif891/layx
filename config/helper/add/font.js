import path from 'node:path';
import CommandLineInterface from '../../cli/cli.js';
import { ensureDirectoryExists, readFile, writeFile } from '../../util/functions.js';
import { downloadFile } from '../download/download.js';
import { argsObj } from './handle_add.js';
import { layx } from '../../core/vars.js';

export { fontAdd };

const cli = new CommandLineInterface();
const { fg, bg } = cli;

async function fontAdd(scriptDir) {
    try {
        const fontInfoGF = await readFile(path.join(scriptDir, "/info/font_info_GF.json"));
        const fontInfoObj = JSON.parse(fontInfoGF);

        console.log(cli.style(`Last font info update: ${fontInfoObj.lastUpdate}`, fg.yellow));

        await Promise.all(
            argsObj.values.font.map(font => processFontFamily(font, fontInfoObj))
        );
    } catch (error) {
        console.error(cli.style(`Error processing fonts: ${error.message}`, fg.red));
    }
}


async function processFontFamily(fontName, fontInfoObj) {
    const result = searchFont(fontInfoObj, fontName.toLowerCase());

    if (!result.found) {
        console.warn(result.message);
        return;
    }

    const formattedFamilyName = result.family.replace(' ', '_');
    const fontDir = `/assets/font/${formattedFamilyName}`;
    const isVariable = isVariableFont(result.axes);

    try {
        console.log(cli.style(`Adding "${result.family}" ${isVariable ? 'variable' : 'static'} font family...`, fg.cyan));

        // Ensure the font directory exists
        await ensureDirectoryExists(fontDir);

        // Generate font-face declarations for all variants
        const fontFaces = Object.keys(result.files).map(variant =>
            createFontFaceDeclaration(result, variant)
        );

        if (isVariable) {
            console.log(cli.style(`It is a variable font and available axes: ${result.axes.map(axis =>
                `${axis.tag} (${axis.start}-${axis.end}).`
            ).join(', ')}`, fg.yellow));
        } else {
            console.log(cli.style(`Available variants: ${result.variants.join(', ')}.`, fg.yellow));
        }

        // Download all font files in parallel
        await Promise.all(
            Object.entries(result.files).map(async ([variant, url]) => {
                const filePath = `${fontDir}/${formattedFamilyName}_${variant}_${isVariable ? 'variable_' : ''}${result.version}.woff2`;
                console.log(`Downloading ${variant} variant...`);
                await downloadFile(url, filePath);
            })
        );

        // Save the fontFaces to a CSS file

        await writeFile(`${fontDir}/font-face.css`, fontFaces.join('\n\n'));
        await writeFile('/layx/main/typography/typography.css', `\n\n\n/*<${result.family}>*/${fontFaces.join('\n')}\n/*</${result.family}>*/`, 'a');

        console.log(cli.style(`Added "${result.family}" font family successfully.`, fg.green));
    } catch (error) {
        console.error(`Failed to add "${result.family}". Error:`, error.message);
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
        category: font.category,
        subsets: font.subsets,
        axes: font.axes,
        version: font.version,
        files: font.files,
        font
    };
}

function isVariableFont(axes) {
    return Boolean(axes && axes.length > 0);
}

function getWeightRange(axes) {
    if (!axes) return '400';

    const weightAxis = axes.find(axis => axis.tag === 'wght');
    if (weightAxis) {
        return `${weightAxis.start} ${weightAxis.end}`;
    }

    return '400';
}

function getWeightValue(variant) {
    const weightMap = {
        '100': '100',
        '300': '300',
        'regular': '400',
        '500': '500',
        '700': '700',
        '900': '900'
    };

    return weightMap[variant] || '400';
}

function isItalicVariant(variant) {
    return variant.includes('italic');
}

function createFontFaceDeclaration(fontInfo, variant) {
    const formattedFamilyName = fontInfo.family.replace(' ', '_');
    const isVariable = isVariableFont(fontInfo.axes);

    if (isVariable) {
        const weightRange = getWeightRange(fontInfo.axes);
        return `
  @font-face {
  font-family: '${fontInfo.family}';
  font-style: ${isItalicVariant(variant) ? 'italic' : 'normal'};
  font-weight: ${weightRange};
  font-display: swap;
  src: url(/assets/font/${formattedFamilyName}/${formattedFamilyName}_${variant}_variable_${fontInfo.version}.woff2) format('woff2');
  }`;
    }

    return `
  @font-face {
  font-family: '${fontInfo.family}';
  font-style: ${isItalicVariant(variant) ? 'italic' : 'normal'};
  font-weight: ${getWeightValue(variant.replace('italic', ''))};
  font-display: swap;
  src: url(/assets/font/${formattedFamilyName}/${formattedFamilyName}_${variant}_${fontInfo.version}.woff2) format('woff2');
  }`;
}