import pandas as pd
from pathlib import Path

# ============================================================
# NAGPUR PULSE
# Raw Accident Data -> Clean Dataset
# ============================================================

INPUT_FILE = Path("data/raw/nagpur_accidents_2020_2025.xlsx")
OUTPUT_FILE = Path("data/processed/accidents_clean.csv")

SHEET_NAME = "Raw_AccidentLog"


def load_data():
    print("=" * 70)
    print("NAGPUR PULSE - DATA PREPROCESSING")
    print("=" * 70)

    print("\nLoading accident data...")

    df = pd.read_excel(
        INPUT_FILE,
        sheet_name=SHEET_NAME
    )

    print(f"Loaded rows    : {len(df)}")
    print(f"Loaded columns : {len(df.columns)}")

    return df


def clean_data(df):

    print("\n[1] Cleaning column names")

    df.columns = (
        df.columns
        .str.strip()
        .str.lower()
        .str.replace(" ", "_")
    )

    print(df.columns.tolist())

    # --------------------------------------------------------
    # Remove completely empty rows
    # --------------------------------------------------------

    df = df.dropna(how="all")

    # --------------------------------------------------------
    # Remove duplicate accident records
    # --------------------------------------------------------

    before = len(df)

    df = df.drop_duplicates(subset=["accidentid"])

    removed = before - len(df)

    print(f"\nDuplicate accident records removed: {removed}")

    # --------------------------------------------------------
    # Date
    # --------------------------------------------------------

    df["date"] = pd.to_datetime(
        df["date"],
        errors="coerce"
    )

    # --------------------------------------------------------
    # Time
    # --------------------------------------------------------

    df["time"] = df["time"].astype(str).str.strip()

    # Convert time into hour
    df["hour"] = pd.to_datetime(
        df["time"],
        format="%H:%M",
        errors="coerce"
    ).dt.hour

    # --------------------------------------------------------
    # Day information
    # --------------------------------------------------------

    df["day_of_week"] = df["date"].dt.dayofweek

    df["day_name"] = df["date"].dt.day_name()

    df["month"] = df["date"].dt.month

    # Monday-Friday = 0
    # Saturday/Sunday = 1

    df["weekend"] = (
        df["day_of_week"] >= 5
    ).astype(int)

    # --------------------------------------------------------
    # Peak hour
    # --------------------------------------------------------

    df["peak_hour"] = (
        df["hour"].isin([7, 8, 9, 17, 18, 19, 20])
    ).astype(int)

    # --------------------------------------------------------
    # Standardize text fields
    # --------------------------------------------------------

    text_columns = [
        "junction",
        "severity",
        "primaryvehicletype",
        "probablecause",
        "weathercondition",
        "policecaseregistered"
    ]

    for column in text_columns:

        if column in df.columns:

            df[column] = (
                df[column]
                .astype(str)
                .str.strip()
            )

    # --------------------------------------------------------
    # Numeric columns
    # --------------------------------------------------------

    numeric_columns = [
        "year",
        "injuredcount",
        "fatalitycount",
        "vehiclesinvolved",
        "hour",
        "day_of_week",
        "month",
        "weekend",
        "peak_hour"
    ]

    for column in numeric_columns:

        if column in df.columns:

            df[column] = pd.to_numeric(
                df[column],
                errors="coerce"
            )

    # --------------------------------------------------------
    # Remove rows with critical missing values
    # --------------------------------------------------------

    critical_columns = [
        "accidentid",
        "date",
        "junction",
        "severity"
    ]

    before = len(df)

    df = df.dropna(
        subset=critical_columns
    )

    removed = before - len(df)

    print(
        f"Rows removed because of missing "
        f"critical fields: {removed}"
    )

    # --------------------------------------------------------
    # Sort chronologically
    # --------------------------------------------------------

    df = df.sort_values(
        ["date", "time"]
    ).reset_index(drop=True)

    return df


def save_data(df):

    OUTPUT_FILE.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    df.to_csv(
        OUTPUT_FILE,
        index=False
    )

    print("\n[2] CLEAN DATASET")

    print(f"Rows    : {len(df)}")
    print(f"Columns : {len(df.columns)}")

    print("\nSaved to:")
    print(OUTPUT_FILE)


def main():

    df = load_data()

    df = clean_data(df)

    save_data(df)

    print("\n" + "=" * 70)
    print("PREPROCESSING COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    main()