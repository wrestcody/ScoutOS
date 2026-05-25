from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

ticket_counter = 1234

class Ticket(BaseModel):
    title: str
    body: str
    parent_ticket: str = None

@app.post("/api/create-ticket")
async def create_ticket(ticket: Ticket):
    global ticket_counter
    ticket_counter += 1
    new_ticket_id = f"TASK-{ticket_counter}"
    print(f"Received ticket: {new_ticket_id} ... {ticket.dict()}")
    return {"ticket_id": new_ticket_id, "status": "created"}
