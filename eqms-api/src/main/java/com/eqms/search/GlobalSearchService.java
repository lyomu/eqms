package com.eqms.search;

import java.util.List;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class GlobalSearchService {

    private final JdbcTemplate jdbc;

    public GlobalSearchService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<GlobalSearchResult> search(String query) {
        String term = query == null ? "" : query.trim();
        if (term.length() < 2) {
            return List.of();
        }
        String like = "%" + term.toLowerCase() + "%";
        return jdbc.query("""
                select * from (
                  select 'Documents' module, 'Document' record_type, id, document_number number, title, status,
                         '/documents/' || id url, updated_at
                  from documents
                  where deleted_at is null and (lower(document_number) like ? or lower(title) like ? or lower(coalesce(content,'')) like ?)
                  union all
                  select 'CAPA', 'CAPA', id, capa_number, title, capa_status,
                         '/capa/' || id, updated_at
                  from capas
                  where deleted_at is null and (lower(capa_number) like ? or lower(title) like ? or lower(coalesce(description,'')) like ?)
                  union all
                  select 'Training', 'Training', id, training_code, title, case when active then 'ACTIVE' else 'INACTIVE' end,
                         '/training/' || id, updated_at
                  from training_programs
                  where deleted_at is null and (lower(training_code) like ? or lower(title) like ? or lower(coalesce(content,'')) like ?)
                  union all
                  select 'Deviations', 'Deviation', id, deviation_number, title, deviation_status,
                         '/deviations/' || id, updated_at
                  from deviations
                  where deleted_at is null and (lower(deviation_number) like ? or lower(title) like ? or lower(coalesce(description,'')) like ?)
                  union all
                  select 'Products', 'Product', id, product_code, name, status,
                         '/products/' || id, updated_at
                  from products
                  where deleted_at is null and (lower(product_code) like ? or lower(name) like ? or lower(coalesce(description,'')) like ?)
                ) results
                order by updated_at desc
                limit 50
                """, (rs, rowNum) -> new GlobalSearchResult(
                        rs.getString("module"),
                        rs.getString("record_type"),
                        rs.getLong("id"),
                        rs.getString("number"),
                        rs.getString("title"),
                        rs.getString("status"),
                        rs.getString("url"),
                        rs.getTimestamp("updated_at").toInstant()
                ), like, like, like, like, like, like, like, like, like, like, like, like, like, like, like);
    }
}
