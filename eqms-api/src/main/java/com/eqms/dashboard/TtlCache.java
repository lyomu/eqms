package com.eqms.dashboard;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

/**
 * Minimal per-key time-to-live cache (no external dependency). Used to cache the per-user dashboard
 * queries for a few minutes (CLAUDE.md M10). A non-positive TTL disables caching entirely (every
 * call recomputes) — used in tests for determinism.
 */
public class TtlCache<V> {

    private record Entry<V>(V value, long expiresAtMillis) {
    }

    private final ConcurrentHashMap<String, Entry<V>> store = new ConcurrentHashMap<>();
    private final long ttlMillis;

    public TtlCache(Duration ttl) {
        this.ttlMillis = ttl.toMillis();
    }

    /** Return the cached value for {@code key}, or compute, store, and return it if absent/expired. */
    public V get(String key, Supplier<V> loader) {
        if (ttlMillis <= 0) {
            return loader.get();
        }
        long now = System.currentTimeMillis();
        Entry<V> existing = store.get(key);
        if (existing != null && existing.expiresAtMillis() > now) {
            return existing.value();
        }
        V value = loader.get();
        store.put(key, new Entry<>(value, now + ttlMillis));
        return value;
    }

    public void invalidate(String key) {
        store.remove(key);
    }

    public void clear() {
        store.clear();
    }
}
