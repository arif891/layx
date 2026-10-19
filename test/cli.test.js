import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const execFileAsync = promisify(execFile);
const cliPath = path.resolve('src/cli.js');

describe('CLI Commands & Flags', () => {
    test('displays help with --help flag', async () => {
        const { stdout } = await execFileAsync('node', [cliPath, '--help']);
        assert.match(stdout, /LayX CLI/);
        assert.match(stdout, /USAGE:/);
        assert.match(stdout, /COMMANDS:/);
        assert.match(stdout, /create/);
        assert.match(stdout, /build/);
    });

    test('displays help with -h flag', async () => {
        const { stdout } = await execFileAsync('node', [cliPath, '-h']);
        assert.match(stdout, /LayX CLI/);
    });

    test('displays version with --version flag', async () => {
        const { stdout } = await execFileAsync('node', [cliPath, '--version']);
        assert.match(stdout, /LayX v\d+\.\d+\.\d+/);
    });

    test('displays version with -v flag', async () => {
        const { stdout } = await execFileAsync('node', [cliPath, '-v']);
        assert.match(stdout, /LayX v\d+\.\d+\.\d+/);
    });

    test('fails on unknown command with exit code 1', async () => {
        await assert.rejects(
            async () => {
                await execFileAsync('node', [cliPath, 'nonexistent-command-123']);
            },
            (error) => {
                assert.equal(error.code, 1);
                assert.match(error.stderr, /Unknown command/);
                return true;
            }
        );
    });
});
