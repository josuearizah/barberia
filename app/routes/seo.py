from datetime import datetime
from flask import Blueprint, Response, current_app, url_for
from xml.sax.saxutils import escape

seo_bp = Blueprint('seo', __name__)


@seo_bp.route('/robots.txt')
def robots_txt():
    lines = [
        "User-agent: *",
        "Allow: /",
        f"Sitemap: {url_for('seo.sitemap', _external=True)}"
    ]
    return Response("\n".join(lines), mimetype='text/plain')


@seo_bp.route('/sitemap.xml')
def sitemap():
    today = datetime.utcnow().date().isoformat()
    static_pages = [
        ('auth.index', 'weekly'),
        ('auth.login', 'monthly'),
        ('usuario.register', 'monthly'),
        ('estilos.pagina_estilos', 'monthly'),
    ]

    urls = []
    for endpoint, changefreq in static_pages:
        try:
            urls.append({
                'loc': url_for(endpoint, _external=True),
                'changefreq': changefreq,
                'lastmod': today
            })
        except Exception as exc:  # pragma: no cover - solo logging preventivo
            current_app.logger.warning('No se incluyó %s en el sitemap: %s', endpoint, exc)

    xml_lines = [
        "<?xml version='1.0' encoding='UTF-8'?>",
        "<urlset xmlns='https://www.sitemaps.org/schemas/sitemap/0.9'>"
    ]
    for url in urls:
        xml_lines.extend([
            "  <url>",
            f"    <loc>{escape(url['loc'])}</loc>",
            f"    <changefreq>{url['changefreq']}</changefreq>",
            f"    <lastmod>{url['lastmod']}</lastmod>",
            "  </url>"
        ])
    xml_lines.append("</urlset>")

    return Response("\n".join(xml_lines), mimetype='application/xml')


@seo_bp.route('/googlee73b57cd67bfb3d7.html')
def google_site_verification():
    """Serve Google Search Console verification file without storing it on disk."""
    content = "google-site-verification: googlee73b57cd67bfb3d7.html"
    return Response(content, mimetype='text/plain')
