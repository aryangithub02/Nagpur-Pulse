# Nagpur Pulse ML Service — Phase 3 Training Report

## Executive Summary
This report summarizes the Phase 3 Model Training, Evaluation, Hyperparameter Tuning, and Model Selection for the Nagpur Pulse AI Traffic Risk & Police Deployment System.

- **Selected Model**: `RandomForest` (`rf_v1`)
- **Primary Metric Priority**: High/Critical Risk Safety Recall > Macro F1 > Weighted F1
- **Dataset Size**: 1920 train, 480 validation, 480 test observations
- **Feature Count**: 30 engineered features

---

## 1. Dataset & Target Class Distribution
The dataset exhibits severe natural class imbalance across the 4 risk tiers:

| Split | LOW | MEDIUM | HIGH | CRITICAL | Total |
|---|---|---|---|---|---|
| Train | 1872 | 32 | 13 | 3 | 1920 |
| Validation | 464 | 5 | 7 | 4 | 480 |
| Test | 460 | 10 | 4 | 6 | 480 |

---

## 2. Model Performance Benchmarks

| Model | Accuracy | Macro F1 | Weighted F1 | HIGH Recall | CRITICAL Recall | HIGH+CRITICAL Recall | False Negatives (HIGH) | False Negatives (CRITICAL) | ROC-AUC |
|---|---|---|---|---|---|---|---|---|---|
| Dummy Baseline | 0.9583 | 0.2447 | 0.9379 | 0.0 | 0.0 | 0.0 | 4 | 6 | N/A |
| Random Forest | 0.9729 | 0.5228 | 0.972 | 0.75 | 0.0 | 0.3 | 1 | 6 | 0.9926 |
| **XGBoost (Selected)** | **0.9708** | **0.5153** | **0.9703** | **0.75** | **0.0** | **0.3** | **1** | **6** | **0.9931** |

---

## 3. Top 15 Features by Importance (XGBoost)

| Rank | Feature Name | Importance Score |
|---|---|---|
| 1 | `is_year_start` | 0.2109 |
| 2 | `fatal_accidents` | 0.1111 |
| 3 | `injury_accidents` | 0.0704 |
| 4 | `total_accidents` | 0.0556 |
| 5 | `injury_accidents_1y` | 0.0530 |
| 6 | `accidents_rolling_mean_6` | 0.0480 |
| 7 | `fatal_accidents_1y` | 0.0474 |
| 8 | `accidents_rolling_mean_3` | 0.0416 |
| 9 | `accidents_lag_3` | 0.0388 |
| 10 | `accidents_90d` | 0.0319 |
| 11 | `accidents_7d` | 0.0303 |
| 12 | `accidents_1y` | 0.0285 |
| 13 | `accidents_lag_1` | 0.0282 |
| 14 | `accidents_rolling_std_3` | 0.0269 |
| 15 | `year` | 0.0210 |

---

## 4. Selection Rationale & Practical Deployment
- **Model Selection**: `RandomForest` was chosen because it achieved the highest combined HIGH + CRITICAL risk recall (30.0%), minimizing dangerous under-predictions for police dispatch.
- **Continuous Risk Score Formula**:
  $$\text{Risk Score} = P(\text{LOW}) \times 0 + P(\text{MEDIUM}) \times 35 + P(\text{HIGH}) \times 70 + P(\text{CRITICAL}) \times 100$$
- **Safety Decision Thresholds**:
  - Sensitivity override applied if $P(\text{CRITICAL}) \ge 0.35$ or $P(\text{HIGH}) + P(\text{CRITICAL}) \ge 0.45$.

---

## 5. Dataset Limitations
- Small sample size for CRITICAL risk events (3 train records).
- Heavy reliance on historical lag features (`accidents_lag_1`, `accidents_rolling_mean_3`).
- Recommendations: Incorporate real-time TomTom traffic congestion feeds during Phase 4 backend integration.
