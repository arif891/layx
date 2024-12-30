import path from 'node:path';


export {processHtmlFiles};

async function processHtmlFiles(startPath, mode = 'comment') {
    async function* findHtmlFiles(dir) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          yield* findHtmlFiles(fullPath);
        } else if (entry.isFile() && path.extname(entry.name) === '.html') {
          yield fullPath;
        }
      }
    }

    const patterns = {
      comment: [
        {
          from: /<link rel="stylesheet" href="\/layx\/layx\.css">/g,
          to: '<!--<link rel="stylesheet" href="/layx/layx.css">-->'
        },
        {
          from: /<script src="\/layx\/layx\.js" type="module"><\/script>/g,
          to: '<!--<script src="/layx/layx.js" type="module"></script>-->'
        }
      ],
      uncomment: [
        {
          from: /<!--<link rel="stylesheet" href="\/layx\/layx\.css">-->/g,
          to: '<link rel="stylesheet" href="/layx/layx.css">'
        },
        {
          from: /<!--<script src="\/layx\/layx\.js" type="module"><\/script>-->/g,
          to: '<script src="/layx/layx.js" type="module"></script>'
        }
      ]
    };

    async function processFile(filePath) {
      let content = await fs.readFile(filePath, 'utf8');
      let modified = false;

      patterns[mode].forEach(({ from, to }) => {
        const newContent = content.replace(from, to);
        if (newContent !== content) {
          content = newContent;
          modified = true;
        }
      });

      if (modified) {
        await fs.writeFile(filePath, content, 'utf8');
        console.log(`${mode}ed LayX files in ${filePath}`);
      }
    }

    try {

      const indexPath = path.join(this.directories.current, 'index.html');
      if (await fs.stat(indexPath).catch(() => false)) {
        await processFile(indexPath);
      }

      for await (const filePath of findHtmlFiles(startPath)) {
        await processFile(filePath);
      }
    } catch (error) {
      console.error('Error processing HTML files:', error);
      throw error;
    }
  }

  export {processHtmlFiles}