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


# ==================== DATABASE ACCESS ====================
# These will be injected from main server.py

db = None

def init_db(database):
    global db
    db = database


# ==================== API ENDPOINTS ====================

@router.get("/courses")
async def get_training_courses(category: Optional[str] = None):
    """Get all available training courses"""
    query = {"isActive": True}
    if category:
        query["category"] = category
    
    courses = await db.training_courses.find(query).to_list(100)
    
    # Convert ObjectId to string
    for course in courses:
        course["_id"] = str(course["_id"])
    
    return courses


@router.get("/courses/{course_id}")
async def get_course_detail(course_id: str):
    """Get detailed course content"""
    course = await db.training_courses.find_one({"_id": ObjectId(course_id)})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    course["_id"] = str(course["_id"])
    return course


@router.get("/my-progress")
async def get_my_training_progress(worker_id: str):
    """Get worker's progress across all courses"""
    # Get all progress records for this worker
    progress_records = await db.worker_training_progress.find(
        {"workerId": worker_id}
    ).to_list(100)
    
    # Get all credentials
    credentials = await db.worker_credentials.find(
        {"workerId": worker_id, "isValid": True}
    ).to_list(100)
    
    # Get all courses to show overall status
    courses = await db.training_courses.find({"isActive": True}).to_list(100)
    
    result = []
    for course in courses:
        course_id = str(course["_id"])
        progress = next((p for p in progress_records if p["courseId"] == course_id), None)
        credential = next((c for c in credentials if c.get("courseId") == course_id), None)
        
        result.append({
            "courseId": course_id,
            "courseName": course["name"],
            "category": course["category"],
            "icon": course["icon"],
            "totalContent": len(course.get("content", [])),
            "completedContent": len([c for c in (progress.get("contentProgress", []) if progress else []) if c.get("completed")]),
            "quizPassed": progress.get("isCompleted", False) if progress else False,
            "bestQuizScore": max([a.get("score", 0) for a in (progress.get("quizAttempts", []) if progress else [])], default=0),
            "isCompleted": progress.get("isCompleted", False) if progress else False,
            "completedAt": progress.get("completedAt") if progress else None,
            "expiresAt": progress.get("expiresAt") if progress else None,
            "hasValidCredential": credential is not None and (
                credential.get("expiresAt") is None or 
                credential.get("expiresAt") > datetime.utcnow()
            ) if credential else False
        })
    
    return result


@router.get("/my-progress/{course_id}")
async def get_course_progress(course_id: str, worker_id: str):
    """Get detailed progress for a specific course"""
    progress = await db.worker_training_progress.find_one({
        "workerId": worker_id,
        "courseId": course_id
    })
    
    if not progress:
        # Return empty progress
        return {
            "workerId": worker_id,
            "courseId": course_id,
            "contentProgress": [],
            "quizAttempts": [],
            "isCompleted": False
        }
    
    progress["_id"] = str(progress["_id"])
    return progress


@router.post("/progress")
async def update_content_progress(request: UpdateProgressRequest, worker_id: str):
    """
    Update progress on a specific content item.
    Enforces no-skip rule: content must be watched/read for required duration.
    """
    # Get the course to validate content
    course = await db.training_courses.find_one({"_id": ObjectId(request.courseId)})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Find the content item
    content_item = next(
        (c for c in course.get("content", []) if c["id"] == request.contentId), 
        None
    )
    if not content_item:
        raise HTTPException(status_code=404, detail="Content not found")
    
    # Check if enough time has been spent (anti-skip measure)
    # Allow completion only if watched at least 90% of duration
    min_required = int(content_item["duration"] * 0.9)
    can_complete = request.watchedSeconds >= min_required
    
    # Get or create progress record
    progress = await db.worker_training_progress.find_one({
        "workerId": worker_id,
        "courseId": request.courseId
    })
    
    if not progress:
        progress = {
            "workerId": worker_id,
            "courseId": request.courseId,
            "contentProgress": [],
            "quizAttempts": [],
            "isCompleted": False
        }
    
    # Update content progress
    content_progress = progress.get("contentProgress", [])
    existing = next((c for c in content_progress if c["contentId"] == request.contentId), None)
    
    if existing:
        existing["watchedSeconds"] = max(existing["watchedSeconds"], request.watchedSeconds)
        if can_complete and request.completed and not existing.get("completed"):
            existing["completed"] = True
            existing["completedAt"] = datetime.utcnow()
    else:
        content_progress.append({
            "contentId": request.contentId,
            "watchedSeconds": request.watchedSeconds,
            "completed": can_complete and request.completed,
            "completedAt": datetime.utcnow() if (can_complete and request.completed) else None
        })
    
    progress["contentProgress"] = content_progress
    
    # Save progress
    if "_id" in progress:
        await db.worker_training_progress.update_one(
            {"_id": progress["_id"]},
            {"$set": progress}
        )
    else:
        await db.worker_training_progress.insert_one(progress)
    
    # Check if all content is completed
    all_content_ids = [c["id"] for c in course.get("content", [])]
    completed_ids = [c["contentId"] for c in content_progress if c.get("completed")]
    all_content_done = all(cid in completed_ids for cid in all_content_ids)
    
    return {
        "success": True,
        "contentId": request.contentId,
        "watchedSeconds": request.watchedSeconds,
        "completed": can_complete and request.completed,
        "allContentCompleted": all_content_done,
        "canTakeQuiz": all_content_done,
        "message": "Progress saved" if can_complete else f"Watch at least {min_required} seconds to complete"
    }


