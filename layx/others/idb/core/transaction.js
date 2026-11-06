/**
 * Transaction – IndexedDB Transaction Runner and Promise Helpers
 */

/**
 * Promisify an IDBRequest
 * @param {IDBRequest} request
 * @returns {Promise<any>}
 */
function promisifyRequest(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
            const err = request.error || new Error('IndexedDB request failed');
            reject(err);
        };
    });
}

/**
 * Promisify transaction completion
 * @param {IDBTransaction} tx
 * @returns {Promise<void>}
 */
function promisifyTransaction(tx) {
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onabort = () => {
            const err = tx.error || new Error('Transaction aborted');
            reject(err);
        };
        tx.onerror = () => {
            const err = tx.error || new Error('Transaction error');
            reject(err);
        };
    });
}

/**
 * Execute an atomic transaction with automatic commit/rollback
 * @param {IDBDatabase} db
 * @param {string|string[]} storeNames
 * @param {'readonly'|'readwrite'} mode
 * @param {Function} callback
 * @param {Function} storeWrapperFactory
 * @returns {Promise<any>}
 */
async function runTransaction(db, storeNames, mode, callback, storeWrapperFactory) {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    const tx = db.transaction(names, mode);
    const txPromise = promisifyTransaction(tx);
    // Suppress unhandled rejection if callback throws and aborts
    txPromise.catch(() => {});

    const storeMap = {};
    names.forEach(name => {
        const rawStore = tx.objectStore(name);
        storeMap[name] = storeWrapperFactory ? storeWrapperFactory(rawStore, tx) : rawStore;
    });

    const target = names.length === 1 ? storeMap[names[0]] : storeMap;

    let callbackResult;
    try {
        callbackResult = await callback(target, tx);
    } catch (err) {
        try {
            tx.abort();
        } catch {
            // Transaction might have already aborted
        }
        throw err;
    }

    await txPromise;
    return callbackResult;
}

export { promisifyRequest, promisifyTransaction, runTransaction };
