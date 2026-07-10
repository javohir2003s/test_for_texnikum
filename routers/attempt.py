# routers/attempt.py
import random
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
import models, schemas
from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/attempts", tags=["attempts"])

QUESTIONS_PER_TEST = 20


@router.post("/start", response_model=dict)
def start_attempt(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    total_questions = db.query(models.Question).count()
    if total_questions < QUESTIONS_PER_TEST:
        raise HTTPException(400, "Bazada yetarli savol yo'q")

    # random 20 ta savol tanlaymiz (PostgreSQL uchun samarali usul)
    random_questions = (
        db.query(models.Question)
        .order_by(func.random())
        .limit(QUESTIONS_PER_TEST)
        .all()
    )

    attempt = models.Attempt(user_id=user.id)
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    # tanlangan savollarni shu attempt'ga biriktiramiz
    for index, question in enumerate(random_questions, start=1):
        db.add(models.AttemptQuestion(
            attempt_id=attempt.id,
            question_id=question.id,
            order_index=index,
        ))
    db.commit()

    return {"attempt_id": attempt.id, "total_questions": QUESTIONS_PER_TEST}


@router.get("/{attempt_id}/questions", response_model=list[schemas.QuestionOut])
def get_attempt_questions(
    attempt_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    attempt = db.query(models.Attempt).filter_by(id=attempt_id, user_id=user.id).first()
    if not attempt:
        raise HTTPException(404, "Attempt topilmadi")

    # shu attempt'ga biriktirilgan savollarni tartib bo'yicha olamiz
    questions = (
        db.query(models.Question)
        .join(models.AttemptQuestion, models.AttemptQuestion.question_id == models.Question.id)
        .filter(models.AttemptQuestion.attempt_id == attempt_id)
        .order_by(models.AttemptQuestion.order_index)
        .all()
    )
    return questions


@router.post("/{attempt_id}/answer", response_model=schemas.AnswerResult)
def submit_answer(
    attempt_id: int,
    payload: schemas.AnswerSubmit,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    attempt = db.query(models.Attempt).filter_by(id=attempt_id, user_id=user.id).first()
    if not attempt:
        raise HTTPException(404, "Attempt topilmadi")

    # savol shu attempt'ga tegishlimi tekshiramiz (boshqa savolga javob berib yubormasin)
    belongs = db.query(models.AttemptQuestion).filter_by(
        attempt_id=attempt_id, question_id=payload.question_id
    ).first()
    if not belongs:
        raise HTTPException(400, "Bu savol shu attempt'ga tegishli emas")

    exists = db.query(models.AttemptAnswer).filter_by(
        attempt_id=attempt_id, question_id=payload.question_id
    ).first()
    if exists:
        raise HTTPException(400, "Bu savolga allaqachon javob berilgan")

    choice = db.query(models.Choice).filter_by(id=payload.choice_id).first()
    if not choice or choice.question_id != payload.question_id:
        raise HTTPException(400, "Noto'g'ri choice_id")

    is_correct = choice.is_correct
    correct_choice = db.query(models.Choice).filter_by(
        question_id=payload.question_id, is_correct=True
    ).first()

    db.add(models.AttemptAnswer(
        attempt_id=attempt_id,
        question_id=payload.question_id,
        choice_id=payload.choice_id,
        is_correct=is_correct,
    ))

    attempt.total += 1
    if is_correct:
        attempt.score += 1

    db.commit()

    return schemas.AnswerResult(is_correct=is_correct, correct_choice_id=correct_choice.id)


@router.get("/{attempt_id}/result", response_model=schemas.AttemptResult)
def get_result(attempt_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    attempt = db.query(models.Attempt).filter_by(id=attempt_id, user_id=user.id).first()
    if not attempt:
        raise HTTPException(404, "Attempt topilmadi")
    return schemas.AttemptResult(
        score=attempt.score,
        total=attempt.total,
        percentage=round(attempt.score / attempt.total * 100, 1) if attempt.total else 0,
    )