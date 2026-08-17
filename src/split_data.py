import pandas as pd
from pathlib import Path

INPUT_FILE = Path("data/processed/junction_training_data.csv")

TRAIN_FILE = Path("data/processed/train.csv")
TEST_FILE = Path("data/processed/test.csv")


def main():

    print("=" * 70)
    print("NAGPUR PULSE - TIME BASED DATA SPLIT")
    print("=" * 70)

    df = pd.read_csv(INPUT_FILE)

    df["period_date"] = pd.to_datetime(df["period_date"])

    print(f"\nTotal records: {len(df)}")

    print("\nDate range:")
    print("Minimum:", df["period_date"].min())
    print("Maximum:", df["period_date"].max())

    # ---------------------------------------------------------
    # Remove rows where historical features are unavailable.
    # ---------------------------------------------------------

    required_history = [
        "accidents_90d",
        "accidents_1y",
        "fatal_accidents_1y",
        "injury_accidents_1y",
        "historical_accident_rate"
    ]

    before = len(df)

    df = df.dropna(
        subset=required_history
    ).copy()

    print(
        f"\nRows removed due to insufficient history: "
        f"{before - len(df)}"
    )

    # ---------------------------------------------------------
    # Remove rows without a future target.
    # ---------------------------------------------------------

    df = df.dropna(
        subset=["risk_level"]
    ).copy()

    # ---------------------------------------------------------
    # TIME-BASED SPLIT
    #
    # Training:
    # 2020-2024
    #
    # Testing:
    # 2025
    # ---------------------------------------------------------

    train = df[
        df["period_date"].dt.year < 2025
    ].copy()

    test = df[
        df["period_date"].dt.year == 2025
    ].copy()

    print("\nTRAIN DATA")
    print("-" * 70)
    print("Rows:", len(train))
    print(
        "Date:",
        train["period_date"].min(),
        "→",
        train["period_date"].max()
    )

    print("\nTEST DATA")
    print("-" * 70)
    print("Rows:", len(test))
    print(
        "Date:",
        test["period_date"].min(),
        "→",
        test["period_date"].max()
    )

    print("\nTRAIN CLASS DISTRIBUTION")
    print(
        train["risk_level"]
        .value_counts()
    )

    print("\nTEST CLASS DISTRIBUTION")
    print(
        test["risk_level"]
        .value_counts()
    )

    # ---------------------------------------------------------
    # Save
    # ---------------------------------------------------------

    TRAIN_FILE.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    train.to_csv(
        TRAIN_FILE,
        index=False
    )

    test.to_csv(
        TEST_FILE,
        index=False
    )

    print("\nSaved:")
    print(TRAIN_FILE)
    print(TEST_FILE)

    print("\n" + "=" * 70)
    print("TIME-BASED SPLIT COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    main()