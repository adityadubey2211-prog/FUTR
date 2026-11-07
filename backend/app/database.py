
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = "sqlite:///./futr.db" # Database location

engine = create_engine(  # database coonection is created
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker( #here database session is created
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base() #database model parent

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        