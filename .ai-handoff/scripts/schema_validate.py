#!/usr/bin/env python3
"""Small dependency-free validator for the local HQ review JSON schema."""

import argparse
import json
from pathlib import Path


def _matches_type(value, expected):
    if expected == "object":
        return isinstance(value, dict)
    if expected == "array":
        return isinstance(value, list)
    if expected == "string":
        return isinstance(value, str)
    if expected == "boolean":
        return isinstance(value, bool)
    if expected == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if expected == "number":
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    if expected == "null":
        return value is None
    raise ValueError(f"unsupported schema type: {expected}")


def validate(instance, schema, path="$"):
    expected_type = schema.get("type")
    if expected_type is not None and not _matches_type(instance, expected_type):
        raise ValueError(f"{path}: expected {expected_type}")
    if "enum" in schema and instance not in schema["enum"]:
        raise ValueError(f"{path}: value is not in enum")
    if isinstance(instance, dict):
        properties = schema.get("properties", {})
        for key in schema.get("required", []):
            if key not in instance:
                raise ValueError(f"{path}: missing required property {key}")
        if schema.get("additionalProperties") is False:
            extra = sorted(set(instance) - set(properties))
            if extra:
                raise ValueError(f"{path}: additional properties forbidden: {extra}")
        for key, value in instance.items():
            if key in properties:
                validate(value, properties[key], f"{path}.{key}")
    if isinstance(instance, list) and "items" in schema:
        for index, value in enumerate(instance):
            validate(value, schema["items"], f"{path}[{index}]")
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--schema", required=True)
    parser.add_argument("--instance", required=True)
    args = parser.parse_args()
    schema = json.loads(Path(args.schema).read_text(encoding="utf-8"))
    instance = json.loads(Path(args.instance).read_text(encoding="utf-8"))
    validate(instance, schema)
    print(json.dumps({"ok": True}, indent=2))


if __name__ == "__main__":
    main()
