from apscheduler.schedulers.background import BackgroundScheduler

scheduler = BackgroundScheduler()

@router.post("/reminders")
def create_reminder(payload: ReminderRequest, ...):
    reminder = MedicationReminder(...)
    db.add(reminder); db.commit()
    # Schedule the job
    for time_str in payload.dose_times:
        hour, minute = map(int, time_str.split(":"))
        scheduler.add_job(
            send_notification,
            'cron', hour=hour, minute=minute,
            args=[current_user.email, payload.medication_name],
            id=f"reminder_{reminder.id}_{time_str}"
        )
    return reminder