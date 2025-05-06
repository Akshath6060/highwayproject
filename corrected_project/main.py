from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, timedelta
# import jwt
from passlib.context import CryptContext
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import json

# MySQL Database setup
DATABASE_URL = "mysql+mysqlconnector://root@localhost/highway"

engine = create_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=1800
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Security
SECRET_KEY = "your-secret-key"  # In production, use a secure secret key
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Database Models
class DBUser(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    email = Column(String(100), unique=True, index=True)
    hashed_password = Column(String(255))
    points = Column(Integer, default=0)
    level = Column(String(20), default="Bronze")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class DBHazard(Base):
    __tablename__ = "hazards"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    hazard_type = Column(String(50))
    location = Column(String(255))
    timestamp = Column(DateTime, default=datetime.utcnow)
    status = Column(String(20), default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class DBSpeedRecord(Base):
    __tablename__ = "speed_records"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    speed = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

class DBReward(Base):
    __tablename__ = "rewards"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    description = Column(String(255))
    points_cost = Column(Integer)
    redeemed_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

# Pydantic Models
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class User(BaseModel):
    username: str
    email: EmailStr
    points: int
    level: str

    class Config:
        orm_mode = True

class HazardReport(BaseModel):
    hazard_type: str
    location: str

class SpeedRecord(BaseModel):
    speed: float

class Token(BaseModel):
    access_token: str
    token_type: str

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Security functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.JWTError:
        raise credentials_exception
    user = db.query(DBUser).filter(DBUser.username == username).first()
    if user is None:
        raise credentials_exception
    return user

# API endpoints
@app.post("/signup", response_model=Token)
async def signup(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(DBUser).filter(DBUser.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    db_user = DBUser(
        username=user.username,
        email=user.email,
        hashed_password=get_password_hash(user.password)
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/hazard")
async def report_hazard(
    hazard: HazardReport,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_hazard = DBHazard(
        user_id=current_user.id,
        hazard_type=hazard.hazard_type,
        location=hazard.location
    )
    db.add(db_hazard)
    
    # Award points for reporting hazard
    current_user.points += 50
    current_user.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Hazard reported successfully", "points_earned": 50}

@app.post("/speed")
async def record_speed(
    speed: SpeedRecord,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_speed = DBSpeedRecord(
        user_id=current_user.id,
        speed=speed.speed
    )
    db.add(db_speed)
    db.commit()
    return {"message": "Speed recorded successfully"}

@app.get("/rewards")
async def get_rewards(current_user: DBUser = Depends(get_current_user)):
    rewards = [
        {"description": "Free Car Wash", "points": 500},
        {"description": "$10 Gas Card", "points": 1000},
        {"description": "Oil Change", "points": 2000}
    ]
    return {
        "user_points": current_user.points,
        "user_level": current_user.level,
        "available_rewards": rewards
    }

@app.post("/redeem-reward/{reward_id}")
async def redeem_reward(
    reward_id: int,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rewards = {
        1: {"description": "Free Car Wash", "points": 500},
        2: {"description": "$10 Gas Card", "points": 1000},
        3: {"description": "Oil Change", "points": 2000}
    }
    
    if reward_id not in rewards:
        raise HTTPException(status_code=404, detail="Reward not found")
    
    reward = rewards[reward_id]
    if current_user.points < reward["points"]:
        raise HTTPException(status_code=400, detail="Insufficient points")
    
    # Record the redemption
    db_reward = DBReward(
        user_id=current_user.id,
        description=reward["description"],
        points_cost=reward["points"]
    )
    db.add(db_reward)
    
    # Deduct points
    current_user.points -= reward["points"]
    current_user.updated_at = datetime.utcnow()
    db.commit()
    
    return {
        "message": f"Successfully redeemed {reward['description']}",
        "remaining_points": current_user.points
    }

@app.get("/user/profile")
async def get_user_profile(current_user: DBUser = Depends(get_current_user)):
    return {
        "username": current_user.username,
        "email": current_user.email,
        "points": current_user.points,
        "level": current_user.level
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app)