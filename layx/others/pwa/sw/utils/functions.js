export function urlMatchesPattern(url, pattern) {
    try {
        const regex = new RegExp(pattern.replace('*', '.*'));
        return regex.test(url);
    } catch {
        return false;
    }
}

export function testPattern(pattern, url) {
    try {
        return pattern.test(url);
    } catch {
        return false;
    }
}

export function getMetadataFromResponse(response) {
    try {
        const metadata = response.headers.get('sw-cache-metadata');
        return metadata ? JSON.parse(metadata) : null;
    } catch {
        return null;
    }
}

export function getResponseSize(response) {
    const contentLength = response.headers.get('content-length');
    return contentLength ? parseInt(contentLength, 10) : 0;
}

export function enhanceResponseWithMetadata(response, metadata) {
    return new Response(response.body, {
        ...response,
        headers: new Headers({
            ...Object.fromEntries(response.headers),
            'sw-cache-metadata': JSON.stringify(metadata)
        })
    });
}

export function createHeadersWithTimestamp(originalHeaders, timestamp) {
    const headers = new Headers(originalHeaders);
    if (timestamp) {
        headers.set('If-Modified-Since', new Date(timestamp).toUTCString());
    }
    return headers;
}

export function createRequest(originalRequest, headers) {
    return new Request(originalRequest.url, {
        method: originalRequest.method,
        headers: headers,
        mode: originalRequest.mode,
        credentials: originalRequest.credentials,
        redirect: originalRequest.redirect
    });
}
