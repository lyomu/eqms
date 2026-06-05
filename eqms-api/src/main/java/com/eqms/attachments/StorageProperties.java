package com.eqms.attachments;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import lombok.Getter;
import lombok.Setter;

@Component
@ConfigurationProperties(prefix = "eqms.storage")
@Getter
@Setter
public class StorageProperties {
    private String endpointUrl;
    private String region = "us-east-1";
    private String bucket = "eqms-attachments";
    private String accessKey;
    private String secretKey;
    private boolean pathStyleAccess = true;
}
