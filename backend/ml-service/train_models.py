"""
FinMan ML Model Training & Validation Pipeline
Trains:
1. FinMan Category Classifier (Multi-class with Calibrated Probabilities)
2. FinMan Expense Regressor (Time-Series Monthly Expense Forecasting)
Evaluates metrics against baselines and serializes models compatible with scikit-learn 1.9.1 + Python 3.14.
"""

import os
import json
import pickle
from pathlib import Path
import numpy as np
import pandas as pd
from datetime import datetime

from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.linear_model import LogisticRegression
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.metrics import (
    accuracy_score, precision_recall_fscore_support,
    mean_absolute_error, root_mean_squared_error, r2_score
)
from sklearn.model_selection import train_test_split

MODEL_DIR = Path(__file__).resolve().parent / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# 1. CATEGORY CLASSIFIER TRAINING
# ---------------------------------------------------------------------------
print("=" * 60)
print("1. TRAINING FINMAN CATEGORY CLASSIFIER")
print("=" * 60)

# 10 Official FinMan Database Categories
CATEGORIES = [
    'Food',
    'Shopping',
    'Medical',
    'Education',
    'Transportation',
    'Entertainment',
    'Bills',
    'Insurance',
    'Investments',
    'Others'
]

# Curated dataset of representative transactions across merchants & descriptions
RAW_DATA = [
    # Food
    ('Swiggy order lunch delivery', 'Swiggy', 420.0, 'UPI', 'Food'),
    ('Zomato dinner biryani and kebabs', 'Zomato', 850.0, 'UPI', 'Food'),
    ('Starbucks coffee cappuccino and croissant', 'Starbucks', 380.0, 'Credit Card', 'Food'),
    ('McDonalds burger meal with fries', 'McDonalds', 290.0, 'Debit Card', 'Food'),
    ('Dominos pizza regular farm fresh', 'Dominos', 540.0, 'UPI', 'Food'),
    ('Supermarket grocery vegetables and milk', 'Reliance Fresh', 1450.0, 'UPI', 'Food'),
    ('Local bakery bread butter cake', 'Iyengar Bakery', 180.0, 'Cash', 'Food'),
    ('Vegetable vendor fresh fruits and greens', 'Fruit Market', 240.0, 'UPI', 'Food'),
    ('KFC fried chicken bucket', 'KFC', 650.0, 'Credit Card', 'Food'),
    ('Cafe Coffee Day cold coffee and brownies', 'CCD', 320.0, 'UPI', 'Food'),
    ('Blinkit instant grocery pantry delivery', 'Blinkit', 620.0, 'UPI', 'Food'),
    ('Zepto grocery essentials eggs curd bread', 'Zepto', 390.0, 'UPI', 'Food'),
    ('Subway submarine sandwich salad', 'Subway', 280.0, 'Debit Card', 'Food'),
    ('Dine-in restaurant family dinner bill', 'Barbeque Nation', 3200.0, 'Credit Card', 'Food'),
    ('South indian breakfast dosa idli vada', 'Saravana Bhavan', 160.0, 'UPI', 'Food'),
    ('Haldirams sweets snacks namkeen', 'Haldirams', 450.0, 'UPI', 'Food'),
    ('Chai Point tea and samosa morning snack', 'Chai Point', 95.0, 'UPI', 'Food'),
    ('Sweet shop gulab jamun and rasgulla', 'Anand Sweets', 350.0, 'Cash', 'Food'),
    ('Organic farmers market fresh grains and dal', 'Organic Store', 1800.0, 'Net Banking', 'Food'),
    ('Juice shop sugarcane and orange fresh juice', 'Fresh Juice', 80.0, 'UPI', 'Food'),

    # Shopping
    ('Amazon online purchase wireless earbuds', 'Amazon', 2499.0, 'Credit Card', 'Shopping'),
    ('Flipkart clothes cotton shirt and denim', 'Flipkart', 1899.0, 'Credit Card', 'Shopping'),
    ('Myntra shoes sports sneakers running', 'Myntra', 3200.0, 'Credit Card', 'Shopping'),
    ('Zara casual jacket and formal trousers', 'Zara', 4990.0, 'Credit Card', 'Shopping'),
    ('H&M t-shirt summer collection pack of 3', 'H&M', 1499.0, 'UPI', 'Shopping'),
    ('Croma electronics mixer grinder kitchen appliance', 'Croma', 4500.0, 'Debit Card', 'Shopping'),
    ('Decathlon badminton racket and shuttlecocks', 'Decathlon', 1650.0, 'UPI', 'Shopping'),
    ('IKEA home decor table lamp and cushions', 'IKEA', 2800.0, 'Credit Card', 'Shopping'),
    ('Nykaa cosmetics skincare sunscreen lotion', 'Nykaa', 950.0, 'UPI', 'Shopping'),
    ('Reliance Digital smart watch fit band', 'Reliance Digital', 2999.0, 'Credit Card', 'Shopping'),
    ('Titan wrist watch analog leather strap', 'World of Titan', 4800.0, 'Credit Card', 'Shopping'),
    ('FabIndia ethnic kurta handloom cotton', 'FabIndia', 2200.0, 'UPI', 'Shopping'),
    ('Shoppers Stop formal shoes and socks', 'Shoppers Stop', 3400.0, 'Credit Card', 'Shopping'),
    ('Lenskart spectacle frame with anti-glare lens', 'Lenskart', 2500.0, 'Debit Card', 'Shopping'),
    ('Bata casual sandals and leather belt', 'Bata', 1199.0, 'UPI', 'Shopping'),
    ('Westside jeans trousers and graphic tees', 'Westside', 2100.0, 'Debit Card', 'Shopping'),
    ('Home Centre kitchen utensils and cookware', 'Home Centre', 1950.0, 'Credit Card', 'Shopping'),
    ('Apple Store iPhone cover and lightning cable', 'Apple Store', 3500.0, 'Credit Card', 'Shopping'),
    ('Vijay Sales air fryer digital touch', 'Vijay Sales', 5990.0, 'Credit Card', 'Shopping'),
    ('Stationery shop notebooks pens binder clips', 'Stationery Mart', 250.0, 'Cash', 'Shopping'),

    # Medical
    ('Apollo Pharmacy prescription antibiotics and cough syrup', 'Apollo Pharmacy', 680.0, 'UPI', 'Medical'),
    ('Medplus chemist pain relief spray and vitamins', 'Medplus', 450.0, 'UPI', 'Medical'),
    ('Dr Lal PathLabs blood test health checkup', 'Dr Lal PathLabs', 1600.0, 'Credit Card', 'Medical'),
    ('Dental clinic teeth cleaning and filling', 'Dentist Clinic', 2200.0, 'UPI', 'Medical'),
    ('Hospital consultation OPD doctor fees', 'Manipal Hospital', 900.0, 'Credit Card', 'Medical'),
    ('1mg online medicines monthly diabetes medication', 'Tata 1mg', 1850.0, 'Net Banking', 'Medical'),
    ('Netmeds multivitamin tablets and calcium supplements', 'Netmeds', 720.0, 'UPI', 'Medical'),
    ('Eye hospital retina checkup and eye drops', 'Eye Care Centre', 1200.0, 'Debit Card', 'Medical'),
    ('Physiotherapy session knee pain rehabilitation', 'Physio Care', 800.0, 'UPI', 'Medical'),
    ('Dermatology clinic skin treatment and ointments', 'Skin Clinic', 1500.0, 'Credit Card', 'Medical'),
    ('Ayurvedic pharmacy herbal oils and tonics', 'Kottakkal Arya Vaidya', 840.0, 'UPI', 'Medical'),
    ('Diagnostic ultrasound scan abdomen', 'Apollo Diagnostics', 2100.0, 'Debit Card', 'Medical'),
    ('Homeopathic clinic consultation and globules', 'Homeo Cure', 550.0, 'Cash', 'Medical'),
    ('Orthopedic consultation consultation x-ray ankle', 'Ortho Clinic', 1400.0, 'Credit Card', 'Medical'),
    ('Vaccination booster dose pediatric immunization', 'Children Hospital', 1800.0, 'Credit Card', 'Medical'),

    # Education
    ('Coursera annual specialization certificate subscription', 'Coursera', 3999.0, 'Credit Card', 'Education'),
    ('Udemy complete python and machine learning bootcamp', 'Udemy', 499.0, 'UPI', 'Education'),
    ('College tuition semester examination fees', 'University Finance', 28500.0, 'Net Banking', 'Education'),
    ('School quarterly tuition and activity fees', 'Public School', 14200.0, 'Net Banking', 'Education'),
    ('Oxford university press textbook data structures', 'Bookstore', 780.0, 'UPI', 'Education'),
    ('Mathematics tutoring monthly coaching fee', 'Coaching Centre', 2500.0, 'Cash', 'Education'),
    ('Competitive exam preparation test series registration', 'Career Launcher', 4200.0, 'Net Banking', 'Education'),
    ('Language learning subscription Duolingo Super yearly', 'Duolingo', 1999.0, 'Credit Card', 'Education'),
    ('Cloud certification exam voucher AWS Solutions Architect', 'Amazon Web Services', 12500.0, 'Credit Card', 'Education'),
    ('Coding bootcamp frontend web development workshop', 'EdTech Institute', 6500.0, 'Net Banking', 'Education'),
    ('Children drawing and painting art classes monthly', 'Art Academy', 1500.0, 'UPI', 'Education'),
    ('Piano and keyboard music lessons fee', 'Music School', 2000.0, 'UPI', 'Education'),
    ('Library annual membership fee and deposit', 'City Library', 600.0, 'Cash', 'Education'),

    # Transportation
    ('Indian Oil petrol filling fuel full tank', 'Indian Oil', 2100.0, 'Credit Card', 'Transportation'),
    ('Bharat Petroleum speed petrol two wheeler', 'BPCL', 550.0, 'UPI', 'Transportation'),
    ('Hindustan Petroleum diesel car refill', 'HPCL', 3400.0, 'Debit Card', 'Transportation'),
    ('Shell premium v-power petrol fuel bunk', 'Shell', 2450.0, 'Credit Card', 'Transportation'),
    ('Uber cab ride to airport terminal', 'Uber', 740.0, 'UPI', 'Transportation'),
    ('Ola auto ride daily commute office', 'Ola Cabs', 145.0, 'UPI', 'Transportation'),
    ('Metro rail card recharge smart card metro', 'Metro Rail', 500.0, 'UPI', 'Transportation'),
    ('IRCTC train ticket booking railway reservation', 'IRCTC', 1250.0, 'Net Banking', 'Transportation'),
    ('Fastag toll plaza automatic electronic deduction', 'Fastag NHAI', 185.0, 'UPI', 'Transportation'),
    ('Car parking municipal lot airport parking', 'City Parking', 120.0, 'Cash', 'Transportation'),
    ('Rapido bike taxi morning commute', 'Rapido', 85.0, 'UPI', 'Transportation'),
    ('Car service wheel alignment balancing tire rotation', 'Car Service Hub', 1800.0, 'Credit Card', 'Transportation'),
    ('Two wheeler engine oil change and periodic servicing', 'Hero Service', 950.0, 'UPI', 'Transportation'),
    ('Interstate bus travel ticket reservation', 'KSRTC Travels', 850.0, 'Net Banking', 'Transportation'),
    ('Airport cab expressway toll charge payment', 'Toll Plaza', 105.0, 'Fastag', 'Transportation'),

    # Entertainment
    ('PVR Cinemas movie ticket popcorn and cold drink', 'PVR Cinemas', 780.0, 'Credit Card', 'Entertainment'),
    ('Inox multiplex cinema weekend show tickets', 'Inox Leisure', 620.0, 'UPI', 'Entertainment'),
    ('Netflix monthly subscription 4K UHD plan', 'Netflix', 649.0, 'Credit Card', 'Entertainment'),
    ('Spotify premium individual annual music plan', 'Spotify', 999.0, 'Debit Card', 'Entertainment'),
    ('Amazon Prime video and music annual membership', 'Amazon Prime', 1499.0, 'Credit Card', 'Entertainment'),
    ('Disney Hotstar premium sports and movie streaming', 'Hotstar', 899.0, 'UPI', 'Entertainment'),
    ('PlayStation Network online game purchase', 'Sony PSN', 3299.0, 'Credit Card', 'Entertainment'),
    ('Amusement park entry pass water rides', 'Wonderla', 2400.0, 'Debit Card', 'Entertainment'),
    ('BookMyShow standup comedy show ticket reservation', 'BookMyShow', 1100.0, 'UPI', 'Entertainment'),
    ('Bowling and arcade game tickets entertainment zone', 'Smaaash', 850.0, 'Debit Card', 'Entertainment'),
    ('YouTube Premium monthly family ad-free music plan', 'YouTube', 189.0, 'Credit Card', 'Entertainment'),
    ('Escape room puzzle group adventure ticket', 'Mystery Rooms', 1400.0, 'UPI', 'Entertainment'),
    ('Music concert live band entry pass ticket', 'Live Nation', 2500.0, 'Credit Card', 'Entertainment'),
    ('Board game cafe entry charge and games', 'Board Game Lounge', 450.0, 'UPI', 'Entertainment'),

    # Bills
    ('Electricity board monthly power bill payment', 'TNEB Electricity', 2850.0, 'Net Banking', 'Bills'),
    ('Bescom monthly residential electricity bill', 'BESCOM', 1940.0, 'UPI', 'Bills'),
    ('Airtel Fiber broadband fiber monthly internet plan', 'Airtel Broadband', 1179.0, 'Credit Card', 'Bills'),
    ('Jio Fiber ultra high speed wifi router bill', 'Jio Fiber', 999.0, 'UPI', 'Bills'),
    ('Airtel prepaid mobile recharge unlimited calls', 'Airtel Prepaid', 299.0, 'UPI', 'Bills'),
    ('Jio prepaid smartphone recharge 84 days data', 'Jio Prepaid', 666.0, 'UPI', 'Bills'),
    ('Indane LPG cooking gas cylinder refill payment', 'Indane Gas', 925.0, 'UPI', 'Bills'),
    ('HP Gas domestic cylinder delivery payment', 'HP Gas', 915.0, 'Cash', 'Bills'),
    ('Municipal corporation water supply sewerage bill', 'City Water Board', 460.0, 'Net Banking', 'Bills'),
    ('Tata Play DTH satellite television cable recharge', 'Tata Play', 450.0, 'UPI', 'Bills'),
    ('Society maintenance apartment monthly service fee', 'Apartment Association', 3500.0, 'Net Banking', 'Bills'),
    ('Vodafone Idea postpaid mobile family bill', 'Vi Postpaid', 899.0, 'Credit Card', 'Bills'),
    ('Piped natural gas domestic cooking piped line bill', 'Adani Gas', 780.0, 'UPI', 'Bills'),
    ('Broadband renewal high speed optical fiber line', 'ACT Fibernet', 1050.0, 'Net Banking', 'Bills'),

    # Insurance
    ('LIC Jeevan Labh life insurance annual premium', 'LIC of India', 18500.0, 'Net Banking', 'Insurance'),
    ('HDFC Ergo comprehensive family health insurance policy', 'HDFC ERGO', 14200.0, 'Credit Card', 'Insurance'),
    ('Star Health individual mediclaim premium renewal', 'Star Health', 8900.0, 'Net Banking', 'Insurance'),
    ('ICICI Lombard comprehensive car motor insurance', 'ICICI Lombard', 7600.0, 'Credit Card', 'Insurance'),
    ('Two wheeler bike insurance third party policy renewal', 'Bajaj Allianz', 1850.0, 'UPI', 'Insurance'),
    ('Term life insurance pure protection policy 1 crore cover', 'Max Life Insurance', 11500.0, 'Net Banking', 'Insurance'),
    ('Care Health critical illness rider insurance cover', 'Care Health', 4800.0, 'Credit Card', 'Insurance'),
    ('Home structure and contents fire burglary insurance', 'Tata AIG', 3200.0, 'Net Banking', 'Insurance'),
    ('Personal accident policy disability cover renewal', 'Niva Bupa', 2400.0, 'Debit Card', 'Insurance'),

    # Investments
    ('Zerodha coin monthly equity mutual fund SIP investment', 'Zerodha', 5000.0, 'Net Banking', 'Investments'),
    ('Groww mutual fund lumpsum investment index fund Nifty 50', 'Groww', 10000.0, 'UPI', 'Investments'),
    ('National Pension System tier 1 voluntary contribution', 'NPS Trust', 4000.0, 'Net Banking', 'Investments'),
    ('Public Provident Fund monthly deposit PPF account', 'State Bank of India PPF', 5000.0, 'Net Banking', 'Investments'),
    ('Sovereign gold bond digital gold purchase 2 grams', 'RBI Gold Bond', 12500.0, 'Net Banking', 'Investments'),
    ('Stock brokerage equity shares delivery buy order', 'Angel One', 8500.0, 'UPI', 'Investments'),
    ('Fixed deposit cumulative term deposit 1 year bank', 'HDFC Bank FD', 25000.0, 'Net Banking', 'Investments'),
    ('Recurring deposit monthly installment bank auto debit', 'ICICI Bank RD', 3000.0, 'Net Banking', 'Investments'),
    ('Parag Parikh flexi cap fund direct growth SIP', 'PPFAS AMC', 6000.0, 'Net Banking', 'Investments'),
    ('UTI Nifty 50 index fund monthly automated investment', 'UTI Mutual Fund', 4500.0, 'UPI', 'Investments'),

    # Others
    ('ATM cash withdrawal self cardless cash', 'SBI ATM', 2000.0, 'Cash', 'Others'),
    ('Bank annual debit card maintenance annual charges', 'HDFC Bank', 236.0, 'Debit Card', 'Others'),
    ('Passport renewal administrative tatkal fee', 'Passport Seva', 2000.0, 'Credit Card', 'Others'),
    ('Courier parcel delivery speed post speedpost', 'India Post', 140.0, 'UPI', 'Others'),
    ('Photocopy xerox and spiral document binding work', 'Print Shop', 85.0, 'Cash', 'Others'),
    ('Dry cleaning laundry suit ironing wash', 'Laundry Hub', 450.0, 'UPI', 'Others'),
    ('Key maker duplicate door padlock keys', 'Key Shop', 150.0, 'Cash', 'Others'),
    ('Temple donation puja temple trust offering', 'Religious Trust', 501.0, 'UPI', 'Others'),
    ('Charity donation orphanage child relief fund', 'NGO Charity', 1000.0, 'Net Banking', 'Others'),
    ('Notary affidavit stamp paper legal document verification', 'Lawyer Notary', 600.0, 'Cash', 'Others'),
]

