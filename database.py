# database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# SQLite uchun (dev/test uchun qulay, fayl asosida ishlaydi)
SQLALCHEMY_DATABASE_URL = "postgresql://postgres:admin@localhost:5432/test_kara"


engine = create_engine(SQLALCHEMY_DATABASE_URL)  # connect_args YO'Q — PostgreSQL uchun kerak emas

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()