from sqlalchemy import text
from database import engine

def run():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE transactions ADD COLUMN status VARCHAR(20) DEFAULT 'COMPLETED';"))
            conn.commit()
            print("Successfully added status column.")
        except Exception as e:
            print(f"Error (column might already exist): {e}")

if __name__ == "__main__":
    run()
