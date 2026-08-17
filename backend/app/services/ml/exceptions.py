"""
Custom exception definitions for backend ML Service communication.
"""

class MLServiceException(Exception):
    """Base exception for backend ML client failures."""
    pass


class MLServiceUnavailableException(MLServiceException):
    """Raised when the internal ML FastAPI service is unreachable or unhealthy."""
    pass


class MLPredictionException(MLServiceException):
    """Raised when ML model inference returns an unhandled server error."""
    pass


class MLValidationException(MLServiceException):
    """Raised when feature inputs fail validation or schema checks."""
    pass
