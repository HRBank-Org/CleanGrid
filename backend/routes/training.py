"""
CleanGrid Training Module
Uber-style mandatory training system for workers (janitors)
- Video/reading content with progress tracking (no skipping)
- Quiz questions to qualify
- Credential tracking and eligibility checks
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timedelta
from bson import ObjectId
import os

router = APIRouter(prefix="/training", tags=["training"])

# ==================== MODELS ====================

class TrainingContent(BaseModel):
    """Individual content item (video or reading)"""
    id: str
    type: str  # 'video', 'document', 'reading'
    title: str
    description: Optional[str] = None
    url: str  # Video URL or document URL
    duration: int  # Duration in seconds (for videos) or estimated read time
    order: int  # Order in the course
    
class QuizQuestion(BaseModel):
    """Quiz question with multiple choice answers"""
    id: str
    question: str
    options: List[str]
    correctIndex: int  # Index of correct answer (0-based)
    explanation: Optional[str] = None

class TrainingCourse(BaseModel):
    """Training course definition"""
    id: str = Field(alias="_id")
    name: str
    description: str
    category: str  # 'sop', 'equipment', 'customer-service', 'safety'
    icon: str
    requiredForServices: List[str]  # Service IDs that require this training
    content: List[TrainingContent]
    quiz: List[QuizQuestion]
    passingScore: int  # Percentage needed to pass (e.g., 80)
    validityDays: int  # How long certification is valid (0 = forever)
    isActive: bool = True
    createdAt: datetime
    
    class Config:
        populate_by_name = True

class ContentProgress(BaseModel):
    """Track progress through content"""
    contentId: str
    watchedSeconds: int
    completed: bool
    completedAt: Optional[datetime] = None

class QuizAttempt(BaseModel):
    """Quiz attempt record"""
    answers: List[int]  # Index of selected answer for each question
    score: int  # Percentage score
    passed: bool
    attemptedAt: datetime

class WorkerTrainingProgress(BaseModel):
    """Worker's progress in a specific course"""
    workerId: str
    courseId: str
    contentProgress: List[ContentProgress]
    quizAttempts: List[QuizAttempt]
    isCompleted: bool
    completedAt: Optional[datetime] = None
    expiresAt: Optional[datetime] = None
    certificateId: Optional[str] = None

class WorkerCredential(BaseModel):
    """Verified credential for a worker"""
    id: str = Field(alias="_id")
    workerId: str
    credentialType: str  # 'internal' (CleanGrid training) or 'external' (HR Bank verified)
    courseName: str
    courseId: Optional[str] = None  # For internal trainings
    externalProvider: Optional[str] = None  # For external credentials
    issuedAt: datetime
    expiresAt: Optional[datetime] = None
    isValid: bool = True
    certificateUrl: Optional[str] = None
    verifiedBy: Optional[str] = None  # Admin or institute that verified
    
    class Config:
        populate_by_name = True

# ==================== REQUEST/RESPONSE MODELS ====================

class UpdateProgressRequest(BaseModel):
    courseId: str
    contentId: str
    watchedSeconds: int
    completed: bool = False

class SubmitQuizRequest(BaseModel):
    courseId: str
    answers: List[int]  # Index of selected answer for each question

class CreateCourseRequest(BaseModel):
    name: str
    description: str
    category: str
    icon: str
    requiredForServices: List[str] = []
    content: List[dict]
    quiz: List[dict]
    passingScore: int = 80
    validityDays: int = 365  # 1 year default

class AddExternalCredentialRequest(BaseModel):
    workerId: str
    courseName: str
    externalProvider: str
    issuedAt: datetime
    expiresAt: Optional[datetime] = None
    certificateUrl: Optional[str] = None
