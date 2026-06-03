package com.eqms.sequences;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.eqms.support.AbstractIntegrationTest;

class SequenceServiceConcurrencyTest extends AbstractIntegrationTest {

    private static final int THREADS = 50;

    @Autowired
    SequenceService sequenceService;

    /**
     * Unique module code per run (<= 20 chars, alphanumeric) so the counter always starts fresh
     * against the shared database — keeps the test re-runnable and gap-free assertions valid.
     */
    private static String uniqueModule() {
        return "M" + Long.toString(System.nanoTime(), 36).toUpperCase();
    }

    @Test
    void parallelCallersGetUniqueGapFreeNumbers() throws Exception {
        String module = uniqueModule();
        ExecutorService pool = Executors.newFixedThreadPool(THREADS);
        CountDownLatch startGate = new CountDownLatch(1);
        Set<String> results = ConcurrentHashMap.newKeySet();

        List<Callable<String>> tasks = IntStream.range(0, THREADS)
                .<Callable<String>>mapToObj(i -> () -> {
                    startGate.await();                       // release all threads at once
                    String number = sequenceService.next(module, 2026);
                    results.add(number);
                    return number;
                })
                .collect(Collectors.toList());

        List<Future<String>> futures = new ArrayList<>();
        for (Callable<String> task : tasks) {
            futures.add(pool.submit(task));
        }
        startGate.countDown();                               // fire
        for (Future<String> f : futures) {
            f.get();                                         // propagate any failure
        }
        pool.shutdown();

        // No duplicates: 50 calls -> 50 distinct numbers.
        assertThat(results).hasSize(THREADS);

        // Gap-free 1..50, all with the expected <module>-2026-### shape.
        Set<Integer> seqParts = results.stream()
                .peek(n -> assertThat(n).matches(module + "-2026-\\d{3}"))
                .map(n -> Integer.parseInt(n.substring(n.lastIndexOf('-') + 1)))
                .collect(Collectors.toSet());
        Set<Integer> expected = IntStream.rangeClosed(1, THREADS).boxed().collect(Collectors.toSet());
        assertThat(seqParts).isEqualTo(expected);
    }

    @Test
    void formatsWithZeroPaddingAndModulePrefix() {
        String module = uniqueModule();
        assertThat(sequenceService.next(module, 2026)).isEqualTo(module + "-2026-001");
        assertThat(sequenceService.next(module, 2026)).isEqualTo(module + "-2026-002");
        // Different year keeps an independent counter.
        assertThat(sequenceService.next(module, 2027)).isEqualTo(module + "-2027-001");
    }
}