@router.post("/quiz/submit")
async def submit_quiz(request: SubmitQuizRequest, worker_id: str):
    """
    Submit quiz answers and get results.
    Must have completed all content before taking quiz.
    """
    # Get course
    course = await db.training_courses.find_one({"_id": ObjectId(request.courseId)})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Get progress
    progress = await db.worker_training_progress.find_one({
        "workerId": worker_id,
        "courseId": request.courseId
    })
    
    if not progress:
        raise HTTPException(status_code=400, detail="No progress found. Complete content first.")
    
    # Verify all content is completed
    all_content_ids = [c["id"] for c in course.get("content", [])]
    completed_ids = [c["contentId"] for c in progress.get("contentProgress", []) if c.get("completed")]
    
    if not all(cid in completed_ids for cid in all_content_ids):
        raise HTTPException(
            status_code=400, 
            detail="Complete all training content before taking the quiz"
        )
    
    # Grade the quiz
    quiz = course.get("quiz", [])
    if len(request.answers) != len(quiz):
        raise HTTPException(status_code=400, detail="Answer count doesn't match question count")
    
    correct = 0
    results = []
    for i, (question, answer) in enumerate(zip(quiz, request.answers)):
        is_correct = answer == question["correctIndex"]
        if is_correct:
            correct += 1
        results.append({
            "questionId": question["id"],
            "selectedAnswer": answer,
            "correctAnswer": question["correctIndex"],
            "isCorrect": is_correct,
            "explanation": question.get("explanation")
        })
    
    score = int((correct / len(quiz)) * 100) if quiz else 100
    passing_score = course.get("passingScore", 80)
    passed = score >= passing_score
    
    # Record attempt
    quiz_attempt = {
        "answers": request.answers,
        "score": score,
        "passed": passed,
        "attemptedAt": datetime.utcnow()
    }
    
    quiz_attempts = progress.get("quizAttempts", [])
    quiz_attempts.append(quiz_attempt)
    
    update_data = {"quizAttempts": quiz_attempts}
    
    # If passed, mark course as completed and issue credential
    if passed and not progress.get("isCompleted"):
        validity_days = course.get("validityDays", 365)
        expires_at = datetime.utcnow() + timedelta(days=validity_days) if validity_days > 0 else None
        
        update_data["isCompleted"] = True
        update_data["completedAt"] = datetime.utcnow()
        update_data["expiresAt"] = expires_at
        
        # Issue credential
        credential = {
            "workerId": worker_id,
            "credentialType": "internal",
            "courseName": course["name"],
            "courseId": request.courseId,
            "issuedAt": datetime.utcnow(),
            "expiresAt": expires_at,
            "isValid": True,
            "verifiedBy": "CleanGrid Training System"
        }
        credential_result = await db.worker_credentials.insert_one(credential)
        update_data["certificateId"] = str(credential_result.inserted_id)
    
    await db.worker_training_progress.update_one(
        {"_id": progress["_id"]},
        {"$set": update_data}
    )
    
    return {
        "score": score,
        "passingScore": passing_score,
        "passed": passed,
        "correctCount": correct,
        "totalQuestions": len(quiz),
        "results": results,
        "isNowCertified": passed and not progress.get("isCompleted"),
        "message": "Congratulations! You are now certified." if passed else f"Score {score}% - need {passing_score}% to pass. Please review and try again."
    }


@router.get("/credentials/{worker_id}")
async def get_worker_credentials(worker_id: str):
    """Get all credentials for a worker (internal + external)"""
    credentials = await db.worker_credentials.find({
        "workerId": worker_id
    }).to_list(100)
    
    for cred in credentials:
        cred["_id"] = str(cred["_id"])
        # Check if expired
        if cred.get("expiresAt") and cred["expiresAt"] < datetime.utcnow():
            cred["isValid"] = False
            cred["status"] = "expired"
        elif cred.get("isValid"):
            cred["status"] = "valid"
        else:
            cred["status"] = "revoked"
    
    return credentials


