package com.eqms.signatures;

import com.eqms.shared.constants.SignatureMeaning;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Persists {@link SignatureMeaning} as its controlled-vocabulary <em>label</em>
 * (e.g. {@code Approved}), matching the {@code ck_esig_meaning} DB CHECK constraint and the
 * human-readable manifestation required by CLAUDE.md rule 4. Using a converter rather than
 * {@code @Enumerated(STRING)} (which would store {@code APPROVED}) keeps Java and DB in lockstep.
 */
@Converter(autoApply = false)
public class SignatureMeaningConverter implements AttributeConverter<SignatureMeaning, String> {

    @Override
    public String convertToDatabaseColumn(SignatureMeaning meaning) {
        return meaning == null ? null : meaning.label();
    }

    @Override
    public SignatureMeaning convertToEntityAttribute(String dbValue) {
        return dbValue == null ? null : SignatureMeaning.fromLabel(dbValue);
    }
}
