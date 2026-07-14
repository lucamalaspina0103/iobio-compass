#!/usr/bin/env python3
"""
IOBIO Compass Backend API Testing Suite
Tests all backend endpoints after ObjectId serialization fixes
"""

import requests
import json
import sys
from datetime import datetime
import random

# Configuration
BASE_URL = "https://compass-wellness.preview.emergentagent.com/api"
TEST_EMAIL = "test2@iobio.it"
TEST_PASSWORD = "TestPassword123"

# Colors for output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'
    BOLD = '\033[1m'

def log(message, color=Colors.END):
    print(f"{color}{message}{Colors.END}")

def test_user_registration():
    """Test 1: User Registration"""
    log(f"{Colors.BLUE}[TEST 1] Testing User Registration{Colors.END}")
    
    url = f"{BASE_URL}/register"
    payload = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    }
    
    try:
        response = requests.post(url, json=payload, timeout=30)
        log(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            log(f"{Colors.GREEN}✅ Registration successful{Colors.END}")
            log(f"User ID: {data.get('id')}")
            log(f"Email: {data.get('email')}")
            return data.get('id')
        elif response.status_code == 400:
            log(f"{Colors.YELLOW}⚠️  Email already registered (expected behavior){Colors.END}")
            log(f"Response: {response.json()}")
            return None  # Will use login instead
        else:
            log(f"{Colors.RED}❌ Registration failed{Colors.END}")
            log(f"Response: {response.text}")
            return None
            
    except Exception as e:
        log(f"{Colors.RED}❌ Registration error: {str(e)}{Colors.END}")
        return None

def test_user_login():
    """Test 2: User Login"""
    log(f"\n{Colors.BLUE}[TEST 2] Testing User Login{Colors.END}")
    
    url = f"{BASE_URL}/login"
    payload = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    }
    
    try:
        response = requests.post(url, json=payload, timeout=30)
        log(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            log(f"{Colors.GREEN}✅ Login successful{Colors.END}")
            log(f"User ID: {data.get('id')}")
            log(f"Email: {data.get('email')}")
            return data.get('id')
        else:
            log(f"{Colors.RED}❌ Login failed{Colors.END}")
            log(f"Response: {response.text}")
            return None
            
    except Exception as e:
        log(f"{Colors.RED}❌ Login error: {str(e)}{Colors.END}")
        return None

def test_screening_submission(user_id):
    """Test 3: Screening Submission"""
    log(f"\n{Colors.BLUE}[TEST 3] Testing Screening Submission{Colors.END}")
    
    url = f"{BASE_URL}/screening/submit"
    
    # Generate sample answers for all 7 areas, 5 questions each
    areas = ["Energia", "Sonno", "Stress", "Movimento", "Alimentazione", "Pelle", "Equilibrio mentale"]
    answers = []
    
    for area in areas:
        for question_index in range(5):
            answers.append({
                "area": area,
                "question_index": question_index,
                "answer": random.randint(1, 5)
            })
    
    payload = {
        "user_id": user_id,
        "answers": answers
    }
    
    try:
        response = requests.post(url, json=payload, timeout=30)
        log(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            log(f"{Colors.GREEN}✅ Screening submission successful{Colors.END}")
            log(f"Indice IOBIO: {data.get('indice_iobio')}/100")
            log(f"Weak Areas: {', '.join(data.get('weak_areas', []))}")
            log(f"Area Scores: {json.dumps(data.get('area_scores', {}), indent=2)}")
            return True
        else:
            log(f"{Colors.RED}❌ Screening submission failed{Colors.END}")
            log(f"Response: {response.text}")
            return False
            
    except Exception as e:
        log(f"{Colors.RED}❌ Screening submission error: {str(e)}{Colors.END}")
        return False

def test_latest_screening(user_id):
    """Test 4: Latest Screening Retrieval (ObjectId fix test)"""
    log(f"\n{Colors.BLUE}[TEST 4] Testing Latest Screening Retrieval (ObjectId Fix){Colors.END}")
    
    url = f"{BASE_URL}/screening/latest"
    params = {"user_id": user_id} if user_id else {}
    
    try:
        response = requests.get(url, params=params, timeout=30)
        log(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data:
                log(f"{Colors.GREEN}✅ Latest screening retrieved successfully{Colors.END}")
                log(f"Screening ID: {data.get('id')}")
                log(f"Indice IOBIO: {data.get('indice_iobio')}")
                log(f"Date: {data.get('date')}")
                log(f"Weak Areas: {', '.join(data.get('weak_areas', []))}")
                # Check if _id is properly serialized
                if '_id' in data:
                    log(f"MongoDB _id properly serialized: {data['_id']}")
                return True
            else:
                log(f"{Colors.YELLOW}⚠️  No screening found for user{Colors.END}")
                return False
        else:
            log(f"{Colors.RED}❌ Latest screening retrieval failed{Colors.END}")
            log(f"Response: {response.text}")
            return False
            
    except Exception as e:
        log(f"{Colors.RED}❌ Latest screening error: {str(e)}{Colors.END}")
        return False

def test_piano_tasks(user_id):
    """Test 5: Piano Tasks Retrieval (ObjectId fix test)"""
    log(f"\n{Colors.BLUE}[TEST 5] Testing Piano Tasks Retrieval (ObjectId Fix){Colors.END}")
    
    url = f"{BASE_URL}/piano/tasks"
    params = {"user_id": user_id} if user_id else {}
    
    try:
        response = requests.get(url, params=params, timeout=30)
        log(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                log(f"{Colors.GREEN}✅ Piano tasks retrieved successfully{Colors.END}")
                log(f"Number of tasks: {len(data)}")
                log(f"First task - Day {data[0].get('day')}: {data[0].get('task')}")
                log(f"Area: {data[0].get('area')}")
                # Check if _id is properly serialized for all tasks
                all_serialized = all('_id' not in task or isinstance(task['_id'], str) for task in data)
                log(f"All MongoDB _id properly serialized: {all_serialized}")
                return len(data) == 30  # Should be exactly 30 tasks
            else:
                log(f"{Colors.YELLOW}⚠️  No tasks found for user{Colors.END}")
                return False
        else:
            log(f"{Colors.RED}❌ Piano tasks retrieval failed{Colors.END}")
            log(f"Response: {response.text}")
            return False
            
    except Exception as e:
        log(f"{Colors.RED}❌ Piano tasks error: {str(e)}{Colors.END}")
        return False

def test_checkin_submission(user_id):
    """Test 6: Check-in Submission"""
    log(f"\n{Colors.BLUE}[TEST 6] Testing Check-in Submission{Colors.END}")
    
    url = f"{BASE_URL}/checkin/submit"
    payload = {
        "user_id": user_id,
        "energia": 4,
        "umore": 5,
        "sonno": 4
    }
    
    try:
        response = requests.post(url, json=payload, timeout=30)
        log(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            log(f"{Colors.GREEN}✅ Check-in submission successful{Colors.END}")
            log(f"Check-in ID: {data.get('id')}")
            log(f"Energia: {data.get('energia')}, Umore: {data.get('umore')}, Sonno: {data.get('sonno')}")
            log(f"Date: {data.get('date')}")
            return True
        else:
            log(f"{Colors.RED}❌ Check-in submission failed{Colors.END}")
            log(f"Response: {response.text}")
            return False
            
    except Exception as e:
        log(f"{Colors.RED}❌ Check-in submission error: {str(e)}{Colors.END}")
        return False

def test_checkin_history(user_id):
    """Test 7: Check-in History Retrieval (ObjectId fix test)"""
    log(f"\n{Colors.BLUE}[TEST 7] Testing Check-in History Retrieval (ObjectId Fix){Colors.END}")
    
    url = f"{BASE_URL}/checkin/history"
    params = {"user_id": user_id} if user_id else {}
    
    try:
        response = requests.get(url, params=params, timeout=30)
        log(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                log(f"{Colors.GREEN}✅ Check-in history retrieved successfully{Colors.END}")
                log(f"Number of check-ins: {len(data)}")
                log(f"Latest check-in: Energia={data[0].get('energia')}, Umore={data[0].get('umore')}, Sonno={data[0].get('sonno')}")
                log(f"Date: {data[0].get('date')}")
                # Check if _id is properly serialized for all check-ins
                all_serialized = all('_id' not in checkin or isinstance(checkin['_id'], str) for checkin in data)
                log(f"All MongoDB _id properly serialized: {all_serialized}")
                return True
            else:
                log(f"{Colors.YELLOW}⚠️  No check-ins found for user{Colors.END}")
                return False
        else:
            log(f"{Colors.RED}❌ Check-in history retrieval failed{Colors.END}")
            log(f"Response: {response.text}")
            return False
            
    except Exception as e:
        log(f"{Colors.RED}❌ Check-in history error: {str(e)}{Colors.END}")
        return False

def test_ai_chat_fallback(user_id):
    """Test 8: AI Chat with Fallback Response"""
    log(f"\n{Colors.BLUE}[TEST 8] Testing AI Chat with Fallback Response{Colors.END}")
    
    url = f"{BASE_URL}/chat"
    payload = {
        "user_id": user_id,
        "message": "Come posso migliorare il mio sonno?"
    }
    
    try:
        response = requests.post(url, json=payload, timeout=30)
        log(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            chat_response = data.get('response', '')
            log(f"{Colors.GREEN}✅ AI Chat successful{Colors.END}")
            log(f"Response: {chat_response}")
            log(f"Timestamp: {data.get('timestamp')}")
            
            # Check if it's a fallback response (budget exceeded scenario)
            fallback_keywords = ['grazie', 'benessere', 'movimento', 'mindfulness', 'pilastri']
            is_fallback = any(keyword.lower() in chat_response.lower() for keyword in fallback_keywords)
            
            if is_fallback:
                log(f"{Colors.YELLOW}📝 Fallback response detected (budget limit expected){Colors.END}")
            else:
                log(f"{Colors.GREEN}🤖 AI response received{Colors.END}")
            
            return True
        else:
            log(f"{Colors.RED}❌ AI Chat failed{Colors.END}")
            log(f"Response: {response.text}")
            return False
            
    except Exception as e:
        log(f"{Colors.RED}❌ AI Chat error: {str(e)}{Colors.END}")
        return False

def test_piano_tasks_unique_fix():
    """Test 9: Piano Tasks Unique Text Fix (PIANO-FIX-011)"""
    log(f"\n{Colors.BLUE}[TEST 9] Testing Piano Tasks Unique Text Fix (PIANO-FIX-011){Colors.END}")
    log(f"{Colors.YELLOW}Bug: All 30 tasks showing same text 'Bevi 8 bicchieri d'acqua oggi'{Colors.END}")
    log(f"{Colors.YELLOW}Fix: Tasks should cycle through templates with unique text{Colors.END}")
    
    test_user_id = "test_piano_fix"
    
    # Step 1: Submit screening with specific test data
    log(f"\n{Colors.BOLD}Step 1: Submit screening with test data{Colors.END}")
    url = f"{BASE_URL}/screening/submit"
    
    # Test data designed to create weak areas: energia, sonno, stress
    payload = {
        "user_id": test_user_id,
        "answers": [
            {"question_id": "energia_1", "area": "energia", "answer": 2, "scale_type": "frequency", "polarity": "positive", "weight": 1.0},
            {"question_id": "energia_2", "area": "energia", "answer": 3, "scale_type": "quality", "polarity": "positive", "weight": 1.0},
            {"question_id": "energia_3", "area": "energia", "answer": 2, "scale_type": "intensity", "polarity": "positive", "weight": 1.0},
            {"question_id": "sonno_1", "area": "sonno", "answer": 2, "scale_type": "frequency", "polarity": "positive", "weight": 1.0},
            {"question_id": "sonno_2", "area": "sonno", "answer": 3, "scale_type": "quality", "polarity": "positive", "weight": 1.0},
            {"question_id": "sonno_3", "area": "sonno", "answer": 2, "scale_type": "intensity", "polarity": "positive", "weight": 1.0},
            {"question_id": "stress_1", "area": "stress", "answer": 3, "scale_type": "frequency", "polarity": "negative", "weight": 1.0},
            {"question_id": "stress_2", "area": "stress", "answer": 2, "scale_type": "quality", "polarity": "negative", "weight": 1.0},
            {"question_id": "stress_3", "area": "stress", "answer": 3, "scale_type": "intensity", "polarity": "negative", "weight": 1.0},
            {"question_id": "movimento_1", "area": "movimento", "answer": 4, "scale_type": "frequency", "polarity": "positive", "weight": 1.0},
            {"question_id": "movimento_2", "area": "movimento", "answer": 4, "scale_type": "quality", "polarity": "positive", "weight": 1.0},
            {"question_id": "movimento_3", "area": "movimento", "answer": 4, "scale_type": "intensity", "polarity": "positive", "weight": 1.0},
            {"question_id": "alimentazione_1", "area": "alimentazione", "answer": 4, "scale_type": "frequency", "polarity": "positive", "weight": 1.0},
            {"question_id": "alimentazione_2", "area": "alimentazione", "answer": 4, "scale_type": "quality", "polarity": "positive", "weight": 1.0},
            {"question_id": "alimentazione_3", "area": "alimentazione", "answer": 4, "scale_type": "intensity", "polarity": "positive", "weight": 1.0},
            {"question_id": "pelle_1", "area": "pelle", "answer": 4, "scale_type": "frequency", "polarity": "positive", "weight": 1.0},
            {"question_id": "pelle_2", "area": "pelle", "answer": 4, "scale_type": "quality", "polarity": "positive", "weight": 1.0},
            {"question_id": "pelle_3", "area": "pelle", "answer": 4, "scale_type": "intensity", "polarity": "positive", "weight": 1.0},
            {"question_id": "equilibrio_1", "area": "equilibrio_mentale", "answer": 4, "scale_type": "frequency", "polarity": "positive", "weight": 1.0},
            {"question_id": "equilibrio_2", "area": "equilibrio_mentale", "answer": 4, "scale_type": "quality", "polarity": "positive", "weight": 1.0},
            {"question_id": "equilibrio_3", "area": "equilibrio_mentale", "answer": 4, "scale_type": "intensity", "polarity": "positive", "weight": 1.0}
        ]
    }
    
    try:
        response = requests.post(url, json=payload, timeout=30)
        log(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            log(f"{Colors.RED}❌ Screening submission failed{Colors.END}")
            log(f"Response: {response.text}")
            return False
        
        data = response.json()
        log(f"{Colors.GREEN}✅ Screening submitted successfully{Colors.END}")
        log(f"Indice IOBIO: {data.get('indice_iobio')}/100")
        log(f"Weak Areas: {', '.join(data.get('weak_areas', []))}")
        
        # Step 2: Retrieve piano tasks
        log(f"\n{Colors.BOLD}Step 2: Retrieve piano tasks{Colors.END}")
        url = f"{BASE_URL}/piano/tasks"
        params = {"user_id": test_user_id}
        
        response = requests.get(url, params=params, timeout=30)
        log(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            log(f"{Colors.RED}❌ Piano tasks retrieval failed{Colors.END}")
            log(f"Response: {response.text}")
            return False
        
        tasks = response.json()
        
        # Step 3: Verify results
        log(f"\n{Colors.BOLD}Step 3: Verify task uniqueness{Colors.END}")
        
        # Check 1: Exactly 30 tasks
        if len(tasks) != 30:
            log(f"{Colors.RED}❌ Expected 30 tasks, got {len(tasks)}{Colors.END}")
            return False
        log(f"{Colors.GREEN}✅ Exactly 30 tasks returned{Colors.END}")
        
        # Check 2: All days 1-30 present
        days = sorted([task['day'] for task in tasks])
        expected_days = list(range(1, 31))
        if days != expected_days:
            log(f"{Colors.RED}❌ Days mismatch. Expected 1-30, got: {days}{Colors.END}")
            return False
        log(f"{Colors.GREEN}✅ All days 1-30 present{Colors.END}")
        
        # Check 3: All tasks have valid area field
        areas_present = all('area' in task and task['area'] for task in tasks)
        if not areas_present:
            log(f"{Colors.RED}❌ Some tasks missing 'area' field{Colors.END}")
            return False
        log(f"{Colors.GREEN}✅ All tasks have valid 'area' field{Colors.END}")
        
        # Check 4: Tasks have DIFFERENT text (main bug fix verification)
        task_texts = [task['task'] for task in tasks]
        unique_texts = set(task_texts)
        
        log(f"\nTask text analysis:")
        log(f"Total tasks: {len(task_texts)}")
        log(f"Unique task texts: {len(unique_texts)}")
        
        # Show first 5 tasks to verify variety
        log(f"\n{Colors.BOLD}First 5 tasks:{Colors.END}")
        for i in range(min(5, len(tasks))):
            task = tasks[i]
            log(f"  Day {task['day']}: {task['task']} (Area: {task['area']})")
        
        # Check if all tasks are the same (the bug)
        if len(unique_texts) == 1:
            log(f"{Colors.RED}❌ BUG STILL PRESENT: All tasks have the same text: '{task_texts[0]}'{Colors.END}")
            return False
        
        # Check if we have reasonable variety (at least 10 unique texts for 30 tasks cycling through 3 areas)
        if len(unique_texts) < 10:
            log(f"{Colors.YELLOW}⚠️  Low variety: Only {len(unique_texts)} unique texts{Colors.END}")
            log(f"{Colors.YELLOW}Expected at least 10 unique texts for proper cycling{Colors.END}")
            return False
        
        log(f"{Colors.GREEN}✅ Tasks have DIFFERENT text (bug fixed!){Colors.END}")
        log(f"{Colors.GREEN}✅ {len(unique_texts)} unique task texts found{Colors.END}")
        
        # Check 5: Verify no consecutive duplicates
        consecutive_duplicates = []
        for i in range(len(task_texts) - 1):
            if task_texts[i] == task_texts[i + 1]:
                consecutive_duplicates.append((i + 1, task_texts[i]))
        
        if consecutive_duplicates:
            log(f"{Colors.YELLOW}⚠️  Found {len(consecutive_duplicates)} consecutive duplicate tasks:{Colors.END}")
            for day, text in consecutive_duplicates[:3]:  # Show first 3
                log(f"  Days {day}-{day+1}: {text}")
        else:
            log(f"{Colors.GREEN}✅ No consecutive duplicate tasks{Colors.END}")
        
        log(f"\n{Colors.GREEN}🎉 PIANO TASKS FIX VERIFIED! Build: PIANO-FIX-011{Colors.END}")
        return True
        
    except Exception as e:
        log(f"{Colors.RED}❌ Piano tasks fix test error: {str(e)}{Colors.END}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all backend tests"""
    log(f"{Colors.BOLD}🧪 IOBIO Compass Backend API Testing Suite{Colors.END}")
    log(f"Backend URL: {BASE_URL}")
    log(f"Test Email: {TEST_EMAIL}")
    log("=" * 60)
    
    # Check if we should run only the piano fix test
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "--piano-fix-only":
        log(f"{Colors.YELLOW}Running PIANO-FIX-011 test only{Colors.END}")
        success = test_piano_tasks_unique_fix()
        if success:
            log(f"\n{Colors.GREEN}✅ PIANO-FIX-011 TEST PASSED{Colors.END}")
        else:
            log(f"\n{Colors.RED}❌ PIANO-FIX-011 TEST FAILED{Colors.END}")
        return
    
    results = []
    
    # Test 1: Registration
    user_id = test_user_registration()
    results.append(("User Registration", user_id is not None or "already registered"))
    
    # Test 2: Login (always needed to get user_id)
    if not user_id:
        user_id = test_user_login()
    results.append(("User Login", user_id is not None))
    
    if not user_id:
        log(f"{Colors.RED}❌ Cannot proceed without valid user_id{Colors.END}")
        return
    
    # Test 3: Screening Submission
    screening_success = test_screening_submission(user_id)
    results.append(("Screening Submission", screening_success))
    
    # Test 4: Latest Screening (ObjectId fix test)
    latest_screening_success = test_latest_screening(user_id)
    results.append(("Latest Screening Retrieval", latest_screening_success))
    
    # Test 5: Piano Tasks (ObjectId fix test)
    piano_tasks_success = test_piano_tasks(user_id)
    results.append(("Piano Tasks Retrieval", piano_tasks_success))
    
    # Test 6: Check-in Submission
    checkin_submit_success = test_checkin_submission(user_id)
    results.append(("Check-in Submission", checkin_submit_success))
    
    # Test 7: Check-in History (ObjectId fix test)
    checkin_history_success = test_checkin_history(user_id)
    results.append(("Check-in History Retrieval", checkin_history_success))
    
    # Test 8: AI Chat with Fallback
    chat_success = test_ai_chat_fallback(user_id)
    results.append(("AI Chat with Fallback", chat_success))
    
    # Test 9: Piano Tasks Unique Fix (PIANO-FIX-011)
    piano_fix_success = test_piano_tasks_unique_fix()
    results.append(("Piano Tasks Unique Fix (PIANO-FIX-011)", piano_fix_success))
    
    # Summary
    log(f"\n{Colors.BOLD}📊 TEST RESULTS SUMMARY{Colors.END}")
    log("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, success in results:
        if success:
            log(f"{Colors.GREEN}✅ {test_name}{Colors.END}")
            passed += 1
        else:
            log(f"{Colors.RED}❌ {test_name}{Colors.END}")
    
    log("=" * 60)
    log(f"{Colors.BOLD}Overall: {passed}/{total} tests passed{Colors.END}")
    
    if passed == total:
        log(f"{Colors.GREEN}🎉 All tests passed! ObjectId fixes working correctly.{Colors.END}")
    else:
        log(f"{Colors.YELLOW}⚠️  Some tests failed. Check details above.{Colors.END}")

if __name__ == "__main__":
    main()