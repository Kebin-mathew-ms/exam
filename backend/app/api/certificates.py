from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session, joinedload
from typing import List
import io

from app.database.session import get_db
from app.auth.dependencies import get_current_active_user, RoleChecker
from app.models.result import Result, Certificate
from app.models.domain import User
from app.services.certificate_service import CertificateService
from app.schemas.schemas import ApiResponse

router = APIRouter(prefix="/certificates", tags=["Certificates Manager"])

any_auth = get_current_active_user
admin_access = RoleChecker(["admin", "super_admin"])

@router.get("")
def list_certificates(
    db: Session = Depends(get_db),
    current_user: User = Depends(any_auth)
):
    """Retrieve list of generated certificates (students only see their own)."""
    query = db.query(Certificate).options(
        joinedload(Certificate.student),
        joinedload(Certificate.exam),
        joinedload(Certificate.result)
    )

    if current_user.role_id == 2:  # Student
        query = query.filter(Certificate.student_id == current_user.id)

    certs = query.all()
    data = []
    for c in certs:
        data.append({
            "id": c.id,
            "certificate_number": c.certificate_number,
            "certificate_type": c.certificate_type,
            "student_name": f"{c.student.first_name} {c.student.last_name}",
            "exam_name": c.exam.name,
            "issue_date": c.issue_date,
            "grade": c.result.grade,
            "score": float(c.result.final_score)
        })

    return ApiResponse(
        success=True,
        message="Certificates loaded successfully",
        data=data
    )

@router.get("/download/{cert_id}")
def download_certificate_pdf(
    cert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(any_auth)
):
    """Generate and stream ReportLab certificate PDF document on the fly."""
    cert = db.query(Certificate).options(
        joinedload(Certificate.student),
        joinedload(Certificate.exam),
        joinedload(Certificate.result)
    ).filter(Certificate.id == cert_id).first()

    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")

    if current_user.role_id == 2 and cert.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden. Access restricted.")

    student_name = f"{cert.student.first_name} {cert.student.last_name}"
    
    # Compile PDF
    pdf_bytes = CertificateService.compile_certificate_pdf(
        student_name=student_name,
        exam_name=cert.exam.name,
        score=float(cert.result.final_score),
        grade=cert.result.grade,
        rank=cert.result.exam_rank or 1,
        cert_number=cert.certificate_number
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=certificate_{cert.certificate_number}.pdf"}
    )

@router.get("/verify/{certificate_number}")
def verify_certificate_authenticity(
    certificate_number: str,
    db: Session = Depends(get_db)
):
    """Verify certificate number matches its HMAC digital signature preventing forgery."""
    cert = db.query(Certificate).options(
        joinedload(Certificate.student),
        joinedload(Certificate.exam),
        joinedload(Certificate.result)
    ).filter(Certificate.certificate_number == certificate_number).first()

    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found in database registry.")

    # Re-calculate and compare signature
    expected_sig = CertificateService.generate_verification_signature(certificate_number)
    
    if cert.digital_signature != expected_sig:
        return ApiResponse(
            success=False,
            message="Warning! Certificate signature mismatch. Tampering detected.",
            data={"verified": False}
        )

    return ApiResponse(
        success=True,
        message="Success! Certificate digitally verified and authentic.",
        data={
            "verified": True,
            "student_name": f"{cert.student.first_name} {cert.student.last_name}",
            "exam_name": cert.exam.name,
            "grade": cert.result.grade,
            "issue_date": cert.issue_date
        }
    )
