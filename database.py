# database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# SQLite uchun (dev/test uchun qulay, fayl asosida ishlaydi)
SQLALCHEMY_DATABASE_URL = "postgresql://neondb_owner:npg_veCdoL75rJYR@ep-silent-tree-atnkuos8-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"


engine = create_engine(SQLALCHEMY_DATABASE_URL)  # connect_args YO'Q — PostgreSQL uchun kerak emas

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()