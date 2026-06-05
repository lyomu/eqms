package com.eqms.attachments;

import java.io.InputStream;

/** Abstraction over S3-compatible object storage. */
public interface StorageService {

    /**
     * Store the given bytes under {@code key} in the configured bucket.
     * The key should be unique per upload (e.g. UUID-based).
     */
    void put(String key, InputStream data, long contentLength, String contentType);

    /**
     * Open a readable stream for the object at {@code key}.
     * Caller is responsible for closing the returned stream.
     */
    InputStream get(String key);

    /** Permanently remove the object at {@code key}. Used only for soft-delete cleanup or test teardown. */
    void delete(String key);
}
