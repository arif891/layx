import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { matchesPattern, isPathExcluded } from '../src/utils/fs.js';

describe('Copy & Exclude Pattern Matcher', () => {
    test('matches exact file and folder names', () => {
        assert.ok(matchesPattern('drafts', 'drafts'));
        assert.ok(matchesPattern('notes.txt', 'notes.txt'));
        assert.ok(matchesPattern('sub/dir/file.txt', 'sub/dir/file.txt'));
        assert.ok(!matchesPattern('drafts-2', 'drafts'));
        assert.ok(!matchesPattern('other.txt', 'notes.txt'));
    });

    test('matches directory prefix with or without trailing slash', () => {
        assert.ok(matchesPattern('drafts/post.html', 'drafts'));
        assert.ok(matchesPattern('drafts/sub/nested.txt', 'drafts/'));
        assert.ok(matchesPattern('pages/draft.html', 'pages/draft.html'));
        assert.ok(!matchesPattern('not-drafts/post.html', 'drafts'));
    });

    test('matches by basename', () => {
        assert.ok(matchesPattern('deep/nested/folder/secret.key', 'secret.key'));
        assert.ok(matchesPattern('sub/config.local.json', 'config.local.json'));
    });

    test('matches wildcard patterns (* and ?)', () => {
        assert.ok(matchesPattern('app.log', '*.log'));
        assert.ok(matchesPattern('deep/path/debug.log', '*.log'));
        assert.ok(matchesPattern('key.secret', '*.secret'));
        assert.ok(matchesPattern('temp-123.txt', 'temp-*'));
        assert.ok(matchesPattern('file-1.js', 'file-?.js'));
        assert.ok(!matchesPattern('app.txt', '*.log'));
        assert.ok(!matchesPattern('temp/other.js', 'temp-*.js'));
    });

    test('isPathExcluded checks array of patterns', () => {
        const excludeList = ['drafts', '*.log', 'secrets/', 'notes.txt'];

        assert.ok(isPathExcluded('drafts/intro.html', excludeList));
        assert.ok(isPathExcluded('server.log', excludeList));
        assert.ok(isPathExcluded('secrets/key.pem', excludeList));
        assert.ok(isPathExcluded('notes.txt', excludeList));

        assert.ok(!isPathExcluded('index.html', excludeList));
        assert.ok(!isPathExcluded('assets/css/base.css', excludeList));
        assert.ok(!isPathExcluded('pages/about.html', excludeList));
    });
});
