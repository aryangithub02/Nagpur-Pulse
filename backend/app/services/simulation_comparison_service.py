import logging
from typing import Dict, Any, List

logger = logging.getLogger("simulation_comparison_service")


class SimulationComparisonService:
    """
    SimulationComparisonService compares the baseline live plan against a What-If simulated plan.
    Provides detailed metric deltas, assignment diffs, response time changes, and human-readable operational summaries.
    """

    @staticmethod
    def compare_plans(live_plan: Dict[str, Any], sim_plan: Dict[str, Any], scenario_summary: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Calculates side-by-side comparison scorecard between live operational plan and simulated scenario plan.
        """
        live_assignments = {a["unit_id"]: a for a in live_plan.get("assignments", [])}
        sim_assignments = {a["unit_id"]: a for a in sim_plan.get("assignments", [])}

        all_units = set(live_assignments.keys()) | set(sim_assignments.keys())
        changes_in_plan = []
        response_time_changes = []

        reassigned_count = 0
        removed_count = 0
        added_count = 0

        for u_id in sorted(all_units):
            live_a = live_assignments.get(u_id)
            sim_a = sim_assignments.get(u_id)

            if live_a and sim_a:
                if live_a["location_id"] != sim_a["location_id"]:
                    reassigned_count += 1
                    diff_item = {
                        "unit_id": u_id,
                        "change_type": "REASSIGNED",
                        "live_location_id": live_a["location_id"],
                        "live_location_name": live_a["location_name"],
                        "simulated_location_id": sim_a["location_id"],
                        "simulated_location_name": sim_a["location_name"],
                        "live_eta": live_a["eta_minutes"],
                        "simulated_eta": sim_a["eta_minutes"],
                        "delta_eta_minutes": round(sim_a["eta_minutes"] - live_a["eta_minutes"], 1),
                        "reason": f"Reassigned from {live_a['location_name']} to {sim_a['location_name']} to optimize scenario operational value.",
                    }
                    changes_in_plan.append(diff_item)
                    response_time_changes.append(diff_item)
                else:
                    changes_in_plan.append({
                        "unit_id": u_id,
                        "change_type": "UNCHANGED",
                        "live_location_id": live_a["location_id"],
                        "live_location_name": live_a["location_name"],
                        "simulated_location_id": sim_a["location_id"],
                        "simulated_location_name": sim_a["location_name"],
                        "live_eta": live_a["eta_minutes"],
                        "simulated_eta": sim_a["eta_minutes"],
                        "delta_eta_minutes": 0.0,
                        "reason": "Assignment remains unchanged in scenario.",
                    })
            elif live_a and not sim_a:
                removed_count += 1
                changes_in_plan.append({
                    "unit_id": u_id,
                    "change_type": "REMOVED",
                    "live_location_id": live_a["location_id"],
                    "live_location_name": live_a["location_name"],
                    "simulated_location_id": None,
                    "simulated_location_name": "UNASSIGNED",
                    "live_eta": live_a["eta_minutes"],
                    "simulated_eta": None,
                    "delta_eta_minutes": None,
                    "reason": "Unit no longer allocated to location in simulated scenario.",
                })
            elif not live_a and sim_a:
                added_count += 1
                changes_in_plan.append({
                    "unit_id": u_id,
                    "change_type": "ADDED",
                    "live_location_id": None,
                    "live_location_name": "UNASSIGNED",
                    "simulated_location_id": sim_a["location_id"],
                    "simulated_location_name": sim_a["location_name"],
                    "live_eta": None,
                    "simulated_eta": sim_a["eta_minutes"],
                    "delta_eta_minutes": None,
                    "reason": "Unit newly assigned in simulated scenario.",
                })

        # Calculate Coverage Metrics
        live_cov = live_plan.get("risk_weighted_coverage_pct", 0.0)
        sim_cov = sim_plan.get("risk_weighted_coverage_pct", 0.0)
        delta_cov = round(sim_cov - live_cov, 1)

        live_uncovered = {u["location_id"] for u in live_plan.get("uncovered_locations", [])}
        sim_uncovered = sim_plan.get("uncovered_locations", [])

        newly_uncovered = [u for u in sim_uncovered if u["location_id"] not in live_uncovered]
        uncovered_high_risk = [
            f"J-{u['location_id']:02d} ({u['location_name']})"
            for u in sim_uncovered if u.get("risk_class") in ("CRITICAL", "HIGH")
        ]

        # Generate Human-Readable Explanation
        summary_sentences = []
        if scenario_summary:
            changes_str = "; ".join(c.get("description", "") for c in scenario_summary)
            summary_sentences.append(f"Scenario Changes Applied: {changes_str}")

        if delta_cov < 0:
            summary_sentences.append(f"Risk-weighted coverage decreased by {abs(delta_cov)} percentage points (from {live_cov}% to {sim_cov}%).")
        elif delta_cov > 0:
            summary_sentences.append(f"Risk-weighted coverage increased by {delta_cov} percentage points (from {live_cov}% to {sim_cov}%).")
        else:
            summary_sentences.append(f"Risk-weighted coverage remained stable at {sim_cov}%.")

        if reassigned_count > 0:
            summary_sentences.append(f"{reassigned_count} police unit(s) were reassigned to higher priority demand locations.")
        if newly_uncovered:
            loc_names = ", ".join([u["location_name"] for u in newly_uncovered[:3]])
            summary_sentences.append(f"Newly uncovered high-risk location(s): {loc_names}.")

        human_readable_summary = " ".join(summary_sentences)

        return {
            "changes_in_plan": changes_in_plan,
            "response_time_changes": response_time_changes,
            "coverage_before": live_cov,
            "coverage_after": sim_cov,
            "delta_coverage_pct": delta_cov,
            "risk_weighted_coverage_before": live_cov,
            "risk_weighted_coverage_after": sim_cov,
            "resource_utilization_before": live_plan.get("resource_utilization_pct", 0.0),
            "resource_utilization_after": sim_plan.get("resource_utilization_pct", 0.0),
            "reassigned_units_count": reassigned_count,
            "uncovered_high_risk": uncovered_high_risk,
            "newly_uncovered_locations": newly_uncovered,
            "human_readable_summary": human_readable_summary,
        }


simulation_comparison_service = SimulationComparisonService()
