package com.eqms.notifications;

/**
 * Builds HTML email bodies for eQMS notifications. Pure Java — no template engine dependency.
 * Each notification type gets a consistent branded layout with a clear call-to-action link.
 */
public final class EmailTemplateBuilder {

    private EmailTemplateBuilder() {}

    public static String build(String recipientName, String title, String body, String recordUrl) {
        String ctaSection = recordUrl != null
                ? "<tr><td style='padding:24px 32px 0;'>"
                  + "<a href='" + recordUrl + "' style='"
                  + "display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;"
                  + "padding:12px 28px;border-radius:6px;font-size:14px;font-weight:600;'>View in eQMS</a>"
                  + "</td></tr>"
                : "";

        return "<!DOCTYPE html><html><head><meta charset='UTF-8'></head><body style='"
                + "margin:0;padding:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;'>"
                + "<table width='100%' cellpadding='0' cellspacing='0' role='presentation'><tr><td>"
                + "<table width='600' cellpadding='0' cellspacing='0' role='presentation' align='center'"
                + " style='margin:32px auto;background:#fff;border-radius:8px;"
                + "box-shadow:0 1px 4px rgba(0,0,0,.1);overflow:hidden;'>"
                // Header bar
                + "<tr><td style='background:#1d4ed8;padding:20px 32px;'>"
                + "<span style='color:#fff;font-size:18px;font-weight:700;letter-spacing:.5px;'>eQMS</span>"
                + "<span style='color:#93c5fd;font-size:12px;margin-left:8px;'>Quality Management System</span>"
                + "</td></tr>"
                // Greeting
                + "<tr><td style='padding:32px 32px 8px;'>"
                + "<p style='margin:0;font-size:15px;color:#374151;'>Hi <strong>"
                + escapeHtml(recipientName) + "</strong>,</p>"
                + "</td></tr>"
                // Title
                + "<tr><td style='padding:16px 32px 0;'>"
                + "<h2 style='margin:0;font-size:18px;color:#111827;line-height:1.4;'>"
                + escapeHtml(title) + "</h2>"
                + "</td></tr>"
                // Body
                + "<tr><td style='padding:12px 32px 0;'>"
                + "<p style='margin:0;font-size:14px;color:#4b5563;line-height:1.7;'>"
                + escapeHtml(body) + "</p>"
                + "</td></tr>"
                // CTA
                + ctaSection
                // Footer
                + "<tr><td style='padding:32px 32px 24px;border-top:1px solid #e5e7eb;margin-top:24px;'>"
                + "<p style='margin:0;font-size:12px;color:#9ca3af;'>"
                + "This is an automated notification from your eQMS. Do not reply to this email.<br>"
                + "You are receiving this because an action in the system requires your attention.</p>"
                + "</td></tr>"
                + "</table></td></tr></table></body></html>";
    }

    private static String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                   .replace("\"", "&quot;").replace("'", "&#x27;");
    }
}
