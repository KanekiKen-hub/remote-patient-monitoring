import csv, random

random.seed(42)
rows = []

def clamp(v, lo, hi):
    return max(lo, min(hi, v))

# NORMAL (label=1, 250 rows)
for _ in range(250):
    hr   = random.uniform(60, 95)
    spo2 = random.uniform(95, 100)
    prev_hr   = clamp(hr   + random.gauss(0, 2.5), 55, 100)
    prev_spo2 = clamp(spo2 + random.gauss(0, 0.8), 94, 100)
    rows.append([round(hr,1), round(spo2,1), round(prev_hr,1), round(prev_spo2,1),
                 round(hr - prev_hr, 2), round(spo2 - prev_spo2, 2), 1])

# ATTENTION (label=2, 200 rows)
for i in range(200):
    if i < 100:
        hr   = random.uniform(95, 115)
        spo2 = random.uniform(92, 97)
    else:
        hr   = random.uniform(75, 108)
        spo2 = random.uniform(90, 94)
    prev_hr   = clamp(hr   + random.gauss(0, 4), 60, 120)
    prev_spo2 = clamp(spo2 + random.gauss(0, 1.2), 88, 100)
    rows.append([round(hr,1), round(spo2,1), round(prev_hr,1), round(prev_spo2,1),
                 round(hr - prev_hr, 2), round(spo2 - prev_spo2, 2), 2])

# ALERT (label=3, 150 rows)
for i in range(150):
    if i < 75:
        hr   = random.uniform(115, 180)
        spo2 = random.uniform(88, 95)
    else:
        hr   = random.uniform(80, 140)
        spo2 = random.uniform(75, 89)
    prev_hr   = clamp(hr   + random.gauss(0, 6), 60, 190)
    prev_spo2 = clamp(spo2 + random.gauss(0, 2), 70, 100)
    rows.append([round(hr,1), round(spo2,1), round(prev_hr,1), round(prev_spo2,1),
                 round(hr - prev_hr, 2), round(spo2 - prev_spo2, 2), 3])

random.shuffle(rows)

out_path = r"C:\Users\Premlatha P\.gemini\antigravity\scratch\remote-patient-monitoring\ml-service\training\demo_dataset.csv"
with open(out_path, "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["heartRate","spo2","prevHeartRate","prevSpo2","hrChange","spo2Change","label"])
    w.writerows(rows)

print(f"Written {len(rows)} rows to demo_dataset.csv")
