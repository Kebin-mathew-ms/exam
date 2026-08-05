import io
import hmac
import hashlib
import uuid
from datetime import datetime
from reportlab.lib.pagesizes import letter, landscape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.graphics.shapes import Drawing, Rect, String, Line

from app.config.settings import settings

class CertificateService:
    """Service generating digitally-signed official exam certificates in PDF format."""

    @staticmethod
    def generate_verification_signature(certificate_number: str) -> str:
        """Sign unique cert identifier using secret system HMAC key to prevent forgery."""
        secret_key = settings.SECRET_KEY.encode('utf-8')
        sig = hmac.new(secret_key, certificate_number.encode('utf-8'), hashlib.sha256)
        return sig.hexdigest()

    @staticmethod
    def compile_certificate_pdf(
        student_name: str,
        exam_name: str,
        score: float,
        grade: str,
        rank: int,
        cert_number: str
    ) -> bytes:
        """Draw certificate border design templates, sign verification tokens, and return PDF stream."""
        buffer = io.BytesIO()
        
        # Build landscape page template
        doc = SimpleDocTemplate(
            buffer,
            pagesize=landscape(letter),
            rightMargin=40,
            leftMargin=40,
            topMargin=40,
            bottomMargin=40
        )
        
        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle(
            name='CertTitle',
            parent=styles['Normal'],
            fontSize=28,
            leading=34,
            textColor=colors.HexColor('#4F46E5'),  # Primary Indigo
            alignment=1, # Center
            fontName='Helvetica-Bold'
        )

        subtitle_style = ParagraphStyle(
            name='CertSubtitle',
            parent=styles['Normal'],
            fontSize=14,
            alignment=1,
            textColor=colors.HexColor('#475569'),
            spaceBefore=15
        )

        name_style = ParagraphStyle(
            name='CertName',
            parent=styles['Normal'],
            fontSize=22,
            alignment=1,
            textColor=colors.HexColor('#0F172A'),
            fontName='Helvetica-Bold',
            spaceBefore=20,
            spaceAfter=20
        )

        body_style = ParagraphStyle(
            name='CertBody',
            parent=styles['Normal'],
            fontSize=12,
            alignment=1,
            textColor=colors.HexColor('#334155'),
            leading=18
        )

        footer_style = ParagraphStyle(
            name='CertFooter',
            parent=styles['Normal'],
            fontSize=8,
            alignment=1,
            textColor=colors.HexColor('#94A3B8'),
            spaceBefore=25
        )

        story = []
        
        # Add decorative layout elements
        story.append(Spacer(1, 40))
        story.append(Paragraph("CERTIFICATE OF EXCELLENCE", title_style))
        story.append(Paragraph("This is proudly presented to", subtitle_style))
        story.append(Paragraph(student_name, name_style))
        
        body_text = (
            f"for successfully completing the online examination <b>{exam_name}</b><br/>"
            f"obtaining a final score of <b>{score} marks</b>, achieving Grade <b>{grade}</b>, "
            f"and securing Rank <b>{rank}</b>."
        )
        story.append(Paragraph(body_text, body_style))
        
        story.append(Spacer(1, 30))
        story.append(Paragraph(f"Certificate Number: {cert_number} | Issued on: {datetime.now().strftime('%Y-%m-%d')}", footer_style))
        story.append(Paragraph(f"Secure Verification Token: {CertificateService.generate_verification_signature(cert_number)[:32]}", footer_style))
        
        doc.build(story)
        
        pdf_bytes = buffer.getvalue()
        return pdf_bytes
