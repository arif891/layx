#!/usr/bin/env node

import { createProject } from './commands/create.js';

const [, , ...args] = process.argv;
await createProject(args[0]);
