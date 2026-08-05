import os
import sys
import pymysql
import bcrypt
from datetime import datetime, timedelta, UTC
from dotenv import load_dotenv

# Load env variables from root directory
root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(root_dir, '.env'))

DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = int(os.getenv("DB_PORT", 3306))
DB_NAME = os.getenv("DB_NAME", "exam")
DB_USERNAME = os.getenv("DB_USERNAME", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def main():
    print("Connecting to MySQL to apply Prompt 3 seeds...")
    try:
        connection = pymysql.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USERNAME,
            password=DB_PASSWORD,
            database=DB_NAME,
            autocommit=True
        )
    except Exception as e:
        print(f"Error connecting to database: {e}")
        sys.exit(1)

    try:
        with connection.cursor() as cursor:
            # 1. Seed Roles
            print("Seeding roles...")
            cursor.execute(
                """
                INSERT INTO roles (id, name, description) VALUES 
                (1, 'super_admin', 'Super Administrator access'),
                (2, 'student', 'Student access'),
                (3, 'admin', 'Normal Administrator access')
                ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description);
                """
            )

            # 2. Seed User Statuses
            print("Seeding user statuses...")
            cursor.execute(
                """
                INSERT INTO user_statuses (id, name, description) VALUES 
                (1, 'active', 'User accounts that are active'),
                (2, 'inactive', 'User accounts that are inactive'),
                (3, 'blocked', 'User accounts that are blocked')
                ON DUPLICATE KEY UPDATE name=name;
                """
            )

            # 3. Seed Accessibility Requirements
            print("Seeding accessibility requirements...")
            requirements = [
                (1, 'blind', 'Visually impaired - Blind'),
                (2, 'low_vision', 'Visually impaired - Low Vision'),
                (3, 'hearing_impaired', 'Hearing Impaired'),
                (4, 'mobility_assistance', 'Requires Mobility Assistance'),
                (5, 'learning_disability', 'Cognitive or Learning Disability'),
                (6, 'none', 'No accessibility requirement')
            ]
            for req_id, name, desc in requirements:
                cursor.execute(
                    """
                    INSERT INTO accessibility_requirements (id, name, description)
                    VALUES (%s, %s, %s)
                    ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description);
                    """,
                    (req_id, name, desc)
                )

            # 4. Seed Categories, Difficulty Levels, and Question Types
            print("Seeding categories...")
            categories = [
                (1, 'Mathematics', 'Quantitative mathematics and calculus'),
                (2, 'Science', 'General physical and biological sciences'),
                (3, 'Programming', 'Software engineering, algorithms and syntax'),
                (4, 'General Knowledge', 'Global history, geography and affairs'),
                (5, 'English', 'Grammar, text reading, and language structure')
            ]
            for cat_id, name, desc in categories:
                cursor.execute(
                    """
                    INSERT INTO question_categories (id, name, description)
                    VALUES (%s, %s, %s)
                    ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description);
                    """,
                    (cat_id, name, desc)
                )

            print("Seeding difficulty levels...")
            difficulties = [
                (1, 'Easy', 'Basic introductory queries'),
                (2, 'Medium', 'Intermediate logic calls'),
                (3, 'Hard', 'Advanced multi-step reasoning problems')
            ]
            for diff_id, name, desc in difficulties:
                cursor.execute(
                    """
                    INSERT INTO difficulty_levels (id, name, description)
                    VALUES (%s, %s, %s)
                    ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description);
                    """,
                    (diff_id, name, desc)
                )

            print("Seeding question types...")
            qtypes = [
                (1, 'Multiple Choice', 'Select one correct option from many'),
                (2, 'True False', 'Simple boolean assertion check'),
                (3, 'Short Answer', 'Plain text single line input field'),
                (4, 'Long Answer', 'Detailed multi-paragraph rich text response'),
                (5, 'Fill in the Blank', 'Input fields missing words')
            ]
            for q_id, name, desc in qtypes:
                cursor.execute(
                    """
                    INSERT INTO question_types (id, name, description)
                    VALUES (%s, %s, %s)
                    ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description);
                    """,
                    (q_id, name, desc)
                )

            # 5. Seed default Subjects
            print("Seeding subjects...")
            subjects = [
                (1, 'Introduction to Python Programming', 'CS101', 'Foundations of Computer Science and Python coding.', 'active'),
                (2, 'Advanced Engineering Mathematics', 'MATH201', 'Calculus, Fourier series, and matrix algebra.', 'active')
            ]
            for sub_id, name, code, desc, status in subjects:
                cursor.execute(
                    """
                    INSERT INTO subjects (id, subject_name, subject_code, description, status)
                    VALUES (%s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE subject_name=VALUES(subject_name), description=VALUES(description), status=VALUES(status);
                    """,
                    (sub_id, name, code, desc, status)
                )

            # 6. Seed Admin accounts
            cursor.execute("SELECT id FROM users WHERE email = 'admin@exam.com'")
            admin_exists = cursor.fetchone()
            if not admin_exists:
                admin_pw_hash = hash_password("Admin123!")
                cursor.execute(
                    """
                    INSERT INTO users (first_name, last_name, email, phone, password, role_id, status_id)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    ("System", "Admin", "admin@exam.com", "+1234567890", admin_pw_hash, 1, 1)
                )
                admin_id = cursor.lastrowid
            else:
                admin_id = admin_exists[0]
                cursor.execute("UPDATE users SET role_id = 1 WHERE id = %s", (admin_id,))

            cursor.execute("SELECT id FROM users WHERE email = 'staff@exam.com'")
            staff_exists = cursor.fetchone()
            if not staff_exists:
                staff_pw_hash = hash_password("Admin123!")
                cursor.execute(
                    """
                    INSERT INTO users (first_name, last_name, email, phone, password, role_id, status_id)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    ("Staff", "Admin", "staff@exam.com", "+1122334455", staff_pw_hash, 3, 1)
                )

            # 7. Seed Student
            cursor.execute("SELECT id FROM users WHERE email = 'student@exam.com'")
            student_exists = cursor.fetchone()
            if not student_exists:
                student_pw_hash = hash_password("Student123!")
                cursor.execute(
                    """
                    INSERT INTO users (first_name, last_name, email, phone, password, role_id, status_id)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    ("Test", "Student", "student@exam.com", "+0987654321", student_pw_hash, 2, 1)
                )
                student_id = cursor.lastrowid
                
                cursor.execute(
                    """
                    INSERT INTO student_profiles (user_id, enrollment_number, date_of_birth, gender, address, accessibility_requirement_id, preferred_language)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (student_id, "STU20260001", "2000-01-01", "Non-binary", "123 Campus Way", 6, "en")
                )
            else:
                student_id = student_exists[0]

            # 8. Seed sample Question
            print("Seeding sample questions...")
            cursor.execute("SELECT id FROM questions WHERE title = 'Python Mutable Type'")
            q_exists = cursor.fetchone()
            if not q_exists:
                cursor.execute(
                    """
                    INSERT INTO questions (title, description, subject_id, category_id, difficulty_id, question_type_id, marks, negative_marks, explanation, status)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    ("Python Mutable Type", "<p>Which of the following is a <strong>mutable</strong> data type in Python?</p>", 1, 3, 1, 1, 2.00, 0.50, "Lists are mutable, meaning their contents can be altered in-place, whereas tuples, strings, and integers are immutable.", "active")
                )
                q_id = cursor.lastrowid
                
                # Options
                options = [
                    ("List", True, 1),
                    ("Tuple", False, 2),
                    ("String", False, 3),
                    ("Integer", False, 4)
                ]
                for text, is_corr, order in options:
                    cursor.execute(
                        """
                        INSERT INTO question_options (question_id, option_text, is_correct, display_order)
                        VALUES (%s, %s, %s, %s)
                        """,
                        (q_id, text, is_corr, order)
                    )
            else:
                q_id = q_exists[0]

            # 9. Seed sample Exam
            print("Seeding sample exams...")
            cursor.execute("SELECT id FROM exams WHERE code = 'EXAM-CS101-01'")
            exam_exists = cursor.fetchone()
            
            start_date = datetime.now() - timedelta(days=1)
            end_date = datetime.now() + timedelta(days=15)
            
            if not exam_exists:
                cursor.execute(
                    """
                    INSERT INTO exams (name, code, description, subject_id, instructions, duration_minutes, passing_marks, total_marks, start_date, end_date, status, randomize_questions, randomize_options, show_result_immediately, allow_multiple_attempts, max_attempts, auto_submit, timezone)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    ("Python Programming Basics", "EXAM-CS101-01", "Introduction to Python data structures and loops.", 1, "<p>Please ensure you have a stable network. Do not navigate away from the browser.</p>", 60, 5.00, 10.00, start_date, end_date, "published", False, False, True, False, 1, True, "UTC")
                )
                exam_id = cursor.lastrowid
                
                # Map question
                cursor.execute(
                    """
                    INSERT INTO exam_questions (exam_id, question_id, display_order, marks_override)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (exam_id, q_id, 1, 2.00)
                )

            # 10. Seed voice command aliases
            print("Seeding voice command aliases...")
            aliases = [
                # English Command Aliases
                ("START_EXAM", "start exam", "en"),
                ("START_EXAM", "begin exam", "en"),
                ("NEXT_QUESTION", "next question", "en"),
                ("NEXT_QUESTION", "go next", "en"),
                ("NEXT_QUESTION", "move forward", "en"),
                ("PREV_QUESTION", "previous question", "en"),
                ("PREV_QUESTION", "go back", "en"),
                ("REPEAT_QUESTION", "repeat question", "en"),
                ("REPEAT_QUESTION", "read question", "en"),
                ("ANSWER_A", "answer option a", "en"),
                ("ANSWER_A", "select a", "en"),
                ("ANSWER_B", "answer option b", "en"),
                ("ANSWER_C", "answer option c", "en"),
                ("ANSWER_D", "answer option d", "en"),
                ("SAVE_ANSWER", "save answer", "en"),
                ("MARK_REVIEW", "mark for review", "en"),
                ("MARK_REVIEW", "review later", "en"),
                ("CLEAR_ANSWER", "clear answer", "en"),
                ("SUBMIT_EXAM", "submit exam", "en"),
                ("HELP", "help me", "en"),
                ("HELP", "commands", "en"),
                
                # Hindi Command Aliases
                ("NEXT_QUESTION", "अगला प्रश्न", "hi"),
                ("NEXT_QUESTION", "आगे बढ़ो", "hi"),
                ("PREV_QUESTION", "पिछला प्रश्न", "hi"),
                ("REPEAT_QUESTION", "प्रश्न दोहराएं", "hi"),
                ("SUBMIT_EXAM", "परीक्षा जमा करें", "hi"),
                
                # Malayalam Command Aliases
                ("NEXT_QUESTION", "അടുത്ത ചോദ്യം", "ml"),
                ("NEXT_QUESTION", "അടുത്തത്", "ml"),
                ("PREV_QUESTION", "മുൻപത്തെ ചോദ്യം", "ml"),
                ("REPEAT_QUESTION", "ചോദ്യം ആവർത്തിക്കുക", "ml"),
                ("SUBMIT_EXAM", "പരീക്ഷ സമർപ്പിക്കുക", "ml")
            ]
            for cmd_key, text, lang in aliases:
                cursor.execute("SELECT id FROM voice_command_aliases WHERE alias_text = %s AND language = %s", (text, lang))
                if not cursor.fetchone():
                    cursor.execute(
                        "INSERT INTO voice_command_aliases (command_key, alias_text, language) VALUES (%s, %s, %s)",
                        (cmd_key, text, lang)
                    )

            # 12. Seed default grade masters
            print("Seeding default grade masters...")
            grades = [
                ("A+", 90.00, 100.00, "Excellent performance"),
                ("A", 80.00, 89.99, "Very good performance"),
                ("B+", 70.00, 79.99, "Good performance"),
                ("B", 60.00, 69.99, "Above average performance"),
                ("C", 50.00, 59.99, "Average performance"),
                ("D", 40.00, 49.99, "Below average performance"),
                ("F", 0.00, 39.99, "Fail performance")
            ]
            for name, min_p, max_p, desc in grades:
                cursor.execute("SELECT id FROM grade_masters WHERE grade_name = %s", (name,))
                if not cursor.fetchone():
                    cursor.execute(
                        "INSERT INTO grade_masters (grade_name, min_percentage, max_percentage, description) VALUES (%s, %s, %s, %s)",
                        (name, min_p, max_p, desc)
                    )

        print("Database seeds applied successfully.")

    except Exception as e:
        print(f"Error applying database seeds: {e}")
        sys.exit(1)
    finally:
        connection.close()

if __name__ == "__main__":
    main()
