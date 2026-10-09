"""
Standalone database seeding script
"""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.database import SessionLocal, init_db
from backend.app.api.system import seed_sample_hazards

def main():
    print("Initializing database...")
    init_db()
    db = SessionLocal()
    try:
        print("Seeding realistic road hazard dataset...")
        result = seed_sample_hazards(clear_existing=True, db=db)
        print(f"Success: {result['message']}")
        print(f"Total hazards created: {len(result['hazard_ids'])}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
