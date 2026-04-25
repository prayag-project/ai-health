from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from apscheduler.schedulers.background import BackgroundScheduler

from core.database import get_db
from core.security import get_current_user
from models.user import MedicationReminder, User
from schemas.schemas import ReminderRequest

router = APIRouter()
scheduler = BackgroundScheduler()
scheduler.start()


# Dummy notification function (replace later)
def send_notification(email, medication):
    print(f"Reminder sent to {email} for {medication}")


@router.post("/reminders")
def create_reminder(
    payload: ReminderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Create reminder
    reminder = MedicationReminder(
        user_id=current_user.id,
        medication_name=payload.medication_name,
        dose_times=payload.dose_times
    )

    db.add(reminder)
    db.commit()
    db.refresh(reminder)

    # Schedule jobs
    for time_str in payload.dose_times:
        hour, minute = map(int, time_str.split(":"))

        scheduler.add_job(
            send_notification,
            'cron',
            hour=hour,
            minute=minute,
            args=[current_user.email, payload.medication_name],
            id=f"reminder_{reminder.id}_{time_str}"
        )

    return reminder