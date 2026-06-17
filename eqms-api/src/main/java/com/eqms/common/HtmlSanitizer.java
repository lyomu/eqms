package com.eqms.common;

import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class HtmlSanitizer {

    private static final Set<String> ALLOWED_TAGS = Set.of(
            "p", "br", "div", "span", "strong", "b", "em", "i", "u", "s",
            "ul", "ol", "li", "blockquote", "table", "thead", "tbody", "tr", "th", "td",
            "a", "hr", "h2", "h3"
    );
    private static final Pattern TAG_PATTERN = Pattern.compile("<(/?)([a-zA-Z0-9]+)([^>]*)>");
    private static final Pattern HREF_PATTERN = Pattern.compile("href\\s*=\\s*(['\"])(.*?)\\1", Pattern.CASE_INSENSITIVE);

    private HtmlSanitizer() {
    }

    public static String sanitize(String html) {
        if (html == null || html.isBlank()) {
            return html;
        }
        String withoutDangerousBlocks = html
                .replaceAll("(?is)<script[^>]*>.*?</script>", "")
                .replaceAll("(?is)<style[^>]*>.*?</style>", "")
                .replaceAll("(?is)<iframe[^>]*>.*?</iframe>", "")
                .replaceAll("(?is)<object[^>]*>.*?</object>", "")
                .replaceAll("(?is)<embed[^>]*>.*?</embed>", "");

        Matcher matcher = TAG_PATTERN.matcher(withoutDangerousBlocks);
        StringBuilder out = new StringBuilder();
        while (matcher.find()) {
            String closing = matcher.group(1);
            String tag = matcher.group(2).toLowerCase();
            String replacement = "";
            if (ALLOWED_TAGS.contains(tag)) {
                if ("a".equals(tag) && closing.isBlank()) {
                    replacement = sanitizedLinkTag(matcher.group(3));
                } else if (closing.isBlank()) {
                    replacement = "<" + tag + ">";
                } else {
                    replacement = "</" + tag + ">";
                }
            }
            matcher.appendReplacement(out, Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(out);
        return out.toString();
    }

    private static String sanitizedLinkTag(String attrs) {
        Matcher href = HREF_PATTERN.matcher(attrs == null ? "" : attrs);
        if (!href.find()) {
            return "<a>";
        }
        String url = href.group(2).trim();
        String lower = url.toLowerCase();
        if (!(lower.startsWith("https://") || lower.startsWith("http://") || lower.startsWith("mailto:"))) {
            return "<a>";
        }
        return "<a href=\"" + escapeAttribute(url) + "\" target=\"_blank\" rel=\"noopener noreferrer\">";
    }

    private static String escapeAttribute(String value) {
        return value.replace("&", "&amp;").replace("\"", "&quot;").replace("<", "&lt;");
    }
}
