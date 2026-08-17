from .predictor import predict_risk

# ============================================================
# NAGPUR PULSE - PREDICTOR VALIDATION TESTS
# ============================================================


VALID_INPUT = {
    "accidents_7d": 2,
    "accidents_30d": 8,
    "accidents_90d": 21,
    "accidents_1y": 75,
    "fatal_accidents_1y": 3,
    "injury_accidents_1y": 28,
    "historical_accident_rate": 6.25,
    "junction": "Sitabuldi Chowk",
}


def run_test(name, function):
    print("\n" + "=" * 70)
    print(name)
    print("=" * 70)

    try:
        function()
        print("PASS")
    except Exception as e:
        print(f"FAIL: {e}")
        raise


# ============================================================
# TEST 1 - VALID INPUT
# ============================================================

def test_valid_input():

    result = predict_risk(VALID_INPUT)

    assert "risk_level" in result
    assert "confidence" in result
    assert "probabilities" in result
    assert "model_version" in result

    assert result["risk_level"] in [
        "LOW",
        "MEDIUM",
        "HIGH",
        "UNCERTAIN",
    ]

    assert 0 <= result["confidence"] <= 1

    print("Risk:", result["risk_level"])
    print("Confidence:", result["confidence"])


# ============================================================
# TEST 2 - MISSING FEATURE
# ============================================================

def test_missing_feature():

    data = VALID_INPUT.copy()

    del data["accidents_7d"]

    try:
        predict_risk(data)
    except ValueError as e:

        assert "Missing required features" in str(e)

        print("Correctly rejected missing feature.")

        return

    raise AssertionError(
        "Missing feature was not rejected."
    )


# ============================================================
# TEST 3 - UNEXPECTED FEATURE
# ============================================================

def test_unexpected_feature():

    data = VALID_INPUT.copy()

    data["random_feature"] = 123

    try:
        predict_risk(data)
    except ValueError as e:

        assert "Unexpected feature" in str(e)

        print("Correctly rejected unexpected feature.")

        return

    raise AssertionError(
        "Unexpected feature was not rejected."
    )


# ============================================================
# TEST 4 - NEGATIVE VALUE
# ============================================================

def test_negative_value():

    data = VALID_INPUT.copy()

    data["accidents_7d"] = -5

    try:
        predict_risk(data)
    except ValueError as e:

        assert "cannot be negative" in str(e)

        print("Correctly rejected negative value.")

        return

    raise AssertionError(
        "Negative value was not rejected."
    )


# ============================================================
# TEST 5 - INVALID NUMERIC VALUE
# ============================================================

def test_invalid_numeric():

    data = VALID_INPUT.copy()

    data["accidents_30d"] = "abc"

    try:
        predict_risk(data)
    except ValueError as e:

        assert "Invalid numeric value" in str(e)

        print("Correctly rejected invalid numeric value.")

        return

    raise AssertionError(
        "Invalid numeric value was not rejected."
    )


# ============================================================
# TEST 6 - EMPTY JUNCTION
# ============================================================

def test_empty_junction():

    data = VALID_INPUT.copy()

    data["junction"] = ""

    try:
        predict_risk(data)
    except ValueError as e:

        assert "junction" in str(e).lower()

        print("Correctly rejected empty junction.")

        return

    raise AssertionError(
        "Empty junction was not rejected."
    )


# ============================================================
# TEST 7 - UNCERTAINTY LOGIC
# ============================================================

def test_uncertainty_logic():

    result = predict_risk(VALID_INPUT)

    probabilities = result["probabilities"]

    max_probability = max(
        probabilities.values()
    )

    if max_probability < 0.50:

        assert result["risk_level"] == "UNCERTAIN"

        print(
            "Low confidence correctly converted to UNCERTAIN."
        )

    else:

        assert result["risk_level"] in [
            "LOW",
            "MEDIUM",
            "HIGH",
        ]

        print(
            "Confidence >= threshold; valid risk class returned."
        )


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    print("=" * 70)
    print("NAGPUR PULSE - PREDICTOR TEST SUITE")
    print("=" * 70)

    run_test(
        "TEST 1 - VALID INPUT",
        test_valid_input,
    )

    run_test(
        "TEST 2 - MISSING FEATURE",
        test_missing_feature,
    )

    run_test(
        "TEST 3 - UNEXPECTED FEATURE",
        test_unexpected_feature,
    )

    run_test(
        "TEST 4 - NEGATIVE VALUE",
        test_negative_value,
    )

    run_test(
        "TEST 5 - INVALID NUMERIC VALUE",
        test_invalid_numeric,
    )

    run_test(
        "TEST 6 - EMPTY JUNCTION",
        test_empty_junction,
    )

    run_test(
        "TEST 7 - UNCERTAINTY LOGIC",
        test_uncertainty_logic,
    )

    print("\n" + "=" * 70)
    print("ALL PREDICTOR TESTS PASSED")
    print("=" * 70)
