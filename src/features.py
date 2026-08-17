import pandas as pd
import numpy as np
from pathlib import Path

INPUT_FILE = Path("data/processed/accidents_clean.csv")
OUTPUT_FILE = Path("data/processed/junction_training_data.csv")


def load_data():
    df = pd.read_csv(INPUT_FILE)

    df["date"] = pd.to_datetime(df["date"])

    return df.sort_values("date").reset_index(drop=True)


def add_severity_weights(df):

    severity_weights = {
        "Minor": 1,
        "Moderate": 2,
        "Severe": 4,
        "Fatal": 6
    }

    df["severity_weight"] = (
        df["severity"]
        .map(severity_weights)
        .fillna(1)
    )

    return df


def create_monthly_junction_data(df):

    # Create monthly prediction periods
    df["period"] = df["date"].dt.to_period("M")

    monthly = (
        df.groupby(["junction", "period"])
        .agg(
            accident_count=("accidentid", "count"),
            severe_accidents=(
                "severity_weight",
                lambda x: (x >= 4).sum()
            ),
            fatal_accidents=(
                "severity",
                lambda x: (x == "Fatal").sum()
            ),
            injured_count=("injuredcount", "sum"),
            fatality_count=("fatalitycount", "sum"),
            vehicles_involved=("vehiclesinvolved", "sum")
        )
        .reset_index()
    )

    return monthly


def create_historical_features(monthly):

    monthly = monthly.sort_values(
        ["junction", "period"]
    ).reset_index(drop=True)

    # Convert period to timestamp for easier calculations
    monthly["period_date"] = monthly["period"].dt.to_timestamp()

    feature_frames = []

    for junction, group in monthly.groupby("junction"):

        group = group.sort_values("period_date").copy()

        group["accidents_7d"] = (
            group["accident_count"]
            .shift(1)
            .rolling(1)
            .sum()
        )

        group["accidents_30d"] = (
            group["accident_count"]
            .shift(1)
            .rolling(1)
            .sum()
        )

        group["accidents_90d"] = (
            group["accident_count"]
            .shift(1)
            .rolling(3)
            .sum()
        )

        group["accidents_1y"] = (
            group["accident_count"]
            .shift(1)
            .rolling(12)
            .sum()
        )

        group["fatal_accidents_1y"] = (
            group["fatal_accidents"]
            .shift(1)
            .rolling(12)
            .sum()
        )

        group["injury_accidents_1y"] = (
            group["injured_count"]
            .shift(1)
            .rolling(12)
            .sum()
        )

        group["historical_accident_rate"] = (
            group["accidents_1y"] / 12
        )

        feature_frames.append(group)

    result = pd.concat(
        feature_frames,
        ignore_index=True
    )

    return result


def create_target(df):

    # Future-period accident severity score.
    #
    # This is deliberately based on the NEXT month,
    # so current/past information is not used to
    # manufacture the target.

    future = df[
        [
            "junction",
            "period_date",
            "accident_count",
            "severe_accidents",
            "fatal_accidents",
            "injured_count"
        ]
    ].copy()

    future["target_period"] = (
        future["period_date"]
        - pd.DateOffset(months=1)
    )

    future = future.rename(
        columns={
            "accident_count": "future_accidents",
            "severe_accidents": "future_severe_accidents",
            "fatal_accidents": "future_fatal_accidents",
            "injured_count": "future_injuries"
        }
    )

    target = future[
        [
            "junction",
            "target_period",
            "future_accidents",
            "future_severe_accidents",
            "future_fatal_accidents",
            "future_injuries"
        ]
    ]

    df = df.merge(
        target,
        left_on=["junction", "period_date"],
        right_on=["junction", "target_period"],
        how="left"
    )

    # Weighted future risk score
    df["future_risk_score"] = (
        df["future_accidents"].fillna(0) * 1.0
        + df["future_severe_accidents"].fillna(0) * 3.0
        + df["future_fatal_accidents"].fillna(0) * 5.0
        + df["future_injuries"].fillna(0) * 0.2
    )

    # Convert score to LOW / MEDIUM / HIGH.
    #
    # IMPORTANT:
    # These are prototype thresholds and will be
    # reviewed after seeing the actual distribution.

    q1 = df["future_risk_score"].quantile(0.33)
    q2 = df["future_risk_score"].quantile(0.66)

    def risk_class(score):

        if score <= q1:
            return "LOW"

        if score <= q2:
            return "MEDIUM"

        return "HIGH"

    df["risk_level"] = (
        df["future_risk_score"]
        .apply(risk_class)
    )

    return df


def main():

    print("=" * 70)
    print("NAGPUR PULSE - FEATURE ENGINEERING")
    print("=" * 70)

    df = load_data()

    print(f"\nRaw records: {len(df)}")

    df = add_severity_weights(df)

    monthly = create_monthly_junction_data(df)

    print(f"Monthly junction records: {len(monthly)}")

    features = create_historical_features(monthly)

    features = create_target(features)

    print("\nRisk distribution:")

    print(
        features["risk_level"]
        .value_counts()
    )

    print("\nGenerated columns:")

    for column in features.columns:
        print(column)

    OUTPUT_FILE.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    features.to_csv(
        OUTPUT_FILE,
        index=False
    )

    print("\nSaved:")
    print(OUTPUT_FILE)

    print("\n" + "=" * 70)
    print("FEATURE ENGINEERING COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    main()