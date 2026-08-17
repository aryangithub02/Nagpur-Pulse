class DomainException(Exception):
    """Base class for all domain-level exceptions."""
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)


class LocationNotFoundException(DomainException):
    """Raised when a requested junction/location is not found."""
    pass


class UnitNotFoundException(DomainException):
    """Raised when a requested police unit is not found."""
    pass


class RecommendationNotFoundException(DomainException):
    """Raised when a requested recommendation is not found."""
    pass


class UnitUnavailableException(DomainException):
    """Raised when a police unit is not in AVAILABLE status for deployment."""
    pass


class RoutingUnavailableException(DomainException):
    """Raised when route calculation fails or cannot be completed."""
    pass


class DatabaseOperationException(DomainException):
    """Raised when a database transaction or operation fails."""
    pass
