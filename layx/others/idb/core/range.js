/**
 * Range – IDBKeyRange Builder Utilities
 */
class Range {
    static get isSupported() {
        return typeof IDBKeyRange !== 'undefined';
    }

    /**
     * Exact key match
     * @param {*} value
     */
    static only(value) {
        if (!Range.isSupported) return null;
        return IDBKeyRange.only(value);
    }

    /**
     * Keys between lower and upper
     * @param {*} lower
     * @param {*} upper
     * @param {Object} [options]
     * @param {boolean} [options.lowerOpen=false] - If true, excludes lower bound
     * @param {boolean} [options.upperOpen=false] - If true, excludes upper bound
     */
    static between(lower, upper, { lowerOpen = false, upperOpen = false } = {}) {
        if (!Range.isSupported) return null;
        return IDBKeyRange.bound(lower, upper, lowerOpen, upperOpen);
    }

    /**
     * Keys strictly greater than value (> value)
     * @param {*} value
     */
    static greaterThan(value) {
        if (!Range.isSupported) return null;
        return IDBKeyRange.lowerBound(value, true);
    }

    /**
     * Keys greater than or equal to value (>= value)
     * @param {*} value
     */
    static greaterThanOrEqual(value) {
        if (!Range.isSupported) return null;
        return IDBKeyRange.lowerBound(value, false);
    }

    /**
     * Keys strictly less than value (< value)
     * @param {*} value
     */
    static lessThan(value) {
        if (!Range.isSupported) return null;
        return IDBKeyRange.upperBound(value, true);
    }

    /**
     * Keys less than or equal to value (<= value)
     * @param {*} value
     */
    static lessThanOrEqual(value) {
        if (!Range.isSupported) return null;
        return IDBKeyRange.upperBound(value, false);
    }

    /**
     * String keys starting with a given prefix
     * @param {string} prefix
     */
    static prefix(prefix) {
        if (!Range.isSupported) return null;
        return IDBKeyRange.bound(prefix, prefix + '\uffff');
    }
}

export { Range };
export default Range;

