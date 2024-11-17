import path from 'path';
import { promises as fs } from 'fs';

import { argsObj, colors } from './vars.js';

async function handleAdd(scriptDir) {
  if (!argsObj.values.component && !argsObj.values.font) {
    console.warn("Please specify a component using '--component' or '-c', or a font using '--font' or '-f'.");
    return;
  }

  if (argsObj.values.component) {
    await handleComponentAdd(scriptDir);
  }

  if (argsObj.values.font) {
    await handleFontAdd(scriptDir);
  }
}

async function handleComponentAdd(scriptDir) {
  console.log('Component:', argsObj.values.component);
  // Todo component handling logic here
}

async function handleFontAdd(scriptDir) {
  try {
    const fontInfoGF = await readFile(path.join(scriptDir, "/info/font_info_GF.json"));
    const fontInfoObj = JSON.parse(fontInfoGF);

    console.log(colors.style(`Last font info update: ${fontInfoObj.lastUpdate}`, colors.fg.yellow));

    await Promise.all(
      argsObj.values.font.map(font => processFontFamily(font, fontInfoObj))
    );
  } catch (error) {
    console.error(colors.style(`Error processing fonts: ${error.message}`, colors.fg.red));
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

async function ensureDirectoryExists(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

async function processFontFamily(fontName, fontInfoObj) {
  const result = searchFont(fontInfoObj, fontName.toLowerCase());

  if (!result.found) {
    console.warn(result.message);
    return;
  }

  const formattedFamilyName = result.family.replace(' ', '_');
  const fontDir = `./assets/font/${formattedFamilyName}`;
  const isVariable = isVariableFont(result.axes);

  try {
    console.log(colors.style(`Adding "${result.family}" ${isVariable ? 'variable' : 'static'} font family...`, colors.fg.cyan));

    // Ensure the font directory exists
    await ensureDirectoryExists(fontDir);

    // Generate font-face declarations for all variants
    const fontFaces = Object.keys(result.files).map(variant =>
      createFontFaceDeclaration(result, variant)
    );

    if (isVariable) {
      console.log(colors.style(`It is a variable font and available axes: ${result.axes.map(axis =>
        `${axis.tag} (${axis.start}-${axis.end}).`
      ).join(', ')}`, colors.fg.yellow));
    } else {
      console.log(colors.style(`Available variants: ${result.variants.join(', ')}.`,colors.fg.yellow));
    }

    // Download all font files in parallel
    await Promise.all(
      Object.entries(result.files).map(async ([variant, url]) => {
        const filePath = `${fontDir}/${formattedFamilyName}_${variant}_${isVariable ? 'variable_':''}${result.version}.woff2`;
        console.log(`Downloading ${variant} variant...`);
        await downloadFile(url, filePath);
      })
    );

    // Save the fontFaces to a CSS file

    await writeFile(`${fontDir}/font-face.css`, fontFaces.join('\n\n'));
    await writeFile('./layx/main/typography/typography.css', `\n\n\n/*<${result.family}>*/${fontFaces.join('\n')}\n/*</${result.family}>*/`, 'a');

    console.log(colors.style(`Added "${result.family}" font family successfully.`, colors.fg.green));
  } catch (error) {
    console.error(`Failed to add "${result.family}". Error:`, error.message);
  }
}


async function downloadFile(url, outputPath, options = {}) {
  const {
    onProgress,
    retries = 3,
    retryDelay = 1000,
    signal,
  } = options;

  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Download speed calculation helpers
  let startTime = Date.now();
  let lastUpdate = startTime;
  let lastBytes = 0;
  let lastProgressUpdate = 0; // Throttle progress updates

  const calculateSpeed = (downloadedSize) => {
    const now = Date.now();
    const timeDiff = (now - lastUpdate) / 1000;
    const bytesDiff = downloadedSize - lastBytes;
    const speedBps = bytesDiff / timeDiff;

    lastUpdate = now;
    lastBytes = downloadedSize;

    return speedBps;
  };

  const formatSpeed = (bps) => {
    if (bps >= 1024 * 1024) return `${(bps / (1024 * 1024)).toFixed(2)} MB/s`;
    if (bps >= 1024) return `${(bps / 1024).toFixed(2)} KB/s`;
    return `${bps.toFixed(2)} B/s`;
  };

  const formatBytes = (bytes) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${bytes} B`;
  };

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const dir = path.dirname(outputPath);
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
      }

      const response = await fetch(url, { signal });

      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
      }

      const totalSize = parseInt(response.headers.get('content-length') || '0');
      let downloadedSize = 0;

      const fileHandle = await fs.open(outputPath, 'w');
      const writer = fileHandle.createWriteStream();

      try {
        const reader = response.body.getReader();

        while (true) {
          if (signal?.aborted) {
            throw new Error('Download aborted');
          }

          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          writer.write(Buffer.from(value));
          downloadedSize += value.length;

          // Throttle progress updates to every 100ms
          const now = Date.now();
          if (now - lastProgressUpdate >= 100) {
            const speed = calculateSpeed(downloadedSize);
            const progress = {
              totalSize,
              downloadedSize,
              percent: totalSize ? (downloadedSize / totalSize) * 100 : 0,
              speed,
              formattedSpeed: formatSpeed(speed),
              formattedDownloaded: formatBytes(downloadedSize),
              formattedTotal: totalSize ? formatBytes(totalSize) : 'Unknown'
            };

            if (onProgress) {
              onProgress(progress);
            } else {
              // Clear the line before writing new progress
              process.stdout.write('\r\x1b[K');
              process.stdout.write(
                `Downloading... ${progress.percent.toFixed(2)}% | ` +
                `${progress.formattedDownloaded}/${progress.formattedTotal} | ` +
                `${progress.formattedSpeed}`
              );
            }
            lastProgressUpdate = now;
          }
        }

        writer.end();
        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });

        await fileHandle.close();
        // Clear the line and show completion message
        if (!onProgress) {
          process.stdout.write('\r\x1b[K');
          console.log('Download completed!');
        }

        return true;

      } catch (error) {
        writer.end();
        await fileHandle.close();
        await fs.unlink(outputPath);
        throw error;
      }

    } catch (error) {
      try {
        await fs.access(outputPath);
        await fs.unlink(outputPath);
      } catch { }

      if (error.name === 'AbortError' || signal?.aborted) {
        throw new Error('Download aborted');
      }

      if (attempt === retries - 1) {
        throw error;
      }

      const delayTime = retryDelay * Math.pow(2, attempt);
      console.log(`\nAttempt ${attempt + 1} failed, retrying in ${delayTime / 1000}s...`);
      await wait(delayTime);
    }
  }
}



function extractClasses(html, startClass, type = 'class') {
  if (!html || typeof html !== 'string') {
    throw new Error('Invalid HTML input');
  }

  const escapedStartClass = startClass.replace(/[-_]/g, '\\$&');
  const patterns = {
    class: {
      regex: new RegExp(`class="([^"]*?\\b${escapedStartClass}\\d+\\b[^"]*?)"`, 'g'),
      process: match => match[1].split(/\s+/).filter(className => className.startsWith(startClass))
    },
    media: {
      regex: new RegExp(`\\b${escapedStartClass}(\\w+)-\\d+\\b`, 'g'),
      process: match => [match[1]]
    }
  };

  if (!patterns[type]) {
    throw new Error(`Invalid type: ${type}`);
  }

  const { regex, process } = patterns[type];
  const resultSet = new Set();
  let match;

  while ((match = regex.exec(html)) !== null) {
    process(match).forEach(item => resultSet.add(item));
  }

  const sortFunctions = {
    class: (a, b) => parseInt(a.split(/[-_]/).pop()) - parseInt(b.split(/[-_]/).pop()),
    media: (a, b) => BuildTool.CONFIG.mediaBreakpoints.indexOf(a) - BuildTool.CONFIG.mediaBreakpoints.indexOf(b)
  };

  return Array.from(resultSet).sort(sortFunctions[type]);
}

async function readFile(filePath, encoding = 'utf8') {
  return await fs.readFile(filePath, { encoding });
}

async function writeFile(filePath, content, flag = 'w') {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  return await fs.writeFile(filePath, content, { flag });
}


export { readFile, writeFile, downloadFile, handleAdd, extractClasses }