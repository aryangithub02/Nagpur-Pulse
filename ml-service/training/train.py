"""
Training Execution Wrapper for ml-service/training/train.py path compatibility.
"""

import sys
from pathlib import Path

ML_TRAIN_SCRIPT = Path(__file__).resolve().parent.parent.parent / "ml" / "training" / "train.py"

if __name__ == "__main__":
    if ML_TRAIN_SCRIPT.exists():
        exec(open(ML_TRAIN_SCRIPT).read())
    else:
        print(f"Error: Could not locate {ML_TRAIN_SCRIPT}")
