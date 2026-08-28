#!/usr/bin/env python3
"""Deterministic analyzer for Tokyo Pilot Cycle 01 measurement V3.2.

This is a PRE-FREEZE SIDECAR. It reads one local CSV and writes local JSON/MD.
It does not send data anywhere and never infers sentiment, mental state, or meaning
from participant free text.
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import statistics
from collections import Counter, defaultdict
from pathlib import Path

OBJECT_BY_CODE = {
    "a": "manuscript-cafe",
    "b": "hachiko-taxidermy",
    "c": "meguro-tapeworm",
}
OBJECTS = tuple(OBJECT_BY_CODE.values())
VALID_ORDERS = {"abc", "acb", "bac", "bca", "cab", "cba"}
YES_NO = {"yes", "no"}
YES_MAYBE_NO = {"yes", "maybe", "no"}
# Return Desire は moderator contract の "Use unclear instead of guessing." と揃える。
# unclear は valid response であり、primary-valid n から外さない。Yes numerator にも入れない。
RETURN_VALUES = {"yes", "maybe", "no", "unclear"}
TRI = {"yes", "no", "unclear"}
VALID_DEVICES = {"mobile", "desktop", "tablet"}
VALID_RELATIONS = {"unknown", "weak_tie", "close_tie"}
WEAK_OR_UNKNOWN = {"unknown", "weak_tie"}

REQUIRED = [
    "participant_id",
    "order",
    "prior_pilot_exposure",
    "recruitment_relation",
    "device",
    "consent_confirmed",
    "first_open_latency_s",
    "voluntary_open",
    "first_object",
    "opened_objects",
    "objects_opened",
    "official_action",
    "return_desire",
    "existing_alternative_sufficient",
    "distinct_v3_use",
    "first_reveal_payoff",
    "first_reveal_payoff_reason",
]

# participant_id/order are intentionally excluded: the scorecard template prefills them.
START_FIELDS = [
    "prior_pilot_exposure",
    "recruitment_relation",
    "device",
    "consent_confirmed",
    "first_open_latency_s",
    "voluntary_open",
    "first_object",
    "opened_objects",
    "objects_opened",
    "raw_spontaneous_utterance",
    "official_action",
    "occasion_answer",
    "return_desire",
    "return_reason",
    "current_alternative",
    "existing_alternative_sufficient",
    "distinct_v3_use",
    "distinct_use_reason",
    "first_reveal_payoff",
    "first_reveal_payoff_reason",
    "unprompted_feature_request",
    "moderator_notes",
]


def norm(value: str | None) -> str:
    return (value or "").strip().lower()


def pct(n: int, d: int) -> float | None:
    return None if d == 0 else round(100.0 * n / d, 1)


def wilson(k: int, n: int, z: float = 1.96) -> list[float] | None:
    if n == 0:
        return None
    p = k / n
    den = 1 + z * z / n
    center = (p + z * z / (2 * n)) / den
    half = z * math.sqrt((p * (1 - p) + z * z / (4 * n)) / n) / den
    return [round(100 * (center - half), 1), round(100 * (center + half), 1)]


def percentile_linear(values: list[float], q: float) -> float | None:
    """Linear percentile matching a simple deterministic interpolation rule."""
    if not values:
        return None
    xs = sorted(values)
    if len(xs) == 1:
        return round(xs[0], 2)
    idx = (len(xs) - 1) * q
    lo = math.floor(idx)
    hi = math.ceil(idx)
    if lo == hi:
        return round(xs[lo], 2)
    out = xs[lo] * (hi - idx) + xs[hi] * (idx - lo)
    return round(out, 2)


def parse_opened(raw: str | None) -> list[str]:
    if not (raw or "").strip():
        return []
    vals = [x.strip() for x in (raw or "").replace(",", ";").split(";") if x.strip()]
    aliases = {**OBJECT_BY_CODE, **{v: v for v in OBJECTS}}
    out: list[str] = []
    for value in vals:
        if value not in aliases:
            raise ValueError(f"unknown opened object '{value}'")
        mapped = aliases[value]
        if mapped not in out:
            out.append(mapped)
    return out


def parse_latency(raw: str | None) -> float | None:
    text = (raw or "").strip()
    if not text:
        return None
    try:
        value = float(text)
    except ValueError as exc:
        raise ValueError("first_open_latency_s must be numeric seconds") from exc
    if not math.isfinite(value) or value < 0:
        raise ValueError("first_open_latency_s must be a finite number >= 0")
    return value


def validate_row(row: dict[str, str], line_no: int):
    errors: list[str] = []
    pid = (row.get("participant_id") or "").strip()
    order = norm(row.get("order"))
    if not pid:
        errors.append("participant_id missing")
    if order not in VALID_ORDERS:
        errors.append(f"invalid order '{order}'")

    started = any((row.get(field) or "").strip() for field in START_FIELDS)
    if not started:
        return errors, False, None

    consent = norm(row.get("consent_confirmed"))
    exposure = norm(row.get("prior_pilot_exposure"))
    relation = norm(row.get("recruitment_relation"))
    device = norm(row.get("device"))
    voluntary = norm(row.get("voluntary_open"))
    official = norm(row.get("official_action"))
    return_desire = norm(row.get("return_desire"))
    alternative_enough = norm(row.get("existing_alternative_sufficient"))
    distinct = norm(row.get("distinct_v3_use"))
    reveal = norm(row.get("first_reveal_payoff"))

    if consent != "yes":
        errors.append("completed participant requires consent_confirmed=yes")
    if exposure not in YES_NO:
        errors.append("prior_pilot_exposure must be yes/no; ask it before the session")
    if relation and relation not in VALID_RELATIONS:
        errors.append("recruitment_relation must be unknown/weak_tie/close_tie or blank")
    if device not in VALID_DEVICES:
        errors.append("device must be mobile/desktop/tablet")
    if voluntary not in YES_NO:
        errors.append("voluntary_open must be yes/no")
    if official not in YES_NO:
        errors.append("official_action must be yes/no")
    if return_desire not in RETURN_VALUES:
        errors.append("return_desire must be yes/maybe/no/unclear")
    if alternative_enough not in TRI:
        errors.append("existing_alternative_sufficient must be yes/no/unclear")
    if distinct not in TRI:
        errors.append("distinct_v3_use must be yes/no/unclear")

    try:
        count = int((row.get("objects_opened") or "").strip())
        if count not in (0, 1, 2, 3):
            errors.append("objects_opened must be 0..3")
    except ValueError:
        count = None
        errors.append("objects_opened must be integer 0..3")

    try:
        opened = parse_opened(row.get("opened_objects"))
    except ValueError as exc:
        opened = []
        errors.append(str(exc))

    if count is not None and len(opened) != count:
        errors.append(f"opened_objects count {len(opened)} != objects_opened {count}")

    first_raw = (row.get("first_object") or "").strip()
    aliases = {**OBJECT_BY_CODE, **{v: v for v in OBJECTS}}
    first_mapped = aliases.get(first_raw) if first_raw else None

    try:
        latency = parse_latency(row.get("first_open_latency_s"))
    except ValueError as exc:
        latency = None
        errors.append(str(exc))

    reveal_reason = (row.get("first_reveal_payoff_reason") or "").strip()

    if voluntary == "yes":
        if count == 0:
            errors.append("voluntary_open=yes but objects_opened=0")
        if not first_mapped:
            errors.append("voluntary_open=yes requires valid first_object")
        elif opened and first_mapped != opened[0]:
            errors.append("first_object must equal the first ID in opened_objects")
        if reveal_reason and reveal not in YES_MAYBE_NO:
            errors.append("first_reveal_payoff_reason requires first_reveal_payoff=yes/maybe/no")

    if voluntary == "no":
        if count not in (None, 0):
            errors.append("voluntary_open=no requires objects_opened=0")
        if first_raw:
            errors.append("voluntary_open=no requires blank first_object")
        if opened:
            errors.append("voluntary_open=no requires blank opened_objects")
        if latency is not None:
            errors.append("voluntary_open=no requires blank first_open_latency_s")
        if reveal:
            errors.append("voluntary_open=no requires blank first_reveal_payoff")
        if reveal_reason:
            errors.append("voluntary_open=no requires blank first_reveal_payoff_reason")

    parsed = {
        "opened": opened,
        "first": first_mapped,
        "latency": latency,
        "reveal": reveal if reveal in YES_MAYBE_NO else None,
    }
    return errors, True, parsed


def analyze(rows: list[dict[str, str]]) -> dict:
    errors: list[str] = []
    completed: list[dict[str, str]] = []
    ids: set[str] = set()

    for i, row in enumerate(rows, start=2):
        pid = (row.get("participant_id") or "").strip()
        if pid in ids:
            errors.append(f"line {i}: duplicate participant_id {pid}")
        ids.add(pid)
        row_errors, started, parsed = validate_row(row, i)
        errors.extend(f"line {i} ({pid}): {msg}" for msg in row_errors)
        if started:
            copied = dict(row)
            copied["_parsed"] = parsed  # type: ignore[assignment]
            completed.append(copied)

    if errors:
        raise ValueError("\n".join(errors))

    # First-time evidence を守る。事前に画面や仮説を見ている participant は
    # session 自体は有効だが、primary valid n と GO 判定からは外す。
    prior_exposed = [r for r in completed if norm(r.get("prior_pilot_exposure")) == "yes"]
    completed = [r for r in completed if norm(r.get("prior_pilot_exposure")) != "yes"]

    # Recruitment quality は最初の primary-valid 12 名で見る。
    first12 = completed[:12]
    relation_counts = Counter(norm(r.get("recruitment_relation")) or "unrecorded" for r in first12)
    weak_unknown = sum(relation_counts[k] for k in WEAK_OR_UNKNOWN)
    close = relation_counts["close_tie"]
    relation_unrecorded = relation_counts["unrecorded"]
    relation_target_met = (
        len(first12) == 12
        and relation_unrecorded == 0
        and weak_unknown * 3 >= 12 * 2
        and close * 3 <= 12
    )

    n = len(completed)
    openers = [r for r in completed if norm(r["voluntary_open"]) == "yes"]
    open_n = len(openers)
    ret_yes = sum(norm(r["return_desire"]) == "yes" for r in completed)
    ret_maybe = sum(norm(r["return_desire"]) == "maybe" for r in completed)
    ret_unclear = sum(norm(r["return_desire"]) == "unclear" for r in completed)
    official = sum(norm(r["official_action"]) == "yes" for r in completed)
    alt_enough = sum(norm(r["existing_alternative_sufficient"]) == "yes" for r in completed)
    distinct_yes = sum(norm(r["distinct_v3_use"]) == "yes" for r in completed)
    distinct_no = sum(norm(r["distinct_v3_use"]) == "no" for r in completed)

    latencies = [float(r["_parsed"]["latency"]) for r in openers if r["_parsed"]["latency"] is not None]  # type: ignore[index]
    reveal_values = [r["_parsed"]["reveal"] for r in openers if r["_parsed"]["reveal"] in YES_MAYBE_NO]  # type: ignore[index]
    reveal_counts = Counter(str(v) for v in reveal_values)
    reveal_yes = reveal_counts["yes"]
    reveal_maybe = reveal_counts["maybe"]
    reveal_no = reveal_counts["no"]

    open_depth = Counter(int(r["objects_opened"]) for r in completed)
    first_counts = Counter()
    opened_counts = Counter()
    first_position = Counter()
    object_position = defaultdict(lambda: defaultdict(lambda: {"n": 0, "opened": 0, "first": 0}))
    reveal_by_first = defaultdict(Counter)
    order_counts = Counter()
    order_open = Counter()
    order_return = Counter()
    device_counts = Counter()
    device_open = Counter()
    device_return = Counter()

    for row in completed:
        order = norm(row["order"])
        device = norm(row["device"])
        order_counts[order] += 1
        device_counts[device] += 1
        if norm(row["voluntary_open"]) == "yes":
            order_open[order] += 1
            device_open[device] += 1
        if norm(row["return_desire"]) == "yes":
            order_return[order] += 1
            device_return[device] += 1

        parsed = row["_parsed"]  # type: ignore[assignment]
        ordered_objects = [OBJECT_BY_CODE[c] for c in order]
        for position, obj in enumerate(ordered_objects, start=1):
            cell = object_position[obj][str(position)]
            cell["n"] += 1
            if obj in parsed["opened"]:
                cell["opened"] += 1
            if parsed["first"] == obj:
                cell["first"] += 1

        for obj in parsed["opened"]:
            opened_counts[obj] += 1
        if parsed["first"]:
            first = parsed["first"]
            first_counts[first] += 1
            first_position[str(ordered_objects.index(first) + 1)] += 1
            if parsed["reveal"] in YES_MAYBE_NO:
                reveal_by_first[first][parsed["reveal"]] += 1

    order_values = [order_counts[order] for order in VALID_ORDERS]
    order_imbalance_warning = (
        (max(order_values, default=0) - min(order_values, default=0)) > 1 if n else False
    )
    open_rate = pct(open_n, n)
    return_rate = pct(ret_yes, n)
    metrics_go = n >= 12 and (open_rate or 0) >= 60 and (return_rate or 0) >= 40
    go_candidate = metrics_go and not order_imbalance_warning
    cycle1_low_signal = n >= 12 and (open_rate or 0) < 40 and (return_rate or 0) < 25

    status = "INCOMPLETE"
    if n >= 12:
        status = "GO_CANDIDATE" if go_candidate else "CONTINUE_OR_REVISE"

    result = {
        "status": status,
        "cycle": 1,
        "measurement_version": "3.2",
        "completed_n": n,
        "minimum_n_reached": n >= 12,
        "prior_exposure_excluded_n": len(prior_exposed),
        "prior_exposure_excluded_ids": sorted(
            (r.get("participant_id") or "").strip() for r in prior_exposed
        ),
        "recruitment_quality": {
            "scope": "first 12 primary-valid participants",
            "counted_n": len(first12),
            "unknown": relation_counts["unknown"],
            "weak_tie": relation_counts["weak_tie"],
            "close_tie": relation_counts["close_tie"],
            "unrecorded": relation_unrecorded,
            "target_two_thirds_weak_or_unknown_met": relation_target_met,
        },
        "primary": {
            "object_open_rate_pct": open_rate,
            "object_open_n": open_n,
            "wilson_95_pct": wilson(open_n, n),
        },
        "secondary": {
            "return_yes_pct": return_rate,
            "return_yes_n": ret_yes,
            "return_yes_wilson_95_pct": wilson(ret_yes, n),
            "return_maybe_pct": pct(ret_maybe, n),
            "return_maybe_n": ret_maybe,
            "return_unclear_pct": pct(ret_unclear, n),
            "return_unclear_n": ret_unclear,
            "official_action_pct": pct(official, n),
            "official_action_n": official,
        },
        "first_pull_diagnostics": {
            "first_open_latency_s": {
                "n_openers": open_n,
                "n_captured": len(latencies),
                "capture_completeness_pct": pct(len(latencies), open_n),
                "median": round(statistics.median(latencies), 2) if latencies else None,
                "p75": percentile_linear(latencies, 0.75),
            },
            "open_depth_counts": {str(depth): open_depth[depth] for depth in range(4)},
            "open_depth_pct": {str(depth): pct(open_depth[depth], n) for depth in range(4)},
        },
        "reveal_payoff_diagnostics": {
            "denominator_openers": open_n,
            "n_captured": len(reveal_values),
            "capture_completeness_pct": pct(len(reveal_values), open_n),
            "yes_n": reveal_yes,
            "yes_pct": pct(reveal_yes, len(reveal_values)),
            "yes_wilson_95_pct": wilson(reveal_yes, len(reveal_values)),
            "maybe_n": reveal_maybe,
            "maybe_pct": pct(reveal_maybe, len(reveal_values)),
            "no_n": reveal_no,
            "no_pct": pct(reveal_no, len(reveal_values)),
            "by_first_object": {
                obj: {
                    "n": sum(reveal_by_first[obj].values()),
                    "yes_n": reveal_by_first[obj]["yes"],
                    "yes_pct": pct(reveal_by_first[obj]["yes"], sum(reveal_by_first[obj].values())),
                    "maybe_n": reveal_by_first[obj]["maybe"],
                    "no_n": reveal_by_first[obj]["no"],
                }
                for obj in OBJECTS
            },
        },
        "substitution_signal": {
            "existing_alternative_sufficient_yes_pct": pct(alt_enough, n),
            "distinct_v3_use_yes_pct": pct(distinct_yes, n),
            "distinct_v3_use_no_pct": pct(distinct_no, n),
        },
        "object_behavior": {
            "first_open_counts": dict(first_counts),
            "opened_counts": dict(opened_counts),
            "first_open_position_counts": dict(first_position),
            "by_object": {
                obj: {
                    "opened_n": opened_counts[obj],
                    "opened_rate_pct": pct(opened_counts[obj], n),
                    "first_open_n": first_counts[obj],
                    "first_open_rate_pct": pct(first_counts[obj], n),
                    "by_position": {
                        position: {
                            "n": object_position[obj][position]["n"],
                            "opened_rate_pct": pct(
                                object_position[obj][position]["opened"],
                                object_position[obj][position]["n"],
                            ),
                            "first_open_rate_pct": pct(
                                object_position[obj][position]["first"],
                                object_position[obj][position]["n"],
                            ),
                        }
                        for position in ("1", "2", "3")
                    },
                }
                for obj in OBJECTS
            },
        },
        "order_balance": {
            order: {
                "n": order_counts[order],
                "open_rate_pct": pct(order_open[order], order_counts[order]),
                "return_yes_pct": pct(order_return[order], order_counts[order]),
            }
            for order in sorted(VALID_ORDERS)
        },
        "device_diagnostics": {
            device: {
                "n": device_counts[device],
                "open_rate_pct": pct(device_open[device], device_counts[device]),
                "return_yes_pct": pct(device_return[device], device_counts[device]),
            }
            for device in sorted(VALID_DEVICES)
            if device_counts[device]
        },
        "decision_flags": {
            "provisional_go_threshold_met": go_candidate,
            "open_return_metrics_threshold_met": metrics_go,
            "go_withheld_for_order_imbalance": metrics_go and order_imbalance_warning,
            "cycle1_low_signal": cycle1_low_signal,
            "majority_existing_alternative_sufficient": n > 0 and alt_enough > n / 2,
            "majority_no_distinct_v3_use": n > 0 and distinct_no > n / 2,
            "kill_not_permitted_from_cycle1_alone": True,
            "order_imbalance_warning": order_imbalance_warning,
            "latency_is_diagnostic_only": True,
            "reveal_payoff_is_diagnostic_only": True,
            "diagnostic_missing_does_not_invalidate_core_row": True,
            "prior_exposure_excluded_from_primary": True,
            "recruitment_relation_is_validity_note_only": True,
            "return_unclear_is_valid_and_not_yes": True,
        },
        "notes": [
            "Free-text responses are not sentiment-scored, classified, or inferred by this analyzer.",
            "First-open latency is manual seconds from the end of the neutral `どうぞ` prompt to first voluntary Open and is diagnostic, never a GO/KILL threshold; missing captures are reported as completeness, not core-row failure.",
            "Reveal payoff is asked only after the existing Return/alternative questions and is diagnostic, never a GO/KILL threshold; missing captures are reported as completeness, not core-row failure.",
            "Maybe is reported separately and is not counted as Return Desire Yes.",
            "Unclear is a valid Return Desire response. It stays in primary valid n and in the Yes denominator, is never counted as Yes, and is never a reason to replace a participant. Guessing a value the participant did not give would bias the primary reading more than reporting unclear.",
            "Official Action is supporting evidence and never a standalone kill criterion.",
            "Cycle 01 GO is only a candidate for a second independent three-object set; it is not Production GO.",
            "Object/position/device rates are small-n diagnostics, not personalization or stable ranking estimates.",
            "Participants who had prior exposure to the pilot screen, the Art Reset screenshots, the 3 Objects/Hooks/Reveals, or the project hypothesis are excluded from primary valid n and from every threshold; their sessions remain usable as qualitative reference only.",
            "Recruitment relation is a validity note over the first 12 primary-valid participants, never a reason to discard a participant. A close-tie-heavy sample weakens Return Desire as market-demand evidence.",
        ],
    }
    return result


def render_markdown(result: dict) -> str:
    n = result["completed_n"]
    primary = result["primary"]
    secondary = result["secondary"]
    latency = result["first_pull_diagnostics"]["first_open_latency_s"]
    reveal = result["reveal_payoff_diagnostics"]
    lines = [
        "# Tokyo Pilot 01 — Human Test Result V3",
        "",
        f"Status: **{result['status']}**",
        f"Completed primary-valid: **{n}** / 12 (max 18 total sessions; P13-P18 are replacement reserve only)",
        "",
        "## Decision metrics",
        (
            f"- Object Open Rate: **{primary['object_open_rate_pct']}%** "
            f"({primary['object_open_n']}/{n}), Wilson 95% {primary['wilson_95_pct']}"
            if n
            else "- Object Open Rate: n/a"
        ),
        (
            f"- Return Desire Yes: **{secondary['return_yes_pct']}%** "
            f"({secondary['return_yes_n']}/{n}), Wilson 95% {secondary['return_yes_wilson_95_pct']}"
            if n
            else "- Return Desire Yes: n/a"
        ),
        (
            f"- Return Desire Maybe / Unclear: {secondary['return_maybe_n']} / {secondary['return_unclear_n']} "
            f"(neither is counted as Yes; both stay in the denominator)"
            if n
            else "- Return Desire Maybe / Unclear: n/a"
        ),
        "",
        "## Diagnostics",
        (
            f"- First-open latency: captured {latency['n_captured']}/{latency['n_openers']} ({latency['capture_completeness_pct']}%), median {latency['median']}s / p75 {latency['p75']}s"
            if latency["n_openers"]
            else "- First-open latency: n/a"
        ),
        (
            f"- Reveal payoff: captured {reveal['n_captured']}/{reveal['denominator_openers']} ({reveal['capture_completeness_pct']}%); Yes {reveal['yes_pct']}% ({reveal['yes_n']}/{reveal['n_captured']}), "
            f"Wilson 95% {reveal['yes_wilson_95_pct']}"
            if reveal["n_captured"]
            else (f"- Reveal payoff: captured 0/{reveal['denominator_openers']} (0.0%); no payoff response captured" if reveal["denominator_openers"] else "- Reveal payoff: n/a")
        ),
        f"- Open depth counts 0/1/2/3: {result['first_pull_diagnostics']['open_depth_counts']}",
        "",
        "## Decision",
        f"- GO_CANDIDATE threshold met: **{result['decision_flags']['provisional_go_threshold_met']}**",
        "- Production GO: **NO**",
        "- Product KILL from Cycle 01 alone: **NOT PERMITTED**",
        "",
        "See JSON for object×position, order, device, substitution, latency and Reveal diagnostics.",
    ]
    return "\n".join(lines) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("csv_path", nargs="?", default="scorecard.local.csv")
    parser.add_argument("--json", default="result.json")
    parser.add_argument("--md", default="result.md")
    args = parser.parse_args()

    path = Path(args.csv_path)
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        missing = [column for column in REQUIRED if column not in (reader.fieldnames or [])]
        if missing:
            raise SystemExit("SCHEMA_FAIL missing columns: " + ", ".join(missing))
        rows = list(reader)

    try:
        result = analyze(rows)
    except ValueError as exc:
        print("SCORECARD_FAIL")
        for line in str(exc).splitlines():
            print("-", line)
        raise SystemExit(1)

    Path(args.json).write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    Path(args.md).write_text(render_markdown(result), encoding="utf-8")
    print("SCORECARD_GO")
    print(
        json.dumps(
            {
                "status": result["status"],
                "n": result["completed_n"],
                "open_rate": result["primary"]["object_open_rate_pct"],
                "return_yes": result["secondary"]["return_yes_pct"],
                "reveal_yes": result["reveal_payoff_diagnostics"]["yes_pct"],
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
