"""
File processing API endpoints.
"""

from typing import Optional, List
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks, Depends
from pydantic import BaseModel
from enum import Enum
import uuid
import io
from pathlib import Path
import json

# Import for text extraction
try:
    import PyPDF2
    HAS_PDF_SUPPORT = True
except ImportError:
    HAS_PDF_SUPPORT = False

try:
    from docx import Document
    HAS_DOCX_SUPPORT = True
except ImportError:
    HAS_DOCX_SUPPORT = False

from app.routing.privacy_scanner import PrivacyScanner
from app.routing.audit_logger import AuditLogger
from app.db import get_db
from app.services import session_store
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()
privacy_scanner = PrivacyScanner()
audit_logger = AuditLogger()


class FileStatus(str, Enum):
    UPLOADING = "uploading"
    PROCESSING = "processing"
    READY = "ready"
    ERROR = "error"


class FileMetadata(BaseModel):
    id: str
    filename: str
    original_name: str
    mime_type: str
    size: int
    status: FileStatus
    extracted_text: Optional[str] = None
    metadata: Optional[dict] = None
    is_sensitive: Optional[bool] = None
    pii_detected: Optional[bool] = None
    sensitivity_score: Optional[float] = None


class ProcessingResult(BaseModel):
    file_id: str
    status: FileStatus
    extracted_text: Optional[str] = None
    pages: Optional[int] = None
    entities: Optional[List[dict]] = None
    summary: Optional[str] = None


@router.post("/upload", response_model=FileMetadata)
async def upload_file(
    file: UploadFile = File(...),
    session_id: Optional[str] = Form(None),
    user_id: Optional[str] = Form(None),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a file for processing.
    Supports PDF, DOC, DOCX, images, audio, and video files.
    """
    # Validate file type
    allowed_types = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/png",
        "image/jpeg",
        "image/webp",
        "audio/mpeg",
        "audio/wav",
        "video/mp4",
        "text/plain",
    ]
    
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}",
        )
    
    # Generate file ID
    file_id = str(uuid.uuid4())
    
    # Read file content
    content = await file.read()
    
    # Persist file metadata tied to the session
    session_id = await session_store.ensure_session(db, session_id, user_id)
    await session_store.add_file(
        db,
        session_id=session_id,
        name=file.filename or "uploaded_file",
        mime_type=file.content_type,
        size=len(content),
        status=FileStatus.PROCESSING.value,
        file_id=file_id,
    )
    await db.commit()
    
    # Add background processing task
    background_tasks.add_task(process_file, file_id, content, file.content_type)
    
    return FileMetadata(
        id=file_id,
        filename=f"{file_id}_{file.filename}",
        original_name=file.filename or "unknown",
        mime_type=file.content_type or "application/octet-stream",
        size=len(content),
        status=FileStatus.PROCESSING,
    )


async def process_file(file_id: str, content: bytes, mime_type: str):
    """Background task to process uploaded file."""
    try:
        extracted_text = ""
        
        # Extract text based on file type
        if mime_type == "application/pdf" and HAS_PDF_SUPPORT:
            extracted_text = extract_text_from_pdf(content)
        elif mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document" and HAS_DOCX_SUPPORT:
            extracted_text = extract_text_from_docx(content)
        elif mime_type == "text/plain":
            extracted_text = content.decode('utf-8', errors='ignore')
        else:
            # For unsupported types, just mark as ready
            extracted_text = "[Binary file - no text extraction available]"
        
        # Scan for sensitive content
        if extracted_text and extracted_text != "[Binary file - no text extraction available]":
            scan_result = privacy_scanner.scan(extracted_text)
            
            # Log file processing with privacy scan results
            audit_logger.log_routing_decision(
                request_type="file_upload",
                content_hash=audit_logger.hash_content(extracted_text[:500]),
                is_sensitive=scan_result["is_sensitive"],
                routed_to="local" if scan_result["is_sensitive"] else "storage",
                pii_detected=scan_result["pii_detected"],
                document_type=scan_result["document_types"][0] if scan_result["document_types"] else None,
                metadata={
                    "file_id": file_id,
                    "mime_type": mime_type,
                    "sensitivity_score": scan_result["sensitivity_score"],
                }
            )
            
            # TODO: Store metadata in database with sensitivity info
            # For now, just log it
            print(f"File {file_id} processed:")
            print(f"  - Sensitive: {scan_result['is_sensitive']}")
            print(f"  - PII Detected: {scan_result['pii_detected']}")
            print(f"  - Sensitivity Score: {scan_result['sensitivity_score']}")
            print(f"  - Text Length: {len(extracted_text)} chars")
            
    except Exception as e:
        # Log error and update status
        print(f"Error processing file {file_id}: {str(e)}")


def extract_text_from_pdf(content: bytes) -> str:
    """Extract text from PDF file."""
    try:
        pdf_file = io.BytesIO(content)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        print(f"Error extracting PDF text: {str(e)}")
        return ""


def extract_text_from_docx(content: bytes) -> str:
    """Extract text from DOCX file."""
    try:
        docx_file = io.BytesIO(content)
        doc = Document(docx_file)
        text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
        return text.strip()
    except Exception as e:
        print(f"Error extracting DOCX text: {str(e)}")
        return ""


@router.get("/{file_id}", response_model=FileMetadata)
async def get_file(file_id: str):
    """Get file metadata and processing status."""
    # TODO: Fetch from database
    raise HTTPException(status_code=404, detail="File not found")


@router.get("/{file_id}/content")
async def get_file_content(file_id: str):
    """Get extracted text content from a processed file."""
    # TODO: Fetch from database
    raise HTTPException(status_code=404, detail="File not found")


@router.post("/{file_id}/ocr", response_model=ProcessingResult)
async def trigger_ocr(file_id: str):
    """Trigger OCR processing for an image or scanned document."""
    # TODO: Implement OCR processing
    raise HTTPException(status_code=501, detail="Not implemented")


@router.post("/{file_id}/embed")
async def generate_embeddings(file_id: str):
    """Generate vector embeddings for a processed file."""
    # TODO: Implement embedding generation
    raise HTTPException(status_code=501, detail="Not implemented")


@router.delete("/{file_id}")
async def delete_file(file_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a file and its associated data."""
    deleted = await session_store.delete_file(db, file_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="File not found")
    await db.commit()
    return {"status": "deleted", "file_id": file_id}
