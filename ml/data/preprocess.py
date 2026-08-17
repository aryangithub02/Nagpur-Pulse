"""
Preprocessing Pipeline Wrapper for ml/data/preprocess.py path compatibility.
"""

import sys
from pathlib import Path

ML_SERVICE_PREPROCESS = Path(__file__).resolve().parent.parent.parent / "ml-service" / "data" / "preprocess.py"

if __name__ == "__main__":
    if ML_SERVICE_PREPROCESS.exists():
        exec(open(ML_SERVICE_PREPROCESS).read())
    else:
        print(f"Error: Could not locate {ML_SERVICE_PREPROCESS}")
