import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { IDB, Range, StoreHandle, IndexHandle } from '../layx/others/idb/idb.js';

describe('IDB Engine & Core Modules', () => {
  describe('Range Builder (core/range.js)', () => {
    let origIDBKeyRange;
    beforeEach(() => {
      origIDBKeyRange = globalThis.IDBKeyRange;
      globalThis.IDBKeyRange = {
        only: (v) => ({ type: 'only', value: v }),
        bound: (l, u, lo, uo) => ({ type: 'bound', lower: l, upper: u, lowerOpen: lo, upperOpen: uo }),
        lowerBound: (l, o) => ({ type: 'lowerBound', lower: l, open: o }),
        upperBound: (u, o) => ({ type: 'upperBound', upper: u, open: o }),
      };
    });

    afterEach(() => {
      globalThis.IDBKeyRange = origIDBKeyRange;
    });

    test('builds exact, bounded, threshold, and prefix ranges', () => {
      assert.deepStrictEqual(Range.only(42), { type: 'only', value: 42 });
      assert.deepStrictEqual(Range.between(10, 20), {
        type: 'bound', lower: 10, upper: 20, lowerOpen: false, upperOpen: false,
      });
      assert.deepStrictEqual(Range.greaterThan(5), { type: 'lowerBound', lower: 5, open: true });
      assert.deepStrictEqual(Range.greaterThanOrEqual(5), { type: 'lowerBound', lower: 5, open: false });
      assert.deepStrictEqual(Range.lessThan(100), { type: 'upperBound', upper: 100, open: true });
      assert.deepStrictEqual(Range.lessThanOrEqual(100), { type: 'upperBound', upper: 100, open: false });
      assert.deepStrictEqual(Range.prefix('layx_'), {
        type: 'bound', lower: 'layx_', upper: 'layx_\uffff', lowerOpen: undefined, upperOpen: undefined,
      });
    });
  });

  describe('SSR Safety', () => {
    let origIndexedDB;
    beforeEach(() => {
      origIndexedDB = globalThis.indexedDB;
      delete globalThis.indexedDB;
    });

    afterEach(() => {
      globalThis.indexedDB = origIndexedDB;
    });

    test('constructs safely on server and rejects open() with descriptive error', async () => {
      const db = new IDB('ssr-test');
      assert.strictEqual(db.name, 'ssr-test');
      await assert.rejects(
        () => db.open(),
        /\[IDB\] IndexedDB is not supported/
      );
    });
  });

  describe('In simulated browser environment', () => {
    let mockStorage;
    let origIndexedDB;

    // Lightweight in-memory IndexedDB simulator for unit tests
    function createMockIndexedDB() {
      const databases = new Map();

      return {
        open(dbName, version) {
          const req = {
            result: null,
            error: null,
            onsuccess: null,
            onerror: null,
            onupgradeneeded: null,
          };

          setTimeout(() => {
            let dbData = databases.get(dbName);
            const oldVersion = dbData ? dbData.version : 0;
            const isUpgrade = !dbData || dbData.version < version;

            if (!dbData) {
              dbData = { version, stores: new Map() };
              databases.set(dbName, dbData);
            }

            const mockDb = {
              name: dbName,
              version,
              objectStoreNames: {
                contains: (n) => dbData.stores.has(n),
              },
              createObjectStore(storeName, params = {}) {
                const storeData = {
                  params,
                  records: new Map(),
                  indexes: new Map(),
                };
                dbData.stores.set(storeName, storeData);
                return createMockStore(storeData);
              },
              transaction(storeNames, mode) {
                const names = Array.isArray(storeNames) ? storeNames : [storeNames];
                const tx = {
                  mode,
                  oncomplete: null,
                  onerror: null,
                  onabort: null,
                  objectStore: (name) => {
                    const storeData = dbData.stores.get(name);
                    if (!storeData) throw new Error(`NotFoundError: Store ${name} not found`);
                    return createMockStore(storeData);
                  },
                  abort() {
                    if (tx.onabort) tx.onabort();
                  },
                };
                // Automatically complete transaction after active requests
                setTimeout(() => {
                  if (tx.oncomplete) tx.oncomplete();
                }, 20);
                return tx;
              },
              close() {},
            };

            function createMockStore(storeData) {
              return {
                name: 'store',
                indexNames: {
                  contains: (idxName) => storeData.indexes.has(idxName),
                },
                createIndex(name, keyPath, opts) {
                  storeData.indexes.set(name, { keyPath, opts });
                },
                index(name) {
                  return {
                    get: (key) => {
                      const req = {};
                      setTimeout(() => {
                        let found = undefined;
                        for (const val of storeData.records.values()) {
                          if (val && val[name] === key) {
                            found = val;
                            break;
                          }
                        }
                        req.result = found;
                        if (req.onsuccess) req.onsuccess({ target: req });
                      }, 0);
                      return req;
                    },
                  };
                },
                get(key) {
                  const req = {};
                  setTimeout(() => {
                    req.result = storeData.records.get(key);
                    if (req.onsuccess) req.onsuccess({ target: req });
                  }, 0);
                  return req;
                },
                put(value, key) {
                  const req = {};
                  setTimeout(() => {
                    const actualKey = key !== undefined ? key : (value && value.id !== undefined ? value.id : Math.random());
                    storeData.records.set(actualKey, value);
                    req.result = actualKey;
                    if (req.onsuccess) req.onsuccess({ target: req });
                  }, 0);
                  return req;
                },
                add(value, key) {
                  const req = {};
                  setTimeout(() => {
                    const actualKey = key !== undefined ? key : (value && value.id !== undefined ? value.id : Math.random());
                    if (storeData.records.has(actualKey)) {
                      req.error = new Error('ConstraintError: Key already exists');
                      if (req.onerror) req.onerror({ target: req });
                      return;
                    }
                    storeData.records.set(actualKey, value);
                    req.result = actualKey;
                    if (req.onsuccess) req.onsuccess({ target: req });
                  }, 0);
                  return req;
                },
                delete(key) {
                  const req = {};
                  setTimeout(() => {
                    storeData.records.delete(key);
                    req.result = undefined;
                    if (req.onsuccess) req.onsuccess({ target: req });
                  }, 0);
                  return req;
                },
                clear() {
                  const req = {};
                  setTimeout(() => {
                    storeData.records.clear();
                    req.result = undefined;
                    if (req.onsuccess) req.onsuccess({ target: req });
                  }, 0);
                  return req;
                },
                count(q) {
                  const req = {};
                  setTimeout(() => {
                    req.result = q ? (storeData.records.has(q) ? 1 : 0) : storeData.records.size;
                    if (req.onsuccess) req.onsuccess({ target: req });
                  }, 0);
                  return req;
                },
                getAll(q, count) {
                  const req = {};
                  setTimeout(() => {
                    let vals = Array.from(storeData.records.values());
                    if (count) vals = vals.slice(0, count);
                    req.result = vals;
                    if (req.onsuccess) req.onsuccess({ target: req });
                  }, 0);
                  return req;
                },
                getAllKeys(q, count) {
                  const req = {};
                  setTimeout(() => {
                    let keys = Array.from(storeData.records.keys());
                    if (count) keys = keys.slice(0, count);
                    req.result = keys;
                    if (req.onsuccess) req.onsuccess({ target: req });
                  }, 0);
                  return req;
                },
              };
            }

            req.result = mockDb;

            if (isUpgrade && req.onupgradeneeded) {
              req.transaction = mockDb.transaction(Array.from(dbData.stores.keys()), 'versionchange');
              req.onupgradeneeded({
                target: req,
                oldVersion,
                newVersion: version,
              });
            }

            if (req.onsuccess) req.onsuccess({ target: req });
          }, 0);

          return req;
        },
        deleteDatabase(dbName) {
          const req = {};
          setTimeout(() => {
            databases.delete(dbName);
            if (req.onsuccess) req.onsuccess({ target: req });
          }, 0);
          return req;
        },
      };
    }

    beforeEach(() => {
      origIndexedDB = globalThis.indexedDB;
      globalThis.indexedDB = createMockIndexedDB();
    });

    afterEach(() => {
      globalThis.indexedDB = origIndexedDB;
    });

    test('opens with declarative schema and creates stores and indexes', async () => {
      const db = new IDB('shop_test', {
        version: 1,
        stores: {
          products: { keyPath: 'id', indexes: ['category'] },
          config: {},
        },
      });

      await db.open();
      assert.ok(db.db.objectStoreNames.contains('products'));
      assert.ok(db.db.objectStoreNames.contains('config'));

      db.close();
    });

    test('stores and retrieves data via bound StoreHandle', async () => {
      const db = new IDB('store_test', {
        version: 1,
        stores: {
          users: { keyPath: 'id' },
        },
      });

      const users = db.store('users');

      // Put item
      await users.put({ id: 1, name: 'Alice', email: 'alice@example.com' });

      // Get item
      const item = await users.get(1);
      assert.deepStrictEqual(item, { id: 1, name: 'Alice', email: 'alice@example.com' });

      // Check has() and count()
      assert.strictEqual(await users.has(1), true);
      assert.strictEqual(await users.has(999), false);
      assert.strictEqual(await users.count(), 1);

      // Add duplicate should throw
      await assert.rejects(
        () => users.add({ id: 1, name: 'Duplicate' }),
        /ConstraintError/
      );

      // Delete item
      await users.delete(1);
      assert.strictEqual(await users.has(1), false);
      assert.strictEqual(await users.count(), 0);

      db.close();
    });

    test('performs bulk operations cleanly in a single transaction', async () => {
      const db = new IDB('bulk_test', {
        version: 1,
        stores: {
          items: {},
        },
      });

      const items = db.store('items');
      const keys = ['k1', 'k2', 'k3'];
      const values = ['val1', 'val2', 'val3'];

      await items.bulkPut(values, keys);
      assert.strictEqual(await items.count(), 3);
      assert.deepStrictEqual(await items.getAll(), ['val1', 'val2', 'val3']);
      assert.deepStrictEqual(await items.getAllKeys(), ['k1', 'k2', 'k3']);

      await items.bulkDelete(['k1', 'k3']);
      assert.strictEqual(await items.count(), 1);
      assert.strictEqual(await items.get('k2'), 'val2');

      db.close();
    });

    test('executes atomic transactions with commit and rollback on error', async () => {
      const db = new IDB('tx_test', {
        version: 1,
        stores: {
          accounts: {},
        },
      });

      const accounts = db.store('accounts');
      await accounts.set('a', 100);
      await accounts.set('b', 50);

      // Successful atomic transaction
      await db.tx('accounts', 'readwrite', async (store) => {
        const balA = await store.get('a');
        const balB = await store.get('b');
        await store.set('a', balA - 30);
        await store.set('b', balB + 30);
      });

      assert.strictEqual(await accounts.get('a'), 70);
      assert.strictEqual(await accounts.get('b'), 80);

      // Failing atomic transaction should trigger abort
      await assert.rejects(
        () => db.tx('accounts', 'readwrite', async (store) => {
          await store.set('a', 0);
          throw new Error('Transaction failure');
        }),
        /Transaction failure/
      );

      db.close();
    });

    test('IDB.kv provides zero-config key-value store', async () => {
      await IDB.kv.set('auth_token', 'xyz-123');
      assert.strictEqual(await IDB.kv.get('auth_token'), 'xyz-123');
      assert.strictEqual(await IDB.kv.has('auth_token'), true);

      await IDB.kv.delete('auth_token');
      assert.strictEqual(await IDB.kv.has('auth_token'), false);
    });
  });
});

