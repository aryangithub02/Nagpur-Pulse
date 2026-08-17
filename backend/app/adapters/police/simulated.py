"""
Nagpur Pulse — Simulated Police Unit Adapter.
Transforms database PoliceUnit entities into CanonicalPoliceUnitState list.
"""

from typing import List, Dict, Any, Optional
from app.adapters.base.police import PoliceAdapter
from app.adapters.schemas.police import CanonicalPoliceUnitState, PoliceUnitStatus
from app.adapters.schemas.provenance import DataProvenance, QualityFlag, SourceType, now_iso


class SimulatedPoliceAdapter(PoliceAdapter):
    """
    Adapter normalizing internal DB PoliceUnit objects into CanonicalPoliceUnitState.
    """

    @property
    def provider_name(self) -> str:
        return "SIMULATED_ROSTER"

    @property
    def adapter_version(self) -> str:
        return "1.0.0"

    def fetch_units(self, zone_code: Optional[str] = None) -> Any:
        return []

    def normalize_units(self, raw_data: Any) -> List[CanonicalPoliceUnitState]:
        if not raw_data:
            return []

        items = raw_data if isinstance(raw_data, list) else [raw_data]
        results = []
        now_str = now_iso()

        for u in items:
            u_id = getattr(u, "id", None) or u.get("id") or u.get("unit_id")
            name = getattr(u, "name", None) or u.get("name") or u_id
            call_sign = getattr(u, "call_sign", None) or u.get("call_sign") or name
            v_type = getattr(u, "vehicle_type", None) or u.get("vehicle_type", "PCR_VAN")
            lat = float(getattr(u, "latitude", None) or u.get("latitude", 21.1458))
            lon = float(getattr(u, "longitude", None) or u.get("longitude", 79.0882))
            zone = getattr(u, "zone_code", None) or u.get("zone_code", "CENTRAL")
            status = getattr(u, "status", None) or u.get("status", "AVAILABLE")
            officer = getattr(u, "officer_name", None) or u.get("officer_name")
            contact = getattr(u, "contact_number", None) or u.get("contact_number")

            prov = DataProvenance(
                source_type=SourceType.INTERNAL,
                source_provider=self.provider_name,
                observed_at=now_str,
                received_at=now_str,
                spatial_id=zone,
                quality_score=0.99,
                quality_flags=[],
                adapter_version=self.adapter_version,
            )

            state = CanonicalPoliceUnitState(
                unit_id=str(u_id),
                name=str(name),
                call_sign=str(call_sign),
                vehicle_type=str(v_type),
                latitude=lat,
                longitude=lon,
                zone_code=str(zone),
                status=str(status),
                officer_name=officer,
                contact_number=contact,
                last_seen_at=now_str,
                observed_at=now_str,
                received_at=now_str,
                provenance=prov,
            )
            results.append(state)

        return results
