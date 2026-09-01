from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class DASComponentsSchema(BaseModel):
    incident_severity: float = Field(..., ge=0, le=100, description="I - Incident Severity (0-100)")
    traffic_risk: float = Field(..., ge=0, le=100, description="T - Traffic Risk (0-100)")
    crime_risk: float = Field(..., ge=0, le=100, description="C - Crime/Public-Order Risk (0-100)")
    event_risk: float = Field(..., ge=0, le=100, description="E - Event/Crowd Risk (0-100)")
    unit_availability: float = Field(..., ge=0, le=100, description="A - Unit Availability Score (0-100)")
    unit_capability: float = Field(..., ge=0, le=100, description="K - Unit Capability Match (0-100)")
    eta_score: float = Field(..., ge=0, le=100, description="ETA - ETA Rapid Response Score (0-100)")
    coverage_safety: float = Field(..., ge=0, le=100, description="CV - Sector Coverage Safety (0-100)")
    resource_workload: float = Field(..., ge=0, le=100, description="W - Resource Workload Balance (0-100)")
    data_reliability: float = Field(..., ge=0, le=100, description="D - Live API Data Freshness & Quality (0-100)")
    prediction_stability: float = Field(..., ge=0, le=100, description="S - ML Prediction Stability (0-100)")
    ml_confidence: float = Field(..., ge=0, le=100, description="U - ML Posterior Confidence (0-100)")


class HardConstraintCheckSchema(BaseModel):
    passed: bool
    unit_available: bool
    capability_matched: bool
    coverage_safe: bool
    event_compliant: bool
    data_valid: bool
    violations: List[str] = []


class AlternativeUnitSchema(BaseModel):
    unit_id: str
    callsign: str
    unit_type: str
    eta_minutes: float
    distance_km: float
    capability_match_pct: float
    coverage_impact_pct: float
    what_if_penalty: float
    decision_assurance_score: float
    assurance_status: str
    preference_reason: str


class ConditionDisclosureSchema(BaseModel):
    category: str
    label: str
    detail: str
    verified: bool
    source: str


class DecisionReviewEvaluationRequest(BaseModel):
    recommendation_id: Optional[str] = Field(None, description="Recommendation ID if evaluating existing rec")
    incident_id: Optional[str] = Field(None, description="Incident ID if triggered by incident")
    location_id: Optional[int] = Field(None, description="Target junction ID")
    location_name: Optional[str] = Field(None, description="Target junction name")
    recommended_unit_id: Optional[str] = Field(None, description="AI Recommended unit ID")
    incident_severity: Optional[float] = Field(None, ge=0, le=100)
    incident_type: Optional[str] = Field("Road Accident", description="Incident type description")
    required_capabilities: Optional[List[str]] = Field(None, description="Required capabilities e.g. ['AMBULANCE', 'TRAFFIC_PCR']")
    min_sector_coverage_pct: Optional[float] = Field(60.0, description="Minimum allowed sector coverage percentage")


class DecisionReviewEvaluationResponse(BaseModel):
    decision_id: str
    recommendation_id: Optional[str]
    incident_id: Optional[str]
    location_id: Optional[int]
    location_name: Optional[str]
    model_version: str
    api_freshness_seconds: float
    data_reliability_score: float
    ml_confidence_score: float
    ml_risk_score: float
    ml_risk_tier: str
    recommended_unit: Dict[str, Any]
    hard_constraints: HardConstraintCheckSchema
    das_components: DASComponentsSchema
    raw_das_score: float
    what_if_penalty: float
    coverage_impact_pct: float
    final_assurance_score: float
    assurance_status: str
    assurance_narrative: str
    alternatives: List[AlternativeUnitSchema]
    known_conditions: List[ConditionDisclosureSchema]
    unknown_conditions: List[ConditionDisclosureSchema]
    commander_action_required: bool = True
    audit_chain: Dict[str, str]


class CommanderDecisionSubmissionSchema(BaseModel):
    action: str = Field(..., description="APPROVE, MODIFY, or REJECT")
    selected_unit_id: Optional[str] = Field(None, description="Selected police unit ID (required if MODIFY)")
    reason_code: Optional[str] = Field(None, description="Reason code (required if MODIFY or REJECT)")
    comment: Optional[str] = Field(None, description="Commander operational notes")


class OutcomeRecordingSchema(BaseModel):
    outcome_status: str = Field(..., description="SUCCESS, DELAYED, ESCALATED, RESOLVED, FAILED")
    failure_classification: Optional[str] = Field(
        "NONE",
        description="DATA_FAILURE, MODEL_FAILURE, RECOMMENDATION_FAILURE, HUMAN_DECISION, EXECUTION_FAILURE, NONE"
    )
    actual_response_time_minutes: Optional[float] = Field(None, ge=0)
    post_event_evaluation: Optional[str] = Field(None, description="Detailed post-event post-mortem notes")


class DecisionReviewConfigSchema(BaseModel):
    weights: Dict[str, float] = Field(
        default={
            "incident_severity": 0.15,
            "traffic_risk": 0.10,
            "crime_risk": 0.08,
            "event_risk": 0.07,
            "unit_availability": 0.10,
            "unit_capability": 0.08,
            "eta_score": 0.10,
            "coverage_safety": 0.12,
            "resource_workload": 0.05,
            "data_reliability": 0.08,
            "prediction_stability": 0.04,
            "ml_confidence": 0.03,
        }
    )
    what_if_weights: Dict[str, float] = Field(
        default={
            "coverage_loss": 0.40,
            "secondary_risk": 0.30,
            "resource_impact": 0.20,
            "eta_penalty": 0.10,
        }
    )
    thresholds: Dict[str, float] = Field(
        default={
            "assured_min": 85.0,
            "review_required_min": 70.0,
            "low_assurance_min": 50.0,
            "min_sector_coverage": 60.0,
            "max_api_staleness_seconds": 300.0,
        }
    )