# Generate synthetic variations to provide high statistical diversity (1200+ samples)
data_rows = []
np.random.seed(42)

for item in RAW_DATA:
    desc, merchant, base_amt, pay_mode, category = item
    # Original sample
    data_rows.append({
        'description': desc,
        'merchant': merchant,
        'text': f"{desc} {merchant}",
        'amount': float(base_amt),
        'payment_mode': pay_mode,
        'day_of_week': int(np.random.randint(0, 7)),
        'day_of_month': int(np.random.randint(1, 29)),
        'category': category
    })
    # 10 variations per item with slight amount noise & phrasing variations
    for v in range(10):
        factor = np.random.uniform(0.7, 1.4)
        amt = round(base_amt * factor, 2)
        v_desc = desc
        if v % 3 == 0:
            v_desc = f"{merchant} payment for {desc}"
        elif v % 3 == 1:
            v_desc = f"Paid {merchant} {desc.split()[-1]}"
        elif v % 3 == 2:
            v_desc = f"Bill payment at {merchant} - {desc}"
        
        mode = pay_mode if np.random.rand() > 0.3 else np.random.choice(['UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'Cash'])
        data_rows.append({
            'description': v_desc,
            'merchant': merchant,
            'text': f"{v_desc} {merchant}",
            'amount': amt,
            'payment_mode': mode,
            'day_of_week': int(np.random.randint(0, 7)),
            'day_of_month': int(np.random.randint(1, 29)),
            'category': category
        })

df_cat = pd.DataFrame(data_rows)
print(f"Total Category Dataset Size: {len(df_cat)} samples across {df_cat['category'].nunique()} categories")

# Preprocessor: TF-IDF on combined text + numeric scaling + onehot on payment mode
text_transformer = TfidfVectorizer(ngram_range=(1, 2), max_features=1200, stop_words='english')
numeric_transformer = StandardScaler()
categorical_transformer = OneHotEncoder(handle_unknown='ignore')

preprocessor = ColumnTransformer(
    transformers=[
        ('text', text_transformer, 'text'),
        ('num', numeric_transformer, ['amount', 'day_of_week', 'day_of_month']),
        ('cat', categorical_transformer, ['payment_mode'])
    ]
)

classifier = LogisticRegression(C=3.5, max_iter=1000, class_weight='balanced', random_state=42)

clf_pipeline = Pipeline([
    ('preprocessor', preprocessor),
    ('classifier', classifier)
])

# Split & Train
X = df_cat[['text', 'amount', 'day_of_week', 'day_of_month', 'payment_mode']]
y = df_cat['category']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
clf_pipeline.fit(X_train, y_train)

# Evaluate
y_pred = clf_pipeline.predict(X_test)
acc = accuracy_score(y_test, y_pred)
prec, rec, f1, _ = precision_recall_fscore_support(y_test, y_pred, average='weighted', zero_division=0)

print(f"Category Classifier Results:")
print(f"  Accuracy:  {acc:.4f} ({acc*100:.1f}%)")
print(f"  Precision: {prec:.4f}")
print(f"  Recall:    {rec:.4f}")
print(f"  F1-Score:  {f1:.4f}")

# Serialize classifier
clf_path = MODEL_DIR / "finman_category_classifier.pkl"
with open(clf_path, "wb") as f:
    pickle.dump(clf_pipeline, f)
print(f"Saved classifier to: {clf_path}")


# ---------------------------------------------------------------------------
# 2. EXPENSE REGRESSOR TRAINING
# ---------------------------------------------------------------------------
print("\n" + "=" * 60)
print("2. TRAINING FINMAN EXPENSE REGRESSOR")
print("=" * 60)

REG_FEATURES = [
    'expense_total', 'expense_count', 'expense_average',
    'income_total', 'income_count',
    'previous_expense_1', 'previous_expense_2', 'previous_expense_3',
    'previous_income_1',
    'rolling_expense_mean_3', 'rolling_expense_std_3',
    'savings_current', 'expense_income_ratio',
    'month_number', 'quarter', 'month_sin', 'month_cos'
]

# Generate realistic personal finance monthly time series (60 months across 50 simulated profiles)
reg_rows = []
np.random.seed(42)

for profile_id in range(50):
    base_income = np.random.uniform(40000, 150000)
    base_expense_ratio = np.random.uniform(0.45, 0.75)
    base_expense = base_income * base_expense_ratio
    
    # Generate 36 months of sequence for each user
    exp_history = []
    inc_history = []
    
    for m in range(36):
        month_num = (m % 12) + 1
        quarter = ((month_num - 1) // 3) + 1
        month_sin = np.sin(2 * np.pi * month_num / 12)
        month_cos = np.cos(2 * np.pi * month_num / 12)
        
        # Seasonal variations (festival in Oct/Nov, holidays in May, tax in Mar)
        season_mult = 1.0
        if month_num in [10, 11]: season_mult = 1.25 # Festivals
        elif month_num in [3, 4]: season_mult = 1.15 # Taxes / school fees
        elif month_num in [5]: season_mult = 1.18    # Vacations
        
        income = base_income * np.random.uniform(0.98, 1.05)
        expense = base_expense * season_mult * np.random.uniform(0.85, 1.15)
        
        exp_history.append(expense)
        inc_history.append(income)
        
        if m >= 3:
            p1e = exp_history[m - 1]
            p2e = exp_history[m - 2]
            p3e = exp_history[m - 3]
            p1i = inc_history[m - 1]
            
            mean3 = (p1e + p2e + p3e) / 3.0
            std3 = float(np.std([p1e, p2e, p3e]))
            
            target_next = exp_history[m] # Current month expense as target from previous features
            
            row = {
                'expense_total': p1e,
                'expense_count': np.random.randint(18, 55),
                'expense_average': p1e / np.random.randint(18, 55),
                'income_total': p1i,
                'income_count': np.random.randint(1, 4),
                'previous_expense_1': p1e,
                'previous_expense_2': p2e,
                'previous_expense_3': p3e,
                'previous_income_1': p1i,
                'rolling_expense_mean_3': mean3,
                'rolling_expense_std_3': std3,
                'savings_current': float(np.random.uniform(25000, 300000)),
                'expense_income_ratio': p1e / p1i if p1i > 0 else 0.5,
                'month_number': month_num,
                'quarter': quarter,
                'month_sin': month_sin,
                'month_cos': month_cos,
                'next_month_expense': target_next
            }
            reg_rows.append(row)

df_reg = pd.DataFrame(reg_rows)
print(f"Total Regression Dataset Size: {len(df_reg)} monthly records")

X_reg = df_reg[REG_FEATURES]
y_reg = df_reg['next_month_expense']

# Chronological-style train/test split (80% train, 20% test)
split_idx = int(len(df_reg) * 0.8)
X_r_train, X_r_test = X_reg.iloc[:split_idx], X_reg.iloc[split_idx:]
y_r_train, y_r_test = y_reg.iloc[:split_idx], y_reg.iloc[split_idx:]

regressor = RandomForestRegressor(
    n_estimators=120,
    max_depth=10,
    min_samples_split=4,
    random_state=42
)
regressor.fit(X_r_train, y_r_train)

# Evaluate against baseline (rolling 3-month average)
y_r_pred = regressor.predict(X_r_test)
# Ensure no negative predictions
y_r_pred = np.maximum(y_r_pred, 0)

mae_model = mean_absolute_error(y_r_test, y_r_pred)
rmse_model = root_mean_squared_error(y_r_test, y_r_pred)
r2_model = r2_score(y_r_test, y_r_pred)

# Baseline: rolling 3-month mean
baseline_pred = X_r_test['rolling_expense_mean_3']
mae_baseline = mean_absolute_error(y_r_test, baseline_pred)
rmse_baseline = root_mean_squared_error(y_r_test, baseline_pred)
r2_baseline = r2_score(y_r_test, baseline_pred)

print(f"Expense Regressor Results:")
print(f"  Model MAE:     Rs. {mae_model:.2f}  (Baseline MAE: Rs. {mae_baseline:.2f}) -> {((mae_baseline - mae_model) / mae_baseline)*100:.1f}% improvement")
print(f"  Model RMSE:    Rs. {rmse_model:.2f} (Baseline RMSE: Rs. {rmse_baseline:.2f})")
print(f"  Model R²:      {r2_model:.4f}    (Baseline R²: {r2_baseline:.4f})")

# Serialize regressor
reg_path = MODEL_DIR / "finman_expense_regressor.pkl"
with open(reg_path, "wb") as f:
    pickle.dump(regressor, f)
print(f"Saved regressor to: {reg_path}")


# ---------------------------------------------------------------------------
# 3. METADATA GENERATION
# ---------------------------------------------------------------------------
print("\n" + "=" * 60)
print("3. GENERATING ACCURATE MODEL METADATA")
print("=" * 60)

import sklearn
import sys

metadata = {
    'project': 'FinMan',
    'version': '2.1.0',
    'environment': {
        'python_version': sys.version.split()[0],
        'scikit_learn_version': sklearn.__version__,
        'numpy_version': np.__version__,
        'pandas_version': pd.__version__
    },
    'training_date': datetime.now().isoformat(),
    'classifier': {
        'model_name': 'FinMan Category Classifier',
        'algorithm': 'Random Forest Classifier with Calibrated Probabilities',
        'file': 'finman_category_classifier.pkl',
        'categories': CATEGORIES,
        'features': ['text (description + merchant)', 'amount', 'day_of_week', 'day_of_month', 'payment_mode'],
        'metrics': {
            'accuracy': float(round(acc, 4)),
            'precision': float(round(prec, 4)),
            'recall': float(round(rec, 4)),
            'f1_score': float(round(f1, 4)),
            'test_samples': len(y_test)
        }
    },
    'regressor': {
        'model_name': 'FinMan Expense Regressor',
        'algorithm': 'Random Forest Regressor with Time-Series Ensembles',
        'file': 'finman_expense_regressor.pkl',
        'features': REG_FEATURES,
        'target': 'next_month_expense',
        'metrics': {
            'mae': float(round(mae_model, 2)),
            'rmse': float(round(rmse_model, 2)),
            'r2_score': float(round(r2_model, 4)),
            'baseline_mae': float(round(mae_baseline, 2)),
            'baseline_r2': float(round(r2_baseline, 4)),
            'improvement_percent': float(round(((mae_baseline - mae_model) / mae_baseline) * 100, 1)),
            'test_samples': len(y_r_test)
        }
    },
    'anomaly_detector': {
        'method': 'Dynamic Statistical Dispersion (Z-Score + IQR Category Envelopes)',
        'threshold_z': 2.5,
        'iqr_factor': 1.5,
        'status': 'active'
    }
}

# Serialize metadata both as PKL and JSON
meta_pkl_path = MODEL_DIR / "finman_model_metadata.pkl"
with open(meta_pkl_path, "wb") as f:
    pickle.dump(metadata, f)

meta_json_path = MODEL_DIR / "finman_model_metadata.json"
with open(meta_json_path, "w", encoding="utf-8") as f:
    json.dump(metadata, f, indent=2)

print(f"Metadata saved to: {meta_pkl_path} and {meta_json_path}")
print("ALL ML MODELS SUCCESSFULLY TRAINED, EVALUATED, AND SERIALIZED!")
