"""Helpers to generate Form 1-04 content from an applicant record."""


def safe(value, fallback="To be determined"):
    return value if value not in [None, "", []] else fallback


def _get_attr(obj, *names):
    for name in names:
        if hasattr(obj, name):
            value = getattr(obj, name)
            if value not in [None, "", []]:
                return value
    return None


def _full_name(applicant):
    explicit = _get_attr(applicant, "full_name", "full_name_original")
    if explicit:
        return explicit

    first = _get_attr(applicant, "first_name") or ""
    last = _get_attr(applicant, "last_name") or ""
    joined = f"{first} {last}".strip()
    return joined if joined else None


def generate_form_104_content(applicant):
    """Generate Form 1-04 content from an applicant record."""

    name = safe(_full_name(applicant))
    age = safe(_get_attr(applicant, "age"))
    center = safe(_get_attr(applicant, "center_of_interest", "campus", "center_status"))
    trade = safe(_get_attr(applicant, "trade_interest"))
    academic_status = safe(_get_attr(applicant, "academic_status", "education_status"))
    interview_date = safe(_get_attr(applicant, "interview_date"))
    interviewer = safe(
        _get_attr(applicant, "interviewer", "assigned_oa_name"),
        "Charisma DeZonie, Outreach & Admissions Counselor",
    )
    interview_location = safe(_get_attr(applicant, "interview_location", "city", "state"))
    applicant_status = safe(_get_attr(applicant, "applicant_status", "application_status"))

    applicant_history = safe(
        _get_attr(applicant, "form_104_applicant_history"),
        (
            f"{name} is seeking enrollment in Job Corps to complete education, gain career technical "
            f"training, and build a pathway toward long-term stability and employment. Applicant has "
            f"expressed interest in {trade} at {center}. Additional interview details should be entered "
            "by the Outreach and Admissions Counselor."
        ),
    )

    short_term_goals = safe(
        _get_attr(applicant, "form_104_short_term_goals"),
        (
            f"Enroll at {center}. Complete academic requirements as needed. Begin career technical "
            f"training in {trade}. Develop employability skills, accountability, and workplace readiness."
        ),
    )

    long_term_goals = safe(
        _get_attr(applicant, "form_104_long_term_goals"),
        "Complete training, obtain industry-recognized credentials, secure stable employment, and pursue long-term independence.",
    )

    action_plan = safe(
        _get_attr(applicant, "form_104_action_plan"),
        "Participate fully in academic programming, career technical training, employability workshops, and career transition planning.",
    )

    recommended_length = safe(
        _get_attr(applicant, "form_104_recommended_length"),
        "12-24 months depending on academic, trade, and career readiness needs.",
    )

    trade_interest_summary = safe(
        _get_attr(applicant, "form_104_trade_interest_summary"),
        (
            f"Applicant has expressed interest in {trade} and would benefit from hands-on training, "
            "structured guidance, and career exploration."
        ),
    )

    willingness_to_relocate = safe(
        _get_attr(applicant, "form_104_willingness_to_relocate"),
        "Open to relocation for training or employment opportunities following program completion.",
    )

    labor_market_discussion = safe(
        _get_attr(applicant, "form_104_labor_market_discussion"),
        "Career pathways, employment opportunities, income potential, and advanced training options were discussed during the interview.",
    )

    return {
        "title": "FORM 1-04 - INFORMATION FOR CAREER DEVELOPMENT PLANNING",
        "header": {
            "Applicant Name": name,
            "Age": age,
            "Center of Interest": center,
            "Career Technical Training Interest": trade,
            "Academic Status": academic_status,
            "Date of Interview": interview_date,
            "Interview Location": interview_location,
            "Applicant Status": applicant_status,
            "Interviewer": interviewer,
        },
        "sections": {
            "A. APPLICANT HISTORY": applicant_history,
            "B. GOALS": {
                "Short-Term Goals": short_term_goals,
                "Long-Term Goals": long_term_goals,
                "Action Plan": action_plan,
            },
            "C. NEEDS": {
                "Recommended Length of Stay": recommended_length,
                "Interest in Career Technical Training Area": trade_interest_summary,
                "Willingness to Relocate": willingness_to_relocate,
                "Career Technical Training and Labor Market Discussion": labor_market_discussion,
            },
        },
    }
