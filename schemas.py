from pydantic import BaseModel


class UserCreate(BaseModel):
    username: str
    password: str


class LoginUser(BaseModel):
    username: str
    password: str


class ChoiceOut(BaseModel):
    id: int
    text: str
    class Config:
        from_attributes = True


class QuestionOut(BaseModel):
    id: int
    text: str
    choices: list[ChoiceOut]
    class Config:
        from_attributes = True


class AnswerSubmit(BaseModel):
    question_id: int
    choice_id: int


class AnswerResult(BaseModel):
    is_correct: bool
    correct_choice_id: int


class AttemptResult(BaseModel):
    score: int
    total: int
    percentage: float