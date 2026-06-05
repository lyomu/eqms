package com.eqms.attachments;

import java.io.InputStream;
import java.net.URI;

import org.springframework.stereotype.Service;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.NoSuchBucketException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import jakarta.annotation.PostConstruct;

/**
 * S3-compatible storage implementation. Works against AWS S3 in production and
 * MinIO locally (path-style access enabled via {@code eqms.storage.path-style-access}).
 */
@Service
public class S3StorageService implements StorageService {

    private final StorageProperties props;
    private S3Client s3;

    public S3StorageService(StorageProperties props) {
        this.props = props;
    }

    @PostConstruct
    void init() {
        var builder = S3Client.builder()
                .region(Region.of(props.getRegion()))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(props.getAccessKey(), props.getSecretKey())))
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(props.isPathStyleAccess())
                        .build());

        if (props.getEndpointUrl() != null && !props.getEndpointUrl().isBlank()) {
            builder.endpointOverride(URI.create(props.getEndpointUrl()));
        }
        s3 = builder.build();
        ensureBucketExists();
    }

    @Override
    public void put(String key, InputStream data, long contentLength, String contentType) {
        s3.putObject(PutObjectRequest.builder()
                        .bucket(props.getBucket())
                        .key(key)
                        .contentType(contentType)
                        .contentLength(contentLength)
                        .build(),
                RequestBody.fromInputStream(data, contentLength));
    }

    @Override
    public InputStream get(String key) {
        return s3.getObject(GetObjectRequest.builder()
                .bucket(props.getBucket())
                .key(key)
                .build());
    }

    @Override
    public void delete(String key) {
        s3.deleteObject(DeleteObjectRequest.builder()
                .bucket(props.getBucket())
                .key(key)
                .build());
    }

    private void ensureBucketExists() {
        try {
            s3.headBucket(HeadBucketRequest.builder().bucket(props.getBucket()).build());
        } catch (NoSuchBucketException e) {
            s3.createBucket(CreateBucketRequest.builder().bucket(props.getBucket()).build());
        }
    }
}
