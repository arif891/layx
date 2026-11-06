# LayX IndexedDB (`idb`)

A modern, lightweight, promise-based IndexedDB engine with zero dependencies. Designed for fast client-side storage, offline caching, and structured data with intuitive APIs.

---

## ✨ Features

- **Zero-Config Key-Value Store (`IDB.kv`)**: Instant `localStorage` replacement with unlimited quota.
- **Declarative Schemas**: Define stores and indexes without raw `onupgradeneeded` boilerplate.
- **Atomic Multi-Store Transactions (`db.tx`)**: All-or-nothing execution with automatic commit and rollback.
- **Bound Store Handles**: Clean, chainable store instances (`db.store('users')`).
- **Native Fast Reads**: Native C++ `getAll()` queries with built-in pagination (`count`, `offset`, `reverse`).
- **Async Iteration**: Loop over store entries directly with `for await...of`.
- **Query Ranges (`IDB.range`)**: Fluent helpers for bounds, thresholds, and string prefixes (`prefix('user_')`).
- **Multi-Tab Upgrade Safety**: Automatically closes idle connections on schema version change to prevent browser lockups.
- **SSR & Node.js Safe**: Gracefully handles server-side environments.

---

## 🚀 Quick Start

### 1. Instant Key-Value Storage (`IDB.kv`)

For simple offline persistence (tokens, user settings, cached API responses), use `IDB.kv`:

```javascript
import { IDB } from './layx/others/idb/idb.js';

// Store an item
await IDB.kv.set('auth_token', 'jwt-xyz-123');

// Read an item
const token = await IDB.kv.get('auth_token');

// Check presence
if (await IDB.kv.has('auth_token')) {
    console.log('User is authenticated');
}

// Get all keys and values
const keys = await IDB.kv.keys();
const entries = await IDB.kv.entries(); // [['auth_token', 'jwt-xyz-123']]

// Delete or clear
await IDB.kv.delete('auth_token');
await IDB.kv.clear();
```

---

## 🏗️ Structured Databases & Schemas

### 2. Declarative Schema Definition

Define your stores, key paths, and secondary indexes declaratively:

```javascript
import { IDB } from './layx/others/idb/idb.js';

const db = new IDB('shop_app', {
    version: 1,
    stores: {
        // Auto-increment primary key with secondary indexes
        products: {
            keyPath: 'id',
            autoIncrement: true,
            indexes: [
                'category',
                { name: 'sku', keyPath: 'sku', unique: true }
            ]
        },
        // Custom key path
        cart: { keyPath: 'productId' },
        // Simple key-value store (no keyPath)
        settings: {}
    },
    // Optional custom upgrade handler for advanced migrations
    upgrade(db, oldVersion, newVersion, tx) {
        if (oldVersion < 1) {
            // Low-level migrations if needed
        }
    }
});
```

---

### 3. Bound Store Handles

Access a store via `db.store(name)` to perform CRUD operations without repeating the store name:

```javascript
const products = db.store('products');

// Insert / Update
await products.set({ id: 101, name: 'Wireless Headphones', category: 'audio', price: 99 });
// Or standard IDB put:
await products.put({ id: 102, name: 'Mechanical Keyboard', category: 'peripherals', price: 120 });

// Add (fails if key already exists)
await products.add({ id: 103, name: 'Mousepad', category: 'peripherals', price: 20 });

// Read
const item = await products.get(101);
const exists = await products.has(101);
const total = await products.count();

// Delete
await products.delete(101);

// Bulk operations (executed in a single transaction)
await products.bulkPut([
    { id: 201, name: 'USB-C Cable' },
    { id: 202, name: 'Power Bank' }
]);
await products.bulkDelete([201, 202]);
```

---

### 4. Querying & Pagination

`getAll()` uses the browser's native C++ implementation for speed, and includes built-in pagination:

```javascript
const products = db.store('products');

// Get all items
const allItems = await products.getAll();

// Pagination: limit, offset, and reverse
const page = await products.getAll({
    count: 10,       // Limit 10 items
    offset: 20,      // Skip first 20 items
    reverse: true    // Descending order
});

// Query by secondary index
const audioProducts = await products.index('category').getAll('audio');
const specificProduct = await products.index('sku').get('SKU-9901');
```

---

### 5. Range Builders (`IDB.range`)

Easily construct `IDBKeyRange` objects:

```javascript
// Numeric / Date ranges
await products.getAll(IDB.range.between(50, 150));                    // 50 <= price <= 150
await products.getAll(IDB.range.between(50, 150, { lowerOpen: true })); // 50 < price <= 150
await products.getAll(IDB.range.greaterThan(100));                   // price > 100
await products.getAll(IDB.range.lessThanOrEqual(50));                // price <= 50

// String prefix matching
const userLogs = db.store('logs');
const augustLogs = await userLogs.getAll(IDB.range.prefix('2026-08'));
```

---

### 6. Atomic Multi-Store Transactions (`db.tx`)

Execute multi-step operations across multiple stores. If any step throws an error, the entire transaction is rolled back:

```javascript
await db.tx(['accounts', 'ledger'], 'readwrite', async ({ accounts, ledger }) => {
    const from = await accounts.get('acc_1');
    const to = await accounts.get('acc_2');

    if (from.balance < 50) {
        throw new Error('Insufficient funds'); // Automatically aborts and rolls back
    }

    from.balance -= 50;
    to.balance += 50;

    await accounts.put(from);
    await accounts.put(to);
    await ledger.add({
        from: 'acc_1',
        to: 'acc_2',
        amount: 50,
        timestamp: Date.now()
    });
});
```

---

### 7. Async Iteration (`for await...of`)

Iterate over store entries directly with modern async iteration:

```javascript
const users = db.store('users');

// Iterate [key, value] pairs
for await (const [id, user] of users.entries()) {
    console.log(id, user.name);
}

// Iterate values only
for await (const user of users.values()) {
    console.log(user);
}

// Early exit with iterate()
await users.iterate(null, (user, id) => {
    console.log(user);
    if (user.status === 'blocked') return false; // Break loop early
});
```

---

### 8. Database Lifecycle Management

```javascript
// Close connection
db.close();

// Delete database permanently
await db.deleteDatabase();
```

---

## 📋 API Summary

| Method / Property | Description |
| :--- | :--- |
| `IDB.kv` | Instant key-value store (`get`, `set`, `delete`, `has`, `clear`, `keys`, `values`, `entries`) |
| `IDB.range` | Query range helpers (`between`, `greaterThan`, `lessThan`, `prefix`, `only`) |
| `new IDB(name, options)` | Create a database instance with declarative schema |
| `db.open()` | Opens connection and executes pending schema migrations |
| `db.store(name)` | Returns a bound `StoreHandle` for the object store |
| `db.tx(stores, mode, fn)` | Executes an atomic transaction across one or more stores |
| `db.close()` | Closes active database connection |
| `db.deleteDatabase()` | Deletes the underlying IndexedDB database |
| `store.get(key)` | Retrieves a record by key |
| `store.set(key, val)` / `put(val, key)` | Upserts a record |
| `store.add(val, key)` | Inserts a record (fails if key exists) |
| `store.delete(key)` | Deletes a record by key |
| `store.has(key)` | Returns true if key exists |
| `store.count(query)` | Counts records matching query |
| `store.getAll(options)` | Fetches records with optional `count`, `offset`, `reverse` |
| `store.bulkPut(items, keys)` | Batch upsert in a single transaction |
| `store.bulkDelete(keys)` | Batch delete in a single transaction |
| `store.index(name)` | Accesses a secondary index |
| `store.entries()` | Async generator yielding `[key, value]` pairs |

