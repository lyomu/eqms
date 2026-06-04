package com.eqms.config;

import java.util.concurrent.Executor;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/**
 * Enables asynchronous notification dispatch ({@code @Async}) and scheduled jobs
 * ({@code @Scheduled}) for Milestone 10. Notifications are operational (not regulated) records, so
 * dispatching them off the request thread does not affect the transactional/audit guarantees of the
 * regulated business action that triggered them.
 *
 * <p>The executor is named {@code taskExecutor} so {@code @Async} (no qualifier) picks it up. In
 * integration tests this bean is overridden with a synchronous executor to make dispatch
 * deterministic.</p>
 */
@Configuration
@EnableAsync
@EnableScheduling
public class AsyncConfig {

    @Bean(name = "taskExecutor")
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(8);
        executor.setQueueCapacity(200);
        executor.setThreadNamePrefix("eqms-async-");
        executor.initialize();
        return executor;
    }
}