@router.get("/eligibility/{worker_id}")
async def check_worker_eligibility(worker_id: str, service_id: Optional[str] = None):
    """
    Check if a worker is eligible to work (has all required credentials).
    Can check for a specific service or overall eligibility.
    """
    # Get worker's valid credentials
    credentials = await db.worker_credentials.find({
        "workerId": worker_id,
        "isValid": True
    }).to_list(100)
    
    # Filter out expired credentials
    valid_credentials = []
    for cred in credentials:
        if cred.get("expiresAt") is None or cred["expiresAt"] > datetime.utcnow():
            valid_credentials.append(cred)
    
    valid_course_ids = [c.get("courseId") for c in valid_credentials if c.get("courseId")]
    
    # Get required courses
    if service_id:
        # Check for specific service
        required_courses = await db.training_courses.find({
            "isActive": True,
            "requiredForServices": service_id
        }).to_list(100)
    else:
        # Get all mandatory courses (those with no specific service = required for all)
        required_courses = await db.training_courses.find({
            "isActive": True,
            "$or": [
                {"requiredForServices": {"$size": 0}},
                {"requiredForServices": {"$exists": False}}
            ]
        }).to_list(100)
    
    # Check which are missing
    missing = []
    completed = []
    for course in required_courses:
        course_id = str(course["_id"])
        if course_id in valid_course_ids:
            completed.append({
                "courseId": course_id,
                "courseName": course["name"],
                "status": "completed"
            })
        else:
            missing.append({
                "courseId": course_id,
                "courseName": course["name"],
                "category": course["category"],
                "status": "required"
            })
    
    is_eligible = len(missing) == 0
    
    return {
        "workerId": worker_id,
        "isEligible": is_eligible,
        "completedTrainings": completed,
        "missingTrainings": missing,
        "totalRequired": len(required_courses),
        "totalCompleted": len(completed),
        "message": "Worker is eligible for assignments" if is_eligible else f"Worker needs to complete {len(missing)} required training(s)"
    }


# ==================== ADMIN ENDPOINTS ====================

@router.post("/admin/courses")
async def create_course(request: CreateCourseRequest):
    """Admin: Create a new training course"""
    # Generate IDs for content and quiz items
    content_with_ids = []
    for i, item in enumerate(request.content):
        item["id"] = f"content_{i+1}"
        item["order"] = i + 1
        content_with_ids.append(item)
    
    quiz_with_ids = []
    for i, item in enumerate(request.quiz):
        item["id"] = f"quiz_{i+1}"
        quiz_with_ids.append(item)
    
    course = {
        "name": request.name,
        "description": request.description,
        "category": request.category,
        "icon": request.icon,
        "requiredForServices": request.requiredForServices,
        "content": content_with_ids,
        "quiz": quiz_with_ids,
        "passingScore": request.passingScore,
        "validityDays": request.validityDays,
        "isActive": True,
        "createdAt": datetime.utcnow()
    }
    
    result = await db.training_courses.insert_one(course)
    
    return {
        "success": True,
        "courseId": str(result.inserted_id),
        "message": f"Course '{request.name}' created successfully"
    }


@router.post("/admin/external-credential")
async def add_external_credential(request: AddExternalCredentialRequest, verified_by: str = "Admin"):
    """
    Admin/Institute: Add an external credential for a worker.
    Used for credentials from external training providers (e.g., Chemical Safety from HR Bank institutes).
    """
    credential = {
        "workerId": request.workerId,
        "credentialType": "external",
        "courseName": request.courseName,
        "externalProvider": request.externalProvider,
        "issuedAt": request.issuedAt,
        "expiresAt": request.expiresAt,
        "isValid": True,
        "certificateUrl": request.certificateUrl,
        "verifiedBy": verified_by,
        "addedAt": datetime.utcnow()
    }
    
    result = await db.worker_credentials.insert_one(credential)
    
    return {
        "success": True,
        "credentialId": str(result.inserted_id),
        "message": f"External credential '{request.courseName}' added for worker"
    }


@router.delete("/admin/credentials/{credential_id}")
async def revoke_credential(credential_id: str, reason: str = "Revoked by admin"):
    """Admin: Revoke a credential"""
    result = await db.worker_credentials.update_one(
        {"_id": ObjectId(credential_id)},
        {"$set": {
            "isValid": False,
            "revokedAt": datetime.utcnow(),
            "revokeReason": reason
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Credential not found")
    
    return {"success": True, "message": "Credential revoked"}

