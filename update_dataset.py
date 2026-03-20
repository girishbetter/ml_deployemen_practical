import pandas as pd
import random

df = pd.read_csv('data/jobs.csv')

def generate_salary():
    base = random.randint(60, 160)
    return f"${base}k - ${base + random.randint(20, 50)}k"

df['salary_range'] = [generate_salary() for _ in range(len(df))]

demands = ['High', 'Medium', 'Low']
# Weight it so High is more common, makes for better demos
df['market_demand'] = [random.choices(demands, weights=[0.6, 0.3, 0.1])[0] for _ in range(len(df))]

df.to_csv('data/jobs.csv', index=False)
print("Dataset enriched successfully!")
