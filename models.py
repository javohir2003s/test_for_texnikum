# models.py
from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, DateTime, func
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime, timezone


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)

class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True)
    text = Column(String)
    choices = relationship("Choice", back_populates="question")

class Choice(Base):
    __tablename__ = "choices"
    id = Column(Integer, primary_key=True)
    question_id = Column(Integer, ForeignKey("questions.id"))
    text = Column(String)
    is_correct = Column(Boolean, default=False)
    question = relationship("Question", back_populates="choices")

class Attempt(Base):
    __tablename__ = "attempts"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    score = Column(Integer, default=0)
    total = Column(Integer, default=0)

class AttemptQuestion(Base):
    """Har bir attempt uchun random tanlangan 20 ta savol shu yerda saqlanadi"""
    __tablename__ = "attempt_questions"
    id = Column(Integer, primary_key=True)
    attempt_id = Column(Integer, ForeignKey("attempts.id"))
    question_id = Column(Integer, ForeignKey("questions.id"))
    order_index = Column(Integer)  # savol tartibi (1, 2, 3... 20)

class AttemptAnswer(Base):
    __tablename__ = "attempt_answers"
    id = Column(Integer, primary_key=True)
    attempt_id = Column(Integer, ForeignKey("attempts.id"))
    question_id = Column(Integer, ForeignKey("questions.id"))
    choice_id = Column(Integer, ForeignKey("choices.id"))
    is_correct = Column(Boolean)