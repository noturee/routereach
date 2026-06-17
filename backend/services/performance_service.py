"""Performance metric service — Phase 15."""


def calculate_user_metrics(user_id: int, month: int, year: int):
    """
    Calculate and upsert performance metrics for a user for a given month.
    
    Metrics computed:
    - Applicant activity counts (new, contacted, interviewed, etc.)
    - Communication counts (texts, emails, calls, meetings)
    - Outreach activity (visits, routes, partner contacts)
    - Conversion rates (contact rate, interview rate, completion rate, etc.)
    - Time averages (days to contact, days to complete, etc.)
    Phase 15.
    """
    raise NotImplementedError("Performance metric calculation coming in Phase 15.")


def get_conversion_rates(user_id: int, month: int, year: int) -> dict:
    """
    Return all conversion rates for a user-month.
    
    Rates:
    - Application to contact rate:      Contacted / New Applications
    - Contact to interview rate:        Interviews Completed / Contacted
    - Interview to completion rate:     Complete / Interviews Completed
    - Completion to referral rate:      Sent to Campus / Complete
    - Referral to arrival rate:         Arrivals / Sent to Campus
    - Overall conversion rate:          Arrivals / New Applications
    Phase 15.
    """
    raise NotImplementedError("Conversion rate calculation coming in Phase 15.")
