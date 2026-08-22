#!/usr/bin/env python3
import argparse
import base64
import json
import mimetypes
import os
import urllib.request
from pathlib import Path

from runtime_evidence import authorized_image_paths
from validate_request import load_and_validate_request

BUNDLE_ROOT = Path(__file__).resolve().parents[1]


def response_text(response):
    texts = []
    for item in response.get("output", []):
        if item.get("type") == "message":
            for content in item.get("content", []):
                if content.get("type") == "output_text":
                    texts.append(content.get("text", ""))
    return "\n".join(texts).strip()


def write_review(review, output_path, github_output):
    Path(output_path).write_text(
        json.dumps(review, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    with Path(github_output).open("a", encoding="utf-8") as output:
        output.write(f"disposition={review['disposition']}\n")


def deterministic_review(disposition, summary, issue, protected=False):
    return {
        "disposition": disposition,
        "summary": summary,
        "issues": [issue],
        "fix_prompt": "",
        "evidence_required": [],
        "protected_scope_violation": protected,
        "runtime_visual_evidence_present": False,
        "source_authority_uncertain": False,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--iteration", type=int, required=True)
    parser.add_argument("--codex-report", required=True)
    parser.add_argument("--scope-guard", required=True)
    parser.add_argument("--source-diff", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--github-output", required=True)
    args = parser.parse_args()

    request, _ = load_and_validate_request(
        BUNDLE_ROOT / "REQUEST.json", require_task_file=False
    )
    guard = json.loads(Path(args.scope_guard).read_text(encoding="utf-8"))
    rules = (BUNDLE_ROOT / "HQ_RULES.md").read_text(encoding="utf-8")
    schema = json.loads(
        (BUNDLE_ROOT / "schemas/hq-review.schema.json").read_text(encoding="utf-8")
    )

    if guard["violations"]:
        review = deterministic_review(
            "NO_GO",
            "Deterministic scope guard found a protected or baseline violation.",
            {
                "severity": "blocker",
                "title": "Deterministic guard violation",
                "detail": json.dumps(guard["violations"], ensure_ascii=False),
            },
            protected=True,
        )
        write_review(review, args.output, args.github_output)
        return

    image_paths = authorized_image_paths(changed_paths=guard.get("changed", []))
    if request.get("requires_runtime_visual") and not image_paths:
        review = deterministic_review(
            "HOLD",
            "Runtime visual evidence is required, but no explicitly authorized screenshot exists.",
            {
                "severity": "blocker",
                "title": "Authorized runtime visual evidence missing",
                "detail": "Only image files listed literally in frozen REQUEST.allowed_paths may satisfy this gate.",
            },
        )
        review["evidence_required"].append(
            "Create the exact runtime image path authorized by frozen REQUEST.allowed_paths."
        )
        write_review(review, args.output, args.github_output)
        return

    report_path = Path(args.codex_report)
    report = report_path.read_text(encoding="utf-8") if report_path.exists() else "(missing)"
    source_diff = Path(args.source_diff).read_text(
        encoding="utf-8", errors="replace"
    )

    prompt = f"""Independent HQ review iteration {args.iteration}.

REQUEST (frozen authority):
{json.dumps(request, ensure_ascii=False, indent=2)}

HQ RULES (frozen authority):
{rules}

SCOPE GUARD:
{json.dumps(guard, ensure_ascii=False, indent=2)}

CODEX REPORT:
{report}

SOURCE DIFF (tracked and untracked):
{source_diff[:220000]}

Review the implementation. Do not edit it.
"""

    content = [{"type": "input_text", "text": prompt}]
    for path in image_paths:
        mime = mimetypes.guess_type(path.name)[0] or "image/png"
        encoded = base64.b64encode(path.read_bytes()).decode("ascii")
        content.append(
            {
                "type": "input_image",
                "image_url": f"data:{mime};base64,{encoded}",
                "detail": "high",
            }
        )

    model = os.environ.get("HQ_REVIEW_MODEL", "gpt-5.6-sol") or "gpt-5.6-sol"
    effort = os.environ.get("HQ_REVIEW_EFFORT", "max") or "max"
    payload = {
        "model": model,
        "reasoning": {"effort": effort},
        "instructions": "Return only the structured HQ review. Be strict about visual evidence and protected scope.",
        "input": [{"role": "user", "content": content}],
        "store": False,
        "text": {
            "verbosity": "medium",
            "format": {
                "type": "json_schema",
                "name": "hq_review",
                "strict": True,
                "schema": schema,
            },
        },
    }
    api_request = urllib.request.Request(
        "https://api.openai.com/v1/responses",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": "Bearer " + os.environ["OPENAI_API_KEY"],
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(api_request, timeout=900) as response:
        api_response = json.loads(response.read().decode("utf-8"))

    review = json.loads(response_text(api_response))
    review["runtime_visual_evidence_present"] = bool(image_paths)
    write_review(review, args.output, args.github_output)


if __name__ == "__main__":
    main()
