from fastapi import FastAPI
from routers import attempt, users
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app = FastAPI(title="Test Yechish Platformasi")

app.include_router(users.router)
app.include_router(attempt.router)
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
def serve_index():
    return FileResponse("static/index.html")
