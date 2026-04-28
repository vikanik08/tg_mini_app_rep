import asyncio

from app.services.notifications import process_due_reminders


async def main() -> None:
    sent_count = await process_due_reminders()
    print(f"Processed due reminders: {sent_count}")


if __name__ == "__main__":
    asyncio.run(main())
