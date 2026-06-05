package com.eqms.support;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

import com.eqms.attachments.StorageService;

/**
 * Replaces the real S3StorageService with an in-memory map for integration tests.
 * No MinIO/S3 instance is needed — files are stored in a ConcurrentHashMap and discarded
 * after the JVM exits. The bean is @Primary so it wins over the S3StorageService.
 */
@TestConfiguration
public class TestStorageConfig {

    @Bean
    @Primary
    public StorageService inMemoryStorageService() {
        return new InMemoryStorageService();
    }

    static class InMemoryStorageService implements StorageService {

        private final ConcurrentHashMap<String, byte[]> store = new ConcurrentHashMap<>();

        @Override
        public void put(String key, InputStream data, long contentLength, String contentType) {
            try {
                store.put(key, data.readAllBytes());
            } catch (java.io.IOException e) {
                throw new RuntimeException("InMemoryStorageService.put failed", e);
            }
        }

        @Override
        public InputStream get(String key) {
            byte[] bytes = store.get(key);
            if (bytes == null) throw new RuntimeException("Key not found in test store: " + key);
            return new ByteArrayInputStream(bytes);
        }

        @Override
        public void delete(String key) {
            store.remove(key);
        }
    }
}
