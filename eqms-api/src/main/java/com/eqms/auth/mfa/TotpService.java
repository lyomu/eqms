package com.eqms.auth.mfa;

import java.io.ByteArrayOutputStream;
import java.net.URLEncoder;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.stereotype.Service;

/**
 * Time-based One-Time Password (TOTP) generation and verification per RFC 6238 (HMAC-SHA1,
 * 6 digits, 30-second period) — implemented with the JDK only, so no new dependency is introduced.
 *
 * <p>Secrets are RFC 4648 Base32 strings, compatible with Google Authenticator / Authy etc.
 * {@link #verify} accepts the codes for the previous, current, and next time-steps to tolerate
 * modest clock drift. The server clock is the single source of time (compliance rule 3).</p>
 */
@Service
public class TotpService {

    private static final String BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    private static final String HMAC_ALGORITHM = "HmacSHA1";
    private static final int DIGITS = 6;
    private static final int PERIOD_SECONDS = 30;
    private static final int SECRET_BYTES = 20; // 160-bit secret
    private static final int DRIFT_STEPS = 1;   // accept +/- one 30s window

    private final Clock clock;
    private final SecureRandom secureRandom = new SecureRandom();

    public TotpService(Clock utcClock) {
        this.clock = utcClock;
    }

    /** Generate a new random Base32 secret for enrollment. */
    public String generateSecret() {
        byte[] bytes = new byte[SECRET_BYTES];
        secureRandom.nextBytes(bytes);
        return base32Encode(bytes);
    }

    /** Build the {@code otpauth://} URI an authenticator app consumes (e.g. to render a QR code). */
    public String otpAuthUri(String issuer, String accountName, String secret) {
        String label = urlEncode(issuer + ":" + accountName);
        return "otpauth://totp/" + label
                + "?secret=" + secret
                + "&issuer=" + urlEncode(issuer)
                + "&algorithm=SHA1&digits=" + DIGITS + "&period=" + PERIOD_SECONDS;
    }

    /** Verify a submitted code against the secret, tolerating +/- one time-step of drift. */
    public boolean verify(String secret, String code) {
        if (secret == null || code == null || code.length() != DIGITS) {
            return false;
        }
        long currentStep = currentTimeStep();
        for (int offset = -DRIFT_STEPS; offset <= DRIFT_STEPS; offset++) {
            if (constantTimeEquals(generateCode(secret, currentStep + offset), code)) {
                return true;
            }
        }
        return false;
    }

    /** The current time-step number (epoch seconds / period). */
    public long currentTimeStep() {
        return Instant.now(clock).getEpochSecond() / PERIOD_SECONDS;
    }

    /** Generate the 6-digit code for a given secret and time-step (also used by tests). */
    public String generateCode(String secret, long timeStep) {
        byte[] key = base32Decode(secret);
        byte[] data = ByteBuffer.allocate(Long.BYTES).putLong(timeStep).array();
        byte[] hash = hmacSha1(key, data);

        int offset = hash[hash.length - 1] & 0x0F;
        int binary = ((hash[offset] & 0x7F) << 24)
                | ((hash[offset + 1] & 0xFF) << 16)
                | ((hash[offset + 2] & 0xFF) << 8)
                | (hash[offset + 3] & 0xFF);
        int otp = binary % (int) Math.pow(10, DIGITS);
        return String.format("%0" + DIGITS + "d", otp);
    }

    private static byte[] hmacSha1(byte[] key, byte[] data) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(key, HMAC_ALGORITHM));
            return mac.doFinal(data);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException("Unable to compute TOTP HMAC", e);
        }
    }

    private static boolean constantTimeEquals(String a, String b) {
        if (a.length() != b.length()) {
            return false;
        }
        int result = 0;
        for (int i = 0; i < a.length(); i++) {
            result |= a.charAt(i) ^ b.charAt(i);
        }
        return result == 0;
    }

    private static String urlEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    // --- RFC 4648 Base32 (no padding) ------------------------------------------------------

    static String base32Encode(byte[] data) {
        StringBuilder sb = new StringBuilder();
        int buffer = 0;
        int bitsLeft = 0;
        for (byte b : data) {
            buffer = (buffer << 8) | (b & 0xFF);
            bitsLeft += 8;
            while (bitsLeft >= 5) {
                int index = (buffer >> (bitsLeft - 5)) & 0x1F;
                bitsLeft -= 5;
                sb.append(BASE32_ALPHABET.charAt(index));
            }
        }
        if (bitsLeft > 0) {
            int index = (buffer << (5 - bitsLeft)) & 0x1F;
            sb.append(BASE32_ALPHABET.charAt(index));
        }
        return sb.toString();
    }

    static byte[] base32Decode(String secret) {
        String normalized = secret.trim().toUpperCase().replace("=", "");
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        int buffer = 0;
        int bitsLeft = 0;
        for (int i = 0; i < normalized.length(); i++) {
            int value = BASE32_ALPHABET.indexOf(normalized.charAt(i));
            if (value < 0) {
                throw new IllegalArgumentException("Invalid Base32 character in TOTP secret");
            }
            buffer = (buffer << 5) | value;
            bitsLeft += 5;
            if (bitsLeft >= 8) {
                out.write((buffer >> (bitsLeft - 8)) & 0xFF);
                bitsLeft -= 8;
            }
        }
        return out.toByteArray();
    }
}
