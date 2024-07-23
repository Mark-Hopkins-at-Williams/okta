import pandas as pd
import editdistance
import math

df = pd.read_csv('ta_responses.csv')
prefs_df = pd.read_csv('ta_prefs.csv')
references = {'Aaron': 'aaron williams',
              'BillJ': 'bill jannen',
              'Dan': 'dan barowy',
              'Iris': 'iris howley',
              'Jeannie': 'jeannie albrecht',
              'Jim': 'jim bern',
              'Katie': 'katie keith',
              'Kelly': 'kelly shaw',
              'Lida': 'lida doret',
              'Mark': 'mark hopkins',
              'Rohit': 'rohit bhattacharya',
              'Sam': 'sam mccauley',
              'Shikha': 'shikha singh',
              'Steve': 'steve freund'}
faculty = list(references.values())
courses = dict()

def compile_courses(course1, course2, course3):
    result = []
    for course in [course1, course2, course3]:
        try:
            result.append(str(int(course)))
            if str(int(course)) not in courses:
                courses[str(int(course))] = {'applicants': [], 'roster': []}
                
        except Exception:
            pass 
    return result
    

def standardize_reference(noisy_ref):
    all_targets = faculty
    return min(all_targets, key=lambda x: editdistance.eval(noisy_ref.lower(), x))
    
def get_unix_id(email):
    return str(email).split("@")[0]





applicants = dict()
for index, row in df.iterrows():
    unix_id = get_unix_id(row['Email'])
    response = {'name': row['Name'],
                'id': unix_id,
                'courses': compile_courses(row['First choice for course to TA'], 
                                           row['Second choice for course to TA'], 
                                           row['Third choice for course to TA']),
                'refs': [standardize_reference(row['Faculty Reference #1']),
                         standardize_reference(row['Faculty Reference #2'])]
                }
    if unix_id in applicants:
        print(f"Warning: Duplicate entry for {unix_id}")
    applicants[unix_id] = response    



recommendations = dict()
for applicant in applicants:
    for recommender in applicants[applicant]['refs']:
        if recommender not in recommendations:
            recommendations[recommender] = dict()
        recommendations[recommender][applicant] = 'U'

def convert_rating_to_letter(rating):
    if rating >= 4.5:
        return "A"
    elif rating >= 3.5:
        return "B"
    elif rating >= 2.5:
        return "C"
    else:
        return "D"

course_names = ['104','134','136','237','256','339',
                '358','361','375','376','381']

course_ratings = dict()

for _, row in prefs_df.iterrows():
    email = get_unix_id(row['Email'])
    scores = []
    for key in references:
        try:
            rating = float(row[key])
            if not math.isnan(rating):
                if references[key] not in recommendations:
                    recommendations[references[key]] = dict()
                recommendations[references[key]][email] = convert_rating_to_letter(rating)
        except Exception:
            pass
    for course in course_names:
        try:
            rating = float(row[f'{course}.1'])
            if not math.isnan(rating):
                letter_grade = "C"
                if rating >= 4:
                    letter_grade = "A"
                elif rating >= 3:
                    letter_grade = "B"
                course_ratings[(email, course)] = letter_grade               
        except Exception:
            pass



for index, row in df.iterrows():
    unix_id = get_unix_id(row['Email'])
    for course in compile_courses(row['First choice for course to TA'], 
                                  row['Second choice for course to TA'], 
                                  row['Third choice for course to TA']):
        courses[course]['applicants'].append(
            {'id': unix_id,
             'rating': course_ratings.get((unix_id, course), 'C')}
        )

assignments = dict()

for _, row in prefs_df.iterrows(): 
    unix_id = get_unix_id(row['Email'])   
    try:
        assignment = float(row['Class'])
        if not math.isnan(assignment):
            course_id = str(int(assignment))
            if course_id not in assignments:
                assignments[course_id] = []
            assignments[course_id].append(unix_id)           
    except Exception:
        pass



print(assignments)
revised_courses = []
for course_id in courses:
    roster = [{'id': unix_id, 'status': 'tentative'} for unix_id in assignments.get(course_id, [])]
    entry = {'id': course_id, 
             'applicants': courses[course_id]['applicants'],
             'roster': roster}
    revised_courses.append(entry)

assignments = [{'course': k, 'tas': v} for k, v in assignments.items()]


rows = list(applicants.values())
rows.sort(key=lambda resp: resp['name'])

payload = {'applicants': rows, 
           'courses': revised_courses,
           'recommendations': recommendations}

with open('ta_responses.json', 'w') as writer:
    import json
    writer.write(json.dumps(payload))